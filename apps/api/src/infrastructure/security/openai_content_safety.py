import logging
import re
from typing import ClassVar

from openai import OpenAI

from domain.documents.errors import UnsafeContentError
from infrastructure.database.config import settings

logger = logging.getLogger(__name__)


class OpenAIContentSafetyChecker:
    CHUNK_CHARS = 20_000
    _INJECTION_PATTERNS: ClassVar[tuple[re.Pattern[str], ...]] = (
        re.compile(r"\bignore (?:all |any )?(?:previous|prior|above) instructions?\b", re.IGNORECASE),
        re.compile(r"\b(?:system|developer|assistant)\s*prompt\s*:", re.IGNORECASE),
        re.compile(r"<\/?(?:system|developer|assistant)>", re.IGNORECASE),
        re.compile(r"\b(?:award|give|assign) (?:me |this resume )?(?:a )?(?:score|rating)\b", re.IGNORECASE),
        re.compile(r"\bdo not (?:analy[sz]e|review|score) (?:this|the) (?:resume|document)\b", re.IGNORECASE),
    )

    def __init__(self) -> None:
        if settings.llm_is_openai and settings.llm_api_key:
            self._client = self._build_client()
        else:
            self._client = None

    def check(self, text: str) -> None:
        if any(pattern.search(text) for pattern in self._INJECTION_PATTERNS):
            raise UnsafeContentError(
                "Resume contains instructions that cannot be processed safely"
            )
        if self._client is None:
            return

        chunks = [
            text[start : start + self.CHUNK_CHARS]
            for start in range(0, len(text), self.CHUNK_CHARS)
        ] or [""]
        for chunk in chunks:
            try:
                response = self._client.moderations.create(
                    model=settings.openai_moderation_model,
                    input=chunk,
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "OpenAI moderation is not available; using local checks only (%s)",
                    exc,
                )
                return
            if any(result.flagged for result in response.results):
                raise UnsafeContentError(
                    "Resume content did not pass the safety check"
                )

    @staticmethod
    def _build_client() -> OpenAI:
        return OpenAI(
            api_key=settings.llm_api_key,
            timeout=settings.openai_timeout_seconds,
            max_retries=settings.openai_max_retries,
        )
