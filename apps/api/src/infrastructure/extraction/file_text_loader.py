from io import BytesIO
from pathlib import Path

from docx import Document
from pypdf import PdfReader

from domain.documents.errors import UnsupportedFileError


class CompositeFileTextLoader:
    SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}

    def load(self, content: bytes, filename: str) -> str:
        extension = Path(filename).suffix.lower()
        if extension not in self.SUPPORTED_EXTENSIONS:
            raise UnsupportedFileError(
                f"Unsupported file type '{extension}'. Use PDF, DOCX, TXT, or MD."
            )
        if extension == ".pdf":
            return self._load_pdf(content)
        if extension == ".docx":
            return self._load_docx(content)
        return content.decode("utf-8", errors="replace")

    def _load_pdf(self, content: bytes) -> str:
        reader = PdfReader(BytesIO(content))
        pages = [page.extract_text() or "" for page in reader.pages]
        text = "\n".join(pages).strip()
        if not text:
            raise UnsupportedFileError("Could not extract text from PDF")
        return text

    def _load_docx(self, content: bytes) -> str:
        document = Document(BytesIO(content))
        text = "\n".join(paragraph.text for paragraph in document.paragraphs).strip()
        if not text:
            raise UnsupportedFileError("Could not extract text from DOCX")
        return text
