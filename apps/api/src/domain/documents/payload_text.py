from typing import Any

from domain.documents.entities import DocumentType

SKIPPED_PAYLOAD_KEYS = frozenset({"structure"})
RESUME_EMBEDDING_KEYS = (
    "summary",
    "skills",
    "tech_stack",
    "experiences",
    "education",
    "projects",
    "certifications",
    "languages",
    "additional_sections",
    "job_title",
    "company",
    "region",
    "salary_min_usd",
    "salary_max_usd",
    # Legacy payload key.
    "about",
)
JOB_EMBEDDING_KEYS = (
    "title",
    "technologies",
    "description",
    "seniority",
    "work_mode",
    "region",
    "employment_type",
    "requirements",
    "responsibilities",
    "salary_min_usd",
    "salary_max_usd",
)


def payload_to_text(payload: dict[str, Any]) -> str:
    parts: list[str] = []
    for key, value in payload.items():
        if key in SKIPPED_PAYLOAD_KEYS:
            continue
        text = _value_to_text(value)
        if text:
            parts.append(f"{key.replace('_', ' ')}: {text}")
    return "\n".join(parts)


def payload_to_embedding_text(
    payload: dict[str, Any], document_type: DocumentType
) -> str:
    keys = RESUME_EMBEDDING_KEYS if document_type == "resume" else JOB_EMBEDDING_KEYS
    minimized = {key: payload.get(key) for key in keys if payload.get(key)}
    return payload_to_text(minimized)


def _value_to_text(value: Any) -> str:
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (list, tuple)):
        return "; ".join(filter(None, (_value_to_text(item) for item in value)))
    if isinstance(value, dict):
        return "; ".join(
            filter(None, (_value_to_text(item) for item in value.values()))
        )
    if value is None:
        return ""
    return str(value)
