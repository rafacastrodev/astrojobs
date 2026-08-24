import logging
from io import BytesIO
from pathlib import Path
from typing import ClassVar

from docx import Document
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from domain.documents.errors import UnsupportedFileError
from infrastructure.database.config import settings

logger = logging.getLogger(__name__)


class CompositeFileTextLoader:
    SUPPORTED_EXTENSIONS: ClassVar[set[str]] = {".pdf", ".docx", ".txt", ".md"}

    def load(self, content: bytes, filename: str) -> str:
        extension = Path(filename).suffix.lower()
        if extension not in self.SUPPORTED_EXTENSIONS:
            raise UnsupportedFileError(
                f"Unsupported file type '{extension}'. Use PDF, DOCX, TXT, or MD."
            )
        if extension == ".pdf":
            text = self._load_pdf(content)
        elif extension == ".docx":
            text = self._load_docx(content)
        else:
            text = content.decode("utf-8", errors="replace")
        return self._guard_length(text)

    def _guard_length(self, text: str) -> str:
        if len(text) > settings.max_extracted_chars:
            raise UnsupportedFileError(
                f"Document text exceeds the {settings.max_extracted_chars} character limit"
            )
        return text

    def _load_pdf(self, content: bytes) -> str:
        try:
            reader = PdfReader(BytesIO(content))
        except (PdfReadError, ValueError, OSError) as exc:
            raise UnsupportedFileError(f"Could not read the PDF: {exc}") from exc

        if reader.is_encrypted:
            raise UnsupportedFileError("Encrypted PDFs are not supported")

        page_count = len(reader.pages)
        if page_count > settings.max_pdf_pages:
            raise UnsupportedFileError(
                f"PDF has {page_count} pages, above the {settings.max_pdf_pages} page limit"
            )

        text = self._extract_pages(reader, layout=True)
        if not text.strip():
            text = self._extract_pages(reader, layout=False)
        if not text.strip():
            raise UnsupportedFileError("Could not extract text from PDF")
        return text

    def _extract_pages(self, reader: PdfReader, layout: bool) -> str:
        kwargs = {"extraction_mode": "layout"} if layout else {}
        pages: list[str] = []
        for page in reader.pages:
            try:
                pages.append(page.extract_text(**kwargs) or "")
            except Exception as exc:  # noqa: BLE001
                if layout:
                    logger.info("Layout extraction failed, falling back: %s", exc)
                    return ""
                logger.warning("Skipping an unreadable PDF page: %s", exc)
                pages.append("")
        return "\n".join(pages).strip()

    def _load_docx(self, content: bytes) -> str:
        try:
            document = Document(BytesIO(content))
        except Exception as exc:
            raise UnsupportedFileError(f"Could not read the DOCX: {exc}") from exc
        text = "\n".join(paragraph.text for paragraph in document.paragraphs).strip()
        if not text:
            raise UnsupportedFileError("Could not extract text from DOCX")
        return text
