import re
import zipfile
from io import BytesIO
from pathlib import Path
from typing import ClassVar

from domain.documents.errors import UnsafeContentError, UnsupportedFileError


class ResumeFileSafetyValidator:
    SUPPORTED_EXTENSIONS: ClassVar[set[str]] = {".pdf", ".docx", ".txt", ".md"}
    MAX_ARCHIVE_ENTRIES = 2_000
    MAX_UNCOMPRESSED_BYTES = 25 * 1024 * 1024
    MAX_COMPRESSION_RATIO = 150
    _PDF_ACTIVE_MARKERS = (
        b"/JavaScript",
        b"/JS ",
        b"/EmbeddedFile",
        b"/Launch",
        b"/OpenAction",
    )

    def validate(self, content: bytes, filename: str) -> None:
        extension = Path(filename).suffix.lower()
        if extension not in self.SUPPORTED_EXTENSIONS:
            raise UnsupportedFileError(
                f"Unsupported file type '{extension}'. Use PDF, DOCX, TXT, or MD."
            )
        if extension == ".pdf":
            self._validate_pdf(content)
        elif extension == ".docx":
            self._validate_docx(content)
        else:
            self._validate_text(content)

    def _validate_pdf(self, content: bytes) -> None:
        if not content.startswith(b"%PDF-"):
            raise UnsupportedFileError("The file extension does not match a PDF document")
        if any(marker in content for marker in self._PDF_ACTIVE_MARKERS):
            raise UnsafeContentError("PDF contains active or embedded content")

    def _validate_docx(self, content: bytes) -> None:
        if not content.startswith(b"PK"):
            raise UnsupportedFileError("The file extension does not match a DOCX document")
        try:
            with zipfile.ZipFile(BytesIO(content)) as archive:
                infos = archive.infolist()
                names = {info.filename for info in infos}
                if "[Content_Types].xml" not in names or "word/document.xml" not in names:
                    raise UnsupportedFileError("The DOCX container is missing required parts")
                if len(infos) > self.MAX_ARCHIVE_ENTRIES:
                    raise UnsafeContentError("DOCX contains too many archive entries")
                total_uncompressed = sum(info.file_size for info in infos)
                if total_uncompressed > self.MAX_UNCOMPRESSED_BYTES:
                    raise UnsafeContentError("DOCX expands beyond the safe size limit")
                for info in infos:
                    compressed = max(info.compress_size, 1)
                    if info.file_size / compressed > self.MAX_COMPRESSION_RATIO:
                        raise UnsafeContentError("DOCX contains a suspicious compressed entry")
                    lowered = info.filename.lower()
                    if lowered.endswith("vbaproject.bin") or "/embeddings/" in lowered:
                        raise UnsafeContentError("DOCX contains executable or embedded content")
        except zipfile.BadZipFile as exc:
            raise UnsupportedFileError("Could not read the DOCX container") from exc

    def _validate_text(self, content: bytes) -> None:
        if b"\x00" in content:
            raise UnsafeContentError("Text document contains binary data")
        sample = content[:50_000].decode("utf-8", errors="replace")
        if not sample:
            return
        control_count = len(re.findall(r"[\x01-\x08\x0b\x0c\x0e-\x1f]", sample))
        if control_count / len(sample) > 0.01:
            raise UnsafeContentError("Text document contains too many control characters")
