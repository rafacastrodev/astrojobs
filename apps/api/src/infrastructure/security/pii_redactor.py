import re
from typing import ClassVar

from domain.documents.safety import PiiRedactionResult


class ResumePiiRedactor:
    _PATTERNS: ClassVar[tuple[tuple[str, re.Pattern[str]], ...]] = (
        (
            "emails",
            re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE),
        ),
        (
            "phones",
            re.compile(
                r"(?<!\w)(?:\+?\d{1,3}[ .-]?)?(?:\(?\d{2,3}\)?[ .-]?)?"
                r"\d{4,5}[ .-]?\d{4}(?!\w)"
            ),
        ),
        (
            "government_ids",
            re.compile(
                r"\b(?:\d{3}[.-]?){3}\d{2}\b|\b\d{2}[.]?\d{3}[.]?\d{3}[/]?\d{4}-?\d{2}\b"
            ),
        ),
        (
            "postal_codes",
            re.compile(r"\b\d{5}-?\d{3}\b"),
        ),
        (
            "links",
            re.compile(
                r"\b(?:https?://|www\.)[^\s<>()]+|(?:linkedin\.com/in/|github\.com/)[^\s<>()]+",
                re.IGNORECASE,
            ),
        ),
        (
            "addresses",
            re.compile(
                r"^(?:rua|r\.|avenida|av\.|travessa|alameda|rodovia)\s+.+$",
                re.IGNORECASE | re.MULTILINE,
            ),
        ),
    )

    def redact(self, text: str) -> PiiRedactionResult:
        redacted = text
        contact: dict[str, list[str]] = {}
        for label, pattern in self._PATTERNS:
            values = list(
                dict.fromkeys(match.group(0) for match in pattern.finditer(redacted))
            )
            if values and label in {"emails", "phones", "links"}:
                contact[label] = values
            redacted = pattern.sub(f"[{label.upper()}_REDACTED]", redacted)
        return PiiRedactionResult(redacted_text=redacted, contact=contact)
