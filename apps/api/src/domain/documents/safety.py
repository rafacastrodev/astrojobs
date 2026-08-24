from dataclasses import dataclass
from typing import Any, Protocol


class FileSafetyValidator(Protocol):
    def validate(self, content: bytes, filename: str) -> None: ...


@dataclass(frozen=True)
class PiiRedactionResult:
    redacted_text: str
    contact: dict[str, Any]


class PiiRedactor(Protocol):
    def redact(self, text: str) -> PiiRedactionResult: ...


class ContentSafetyChecker(Protocol):
    def check(self, text: str) -> None: ...
