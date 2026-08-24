_TIMEOUT_TYPES = {
    "APITimeoutError",
    "APIConnectionError",
    "TimeoutException",
    "ReadTimeout",
    "ConnectTimeout",
    "ConnectError",
    "PoolTimeout",
}

_UNAVAILABLE_CODES = {
    "insufficient_quota",
    "credit_balance_too_low",
    "model_not_found",
    "resource_exhausted",
    "unavailable",
    "deadline_exceeded",
}


def openai_status_and_code(exc: BaseException) -> tuple[int | None, str | None]:
    status = getattr(exc, "status_code", None)
    body = getattr(exc, "body", None)
    response = getattr(exc, "response", None)
    if status is None and response is not None:
        status = getattr(response, "status_code", None)
    if body is None and response is not None:
        try:
            body = response.json()
        except (ValueError, TypeError, AttributeError):
            body = None
    code = None
    if isinstance(body, dict):
        error = body.get("error", body)
        if isinstance(error, dict):
            raw_code = error.get("code") or error.get("type") or error.get("status")
            if isinstance(raw_code, int):
                status = status or raw_code
                code = error.get("status") or error.get("type")
            else:
                code = raw_code
    return status, str(code) if code is not None else None


def is_openai_quota_error(exc: BaseException) -> bool:
    status, code = openai_status_and_code(exc)
    return status == 429 or code in {"insufficient_quota", "credit_balance_too_low"}


def is_openai_forbidden(exc: BaseException) -> bool:
    status, code = openai_status_and_code(exc)
    return status == 403 or code == "model_not_found"


def caused_by_openai_unavailability(exc: BaseException) -> bool:
    seen: set[int] = set()
    current: BaseException | None = exc
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        if is_openai_quota_error(current) or is_openai_forbidden(current):
            return True
        current = current.__cause__ or current.__context__
    return False


def caused_by_llm_unavailability(exc: BaseException) -> bool:
    if caused_by_openai_unavailability(exc):
        return True
    seen: set[int] = set()
    current: BaseException | None = exc
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        if isinstance(current, TimeoutError) or type(current).__name__ in _TIMEOUT_TYPES:
            return True
        status, code = openai_status_and_code(current)
        normalized = (code or "").lower()
        if status in {401, 403, 429, 503, 504} or normalized in _UNAVAILABLE_CODES:
            return True
        current = current.__cause__ or current.__context__
    return False
