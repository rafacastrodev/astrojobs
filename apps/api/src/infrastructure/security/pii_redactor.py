import re
from typing import ClassVar

from domain.documents.safety import PiiRedactionResult

_YEAR_RANGE = re.compile(r"^(?:19|20)\d{2}\s*[-–—]\s*(?:19|20)\d{2}$")


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
            values: list[str] = []
            spans: list[tuple[int, int]] = []
            for match in pattern.finditer(redacted):
                value = match.group(0)
                if label == "phones" and not self._is_phone(value):
                    continue
                values.append(value)
                spans.append(match.span())
            if values and label in {"emails", "phones", "links"}:
                contact[label] = list(dict.fromkeys(values))
            token = f"[{label.upper()}_REDACTED]"
            for start, end in reversed(spans):
                redacted = redacted[:start] + token + redacted[end:]
        return PiiRedactionResult(redacted_text=redacted, contact=contact)

    @staticmethod
    def _is_phone(value: str) -> bool:
        stripped = value.strip()
        if _YEAR_RANGE.fullmatch(stripped):
            return False
        digits = re.sub(r"\D", "", stripped)
        return len(digits) >= 10
