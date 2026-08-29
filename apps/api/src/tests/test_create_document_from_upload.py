from datetime import UTC, datetime

from domain.documents.entities import DocumentEntity
from domain.documents.use_cases.create_document_from_upload import (
    CreateDocumentFromUploadUseCase,
)


class FakeDocuments:
    def __init__(self) -> None:
        self.document: DocumentEntity | None = None
        self.failed_message: str | None = None

    def create(self, doc_type, payload, filename, user_id=None, storage_key=None):
        now = datetime.now(UTC)
        self.document = DocumentEntity(
            id=7,
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
        assert self.document is not None
        self.document.status = "failed"
        self.document.error_message = message
        self.failed_message = message
        return self.document

    def mark_published(self, _document_id):
        assert self.document is not None
        self.document.status = "synced"
        self.document.error_message = None
        return self.document


class FakeLoader:
    def load(self, _content, _filename):
        return "resume text"


class FakeExtractor:
    def extract(self, _text, _doc_type):
        return {"skills": ["python"]}


class FakeSync:
    def __init__(self) -> None:
        self.ids: list[int] | None = None
        self.fail = False

    def execute(self, ids):
        if self.fail:
            raise RuntimeError("pinecone down")
        self.ids = ids


def test_admin_upload_indexes_the_document_immediately() -> None:
    documents = FakeDocuments()
    sync = FakeSync()
    use_case = CreateDocumentFromUploadUseCase(
        documents, FakeLoader(), FakeExtractor(), sync
    )

    document = use_case.execute(b"file", "cv.txt", "resume")

    assert sync.ids == [7]
    assert document.id == 7


def test_admin_upload_still_publishes_when_optional_indexing_breaks() -> None:
    documents = FakeDocuments()
    sync = FakeSync()
    sync.fail = True
    use_case = CreateDocumentFromUploadUseCase(
        documents, FakeLoader(), FakeExtractor(), sync
    )

    document = use_case.execute(b"file", "cv.txt", "resume")

    assert document.status == "synced"
    assert documents.failed_message is None
