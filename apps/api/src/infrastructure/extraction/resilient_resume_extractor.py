import logging

from domain.documents.entities import DocumentType
from domain.documents.text_extractor import TextExtractor
from infrastructure.database.config import settings
from infrastructure.openai_errors import caused_by_llm_unavailability

logger = logging.getLogger(__name__)


class ResilientResumeExtractor:
    def __init__(self, primary: TextExtractor, fallback: TextExtractor):
        self._primary = primary
        self._fallback = fallback

    def extract(self, text: str, doc_type: DocumentType) -> dict:
        try:
            return self._primary.extract(text, doc_type)
        except Exception as exc:
            if not settings.is_development or not caused_by_llm_unavailability(exc):
                raise
            logger.warning("Primary extraction unavailable; using local extractor")
            return self._fallback.extract(text, doc_type)
