from collections import defaultdict, deque
from time import monotonic

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp

_WINDOW_SECONDS = 60
_GLOBAL_LIMIT = 120
_AUTH_LIMIT = 10
_UPLOAD_LIMIT = 8
_EXEMPT_PATHS = {"/health", "/healthz"}
_AUTH_PATHS = {
    "/auth/login",
    "/auth/signup",
    "/auth/forgot-password",
    "/auth/reset-password",
}
_UPLOAD_PATHS = {"/documents/resumes"}


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    if request.client is not None:
        return request.client.host
    return "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)
        self._hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)

    def _route_limit(self, method: str, path: str) -> int | None:
        if path in _EXEMPT_PATHS:
            return None
        if method == "POST" and path in _AUTH_PATHS:
            return _AUTH_LIMIT
        if method == "POST" and path in _UPLOAD_PATHS:
            return _UPLOAD_LIMIT
        return _GLOBAL_LIMIT

    def _over_limit(self, key: tuple[str, str], limit: int, now: float) -> bool:
        bucket = self._hits[key]
        cutoff = now - _WINDOW_SECONDS
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()
        if len(bucket) >= limit:
            return True
        bucket.append(now)
        return False

    async def dispatch(self, request: Request, call_next):
        limit = self._route_limit(request.method, request.url.path)
        if limit is None:
            return await call_next(request)

        ip = client_ip(request)
        now = monotonic()
        route_key = (ip, f"{request.method}:{request.url.path}")
        global_key = (ip, "*")
        if self._over_limit(global_key, _GLOBAL_LIMIT, now) or self._over_limit(
            route_key, limit, now
        ):
            return JSONResponse(
                {"detail": "Too many requests"},
                status_code=429,
                headers={"Retry-After": str(_WINDOW_SECONDS)},
            )
        return await call_next(request)
