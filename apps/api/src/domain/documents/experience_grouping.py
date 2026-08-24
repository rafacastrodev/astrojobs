import re
from typing import Any

from domain.documents.technology_catalog import flatten_tech_stack, normalize_tech_stack

_DATE_RANGE = re.compile(
    r"(?i)(?:\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\b\d{4}\b)"
    r"\s*(?:-|–|—|to)\s*"
    r"(?:present|current|now|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\b\d{4}\b)"
)
_BULLET_PREFIX = re.compile(r"^\s*([•●○\-\*]|\d+[.)])\s+")
_TECH_STACK_PREFIX = re.compile(r"(?i)^\s*tech\s*stack\b")


def looks_like_job_header_text(value: str) -> bool:
    stripped = value.strip()
    if (
        not stripped
        or _BULLET_PREFIX.match(stripped)
        or _TECH_STACK_PREFIX.match(stripped)
    ):
        return False
    return _DATE_RANGE.search(stripped) is not None


def group_experiences(items: list[Any]) -> list[dict[str, Any]]:
    grouped: list[dict[str, Any]] = []
    for raw in items:
        item = _as_experience(raw)
        if item is None:
            continue
        if _is_job_header(item) or not grouped:
            grouped.append(item)
            continue
        _merge_fragment(grouped[-1], item)
    return grouped


def grouped_resume_payload(payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return payload
    result = dict(payload)
    experiences = result.get("experiences")
    if isinstance(experiences, list):
        result["experiences"] = group_experiences(experiences)
    stack = normalize_tech_stack(result.get("tech_stack"), result.get("skills"))
    result["tech_stack"] = stack
    result["skills"] = flatten_tech_stack(stack)
    return result


def split_experience_blocks(block: str) -> list[str]:
    if not block.strip():
        return []
    lines = block.splitlines()
    header_indices = [
        index for index, line in enumerate(lines) if looks_like_job_header_text(line)
    ]
    if not header_indices:
        return [block.strip()]
    chunks: list[str] = []
    for index, start in enumerate(header_indices):
        end = (
            header_indices[index + 1] if index + 1 < len(header_indices) else len(lines)
        )
        chunk = "\n".join(lines[start:end]).strip()
        if chunk:
            chunks.append(chunk)
    return chunks


def _as_experience(raw: Any) -> dict[str, Any] | None:
    if isinstance(raw, str):
        text = raw.strip()
        return _empty_experience(job_title=text) if text else None
    if not isinstance(raw, dict):
        return None
    highlights = [
        str(item).strip() for item in raw.get("highlights") or [] if str(item).strip()
    ]
    item = {
        "job_title": str(raw.get("job_title") or "").strip(),
        "company": str(raw.get("company") or "").strip(),
        "location": str(raw.get("location") or "").strip(),
        "start_date": str(raw.get("start_date") or "").strip(),
        "end_date": str(raw.get("end_date") or "").strip(),
        "current": bool(raw.get("current")),
        "description": str(raw.get("description") or "").strip(),
        "highlights": highlights,
    }
    if not (
        item["job_title"]
        or item["company"]
        or item["description"]
        or item["highlights"]
    ):
        return None
    return item


def _empty_experience(**overrides: Any) -> dict[str, Any]:
    item = {
        "job_title": "",
        "company": "",
        "location": "",
        "start_date": "",
        "end_date": "",
        "current": False,
        "description": "",
        "highlights": [],
    }
    item.update(overrides)
    return item


def _is_job_header(item: dict[str, Any]) -> bool:
    title = item["job_title"]
    if _BULLET_PREFIX.match(title) or _TECH_STACK_PREFIX.match(title):
        return False
    heading = " ".join(
        part
        for part in (
            title,
            item["company"],
            item["location"],
            item["start_date"],
            item["end_date"],
        )
        if part
    )
    if looks_like_job_header_text(title) or looks_like_job_header_text(heading):
        return True
    if item["start_date"] and title:
        return True
    return bool(title and item["company"])


def _merge_fragment(job: dict[str, Any], fragment: dict[str, Any]) -> None:
    for text in _fragment_texts(fragment):
        if _already_in_job(job, text):
            continue
        if (
            _BULLET_PREFIX.match(text)
            or _TECH_STACK_PREFIX.match(text)
            or not text.endswith(".")
        ):
            job["highlights"].append(_strip_bullet(text))
        elif job["description"]:
            job["description"] = f"{job['description']}\n{text}"
        else:
            job["description"] = text


def _fragment_texts(item: dict[str, Any]) -> list[str]:
    texts: list[str] = []
    heading = " · ".join(part for part in (item["job_title"], item["company"]) if part)
    if heading:
        texts.append(heading)
    if item["description"] and item["description"] not in texts:
        texts.append(item["description"])
    for highlight in item["highlights"]:
        if highlight not in texts:
            texts.append(highlight)
    return texts


def _already_in_job(job: dict[str, Any], text: str) -> bool:
    needle = _strip_bullet(text).casefold()
    haystacks = [job["job_title"], job["description"], *job["highlights"]]
    return any(
        needle and needle in _strip_bullet(value).casefold() for value in haystacks
    )


def _strip_bullet(value: str) -> str:
    return _BULLET_PREFIX.sub("", value).strip()
