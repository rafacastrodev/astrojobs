from datetime import UTC, datetime

import pytest

from domain.analysis.entities import AnalysisEntity
from domain.documents.entities import DocumentEntity
from domain.documents.errors import UnsafeContentError
from domain.documents.safety import PiiRedactionResult
from domain.documents.use_cases.upload_resume import UploadResumeUseCase


class _Documents:
    def __init__(self):
        self.document = None

    def create(self, doc_type, payload, filename, user_id=None, storage_key=None):
        now = datetime.now(UTC)
        self.document = DocumentEntity(
            id=1,
            type=doc_type,
            payload=payload,
            source_filename=filename,
            status="draft",
            pinecone_id=None,
            error_message=None,
            created_at=now,
            updated_at=now,
            user_id=user_id,
            storage_key=storage_key,
        )
        return self.document

    def get_by_id(self, _document_id):
        return self.document

    def mark_failed(self, _document_id, message):
        self.document.status = "failed"
        self.document.error_message = message
        return self.document

    def delete(self, _document_id):
        self.document = None
        return True


class _Analyses:
    def create(self, **values):
        return AnalysisEntity(id=1, created_at=datetime.now(UTC), **values)


class _Storage:
    def __init__(self):
        self.uploaded = False

    def upload(self, *_args):
        self.uploaded = True

    def delete(self, _key):
        self.uploaded = False


class _Extractor:
    def __init__(self):
        self.text = None

    def extract(self, text, _doc_type):
        self.text = text
        return {"summary": "Engineer", "skills": ["Python"], "experiences": []}


class _Analyzer:
    def analyze(self, resume, _job):
        assert resume["summary"] == "Engineer"
        return {
            "score": 80,
            "summary": "Good",
            "findings": ["Add metrics"],
            "years_of_experience": 3,
            "technologies": ["Python"],
            "companies": [],
        }


class _Sync:
    def execute(self, _ids):
        return {"synced": 1, "failed": 0, "skipped": 0, "results": []}


class _Loader:
    def load(self, _content, _filename):
        return "private@example.com\nEngineer with Python"


class _Validator:
    def validate(self, _content, _filename):
        return None


class _Redactor:
    def redact(self, _text):
        return PiiRedactionResult(
            redacted_text="[EMAILS_REDACTED]\nEngineer with Python",
            contact={"emails": ["private@example.com"]},
        )


class _Safety:
    def __init__(self, unsafe=False):
        self.unsafe = unsafe

    def check(self, _text):
        if self.unsafe:
            raise UnsafeContentError("unsafe")


def _use_case(safety=None):
    documents = _Documents()
    storage = _Storage()
    extractor = _Extractor()
    use_case = UploadResumeUseCase(
        documents,
        _Loader(),
        extractor,
        storage,
        max_file_bytes=1024,
        file_validator=_Validator(),
        pii_redactor=_Redactor(),
        content_safety=safety or _Safety(),
        analyzer=_Analyzer(),
        analysis_repository=_Analyses(),
        sync_documents_use_case=_Sync(),
    )
    return use_case, documents, storage, extractor


def test_import_keeps_full_text_locally_and_redacts_ai_input() -> None:
    use_case, documents, storage, extractor = _use_case()
    document, analysis = use_case.execute(b"resume", "resume.txt", user_id=7)
    assert storage.uploaded is True
    assert analysis.score == 80
    assert extractor.text.startswith("[EMAILS_REDACTED]")
    assert document.payload["full_text"].startswith("private@example.com")
    assert document.payload["contact"]["emails"] == ["private@example.com"]
    assert documents.document is document


def test_unsafe_content_is_rejected_before_storage() -> None:
    use_case, documents, storage, _extractor = _use_case(_Safety(unsafe=True))
    with pytest.raises(UnsafeContentError):
        use_case.execute(b"resume", "resume.txt", user_id=7)
    assert storage.uploaded is False
    assert documents.document is None
