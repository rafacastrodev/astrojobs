from datetime import UTC, datetime

import pytest

from domain.analysis.entities import AnalysisEntity, ats_category_for_score
from domain.analysis.errors import AnalyzerError
from domain.documents.entities import DocumentEntity
from domain.documents.errors import DuplicateDocumentError, UnsafeContentError
from domain.documents.safety import PiiRedactionResult
from domain.documents.use_cases.upload_resume import UploadResumeUseCase


class _Documents:
    def __init__(self):
        self.document = None
        self.existing_by_hash = None
        self.existing_resumes = []
        self.last_content_hash = None

    def create(
        self,
        doc_type,
        payload,
        filename,
        user_id=None,
        storage_key=None,
        content_hash=None,
    ):
        now = datetime.now(UTC)
        self.last_content_hash = content_hash
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
            content_hash=content_hash,
        )
        return self.document

    def get_by_user_content_hash(self, _user_id, _doc_type, _content_hash):
        return self.existing_by_hash

    def list_by_user(self, _user_id, _doc_type=None):
        return self.existing_resumes

    def get_by_id(self, _document_id):
        return self.document

    def mark_published(self, _document_id):
        self.document.status = "synced"
        self.document.error_message = None
        return self.document

    def mark_failed(self, _document_id, message):
        self.document.status = "failed"
        self.document.error_message = message
        return self.document

    def mark_analysis_completed(self, _document_id):
        self.document.analysis_status = "completed"
        self.document.analysis_error_message = None
        return self.document

    def mark_analysis_failed(self, _document_id, message):
        self.document.analysis_status = "failed"
        self.document.analysis_error_message = message
        return self.document

    def delete(self, _document_id):
        self.document = None
        return True


class _Analyses:
    def create(self, **values):
        return AnalysisEntity(
            id=1,
            created_at=datetime.now(UTC),
            ats_category=ats_category_for_score(values["score"]),
            **values,
        )


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
    def analyze(self, resume, _job, retrieved_context=None):
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
    assert analysis.ats_category == "high"
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


def test_analysis_failure_preserves_upload_for_retry() -> None:
    class _FailingAnalyzer:
        def analyze(self, *_args, **_kwargs):
            raise AnalyzerError("Resume analysis is temporarily unavailable")

    use_case, documents, storage, _extractor = _use_case()
    use_case._analyzer = _FailingAnalyzer()

    document, analysis = use_case.execute(b"resume", "resume.txt", user_id=7)

    assert analysis is None
    assert storage.uploaded is True
    assert documents.document is document
    assert document.analysis_status == "failed"
    assert (
        document.analysis_error_message == "Resume analysis is temporarily unavailable"
    )


def test_duplicate_resume_is_rejected_before_storage() -> None:
    use_case, documents, storage, _extractor = _use_case()
    documents.existing_by_hash = DocumentEntity(
        id=9,
        type="resume",
        payload={},
        source_filename="other.txt",
        status="synced",
        pinecone_id=None,
        error_message=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
        user_id=7,
        content_hash="abc",
    )

    with pytest.raises(DuplicateDocumentError, match="already uploaded"):
        use_case.execute(b"resume", "resume.txt", user_id=7)

    assert storage.uploaded is False
    assert documents.document is None


def test_duplicate_resume_is_rejected_by_filename() -> None:
    use_case, documents, storage, _extractor = _use_case()
    documents.existing_resumes = [
        DocumentEntity(
            id=3,
            type="resume",
            payload={},
            source_filename="Resume.TXT",
            status="synced",
            pinecone_id=None,
            error_message=None,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            user_id=7,
        )
    ]

    with pytest.raises(DuplicateDocumentError, match="already uploaded"):
        use_case.execute(b"resume", "resume.txt", user_id=7)

    assert storage.uploaded is False
    assert documents.document is None


def test_upload_persists_file_metadata() -> None:
    use_case, documents, _storage, _extractor = _use_case()
    document, _analysis = use_case.execute(b"resume", "resume.txt", user_id=7)
    assert document.payload["file"] == {"name": "resume.txt", "size": 6}
    assert documents.last_content_hash == (
        "a83a31320d921b888a48fa5edd0b4b5a29984de6e96bf7b8ac7d29ba06caf616"
    )
