import logging

from domain.documents.entities import DocumentType
from domain.documents.text_extractor import TextExtractor

logger = logging.getLogger(__name__)


class ResilientResumeExtractor:
    def __init__(self, primary: TextExtractor, fallback: TextExtractor):
        self._primary = primary
        self._fallback = fallback

    def extract(self, text: str, doc_type: DocumentType) -> dict:
        try:
            return self._primary.extract(text, doc_type)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Primary extraction unavailable; using local extractor (%s)", exc)
            return self._fallback.extract(text, doc_type)
