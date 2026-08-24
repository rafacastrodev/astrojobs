from datetime import UTC, datetime

from domain.documents.entities import DocumentEntity
from domain.documents.use_cases.create_job import CreateJobUseCase


class FakeDocuments:
    def __init__(self) -> None:
        self.document: DocumentEntity | None = None
        self.published = False

    def create(self, doc_type, payload, filename, user_id=None, storage_key=None):
        now = datetime.now(UTC)
        self.document = DocumentEntity(
            id=8,
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

    def mark_synced(self, _document_id, pinecone_id):
        assert self.document is not None
        self.document.status = "synced"
        self.document.pinecone_id = pinecone_id
        self.document.error_message = None
        return self.document

    def mark_published(self, _document_id):
        assert self.document is not None
        self.document.status = "synced"
        self.document.error_message = None
        self.published = True
        return self.document

    def mark_failed(self, _document_id, message):
        assert self.document is not None
        self.document.status = "failed"
        self.document.error_message = message
        return self.document


class FakeSync:
    def __init__(self, documents: FakeDocuments) -> None:
        self._documents = documents
        self.ids: list[int] | None = None
        self.raise_error = False
        self.fail_internally = False

    def execute(self, ids):
        self.ids = ids
        if self.raise_error:
            raise RuntimeError("pinecone down")
        if self.fail_internally:
            self._documents.mark_failed(ids[0], "Could not index document")
            return {"synced": 0, "failed": 1, "skipped": 0, "results": []}
        self._documents.mark_synced(ids[0], f"job-{ids[0]}")
        return {"synced": 1, "failed": 0, "skipped": 0, "results": []}


def test_create_job_indexes_when_sync_succeeds() -> None:
    documents = FakeDocuments()
    sync = FakeSync(documents)
    document = CreateJobUseCase(documents, sync).execute(
        {"title": "Full-Stack Senior", "technologies": ["Python"]},
        user_id=3,
    )

    assert sync.ids == [8]
    assert document.status == "synced"
    assert document.pinecone_id == "job-8"
    assert documents.published is False


def test_create_job_stays_published_when_indexing_raises() -> None:
    documents = FakeDocuments()
    sync = FakeSync(documents)
    sync.raise_error = True
    document = CreateJobUseCase(documents, sync).execute(
        {"title": "Full-Stack Senior", "technologies": ["Python"]},
        user_id=3,
    )

    assert document.status == "synced"
    assert document.error_message is None
    assert documents.published is True


def test_create_job_stays_published_when_indexing_marks_failed() -> None:
    documents = FakeDocuments()
    sync = FakeSync(documents)
    sync.fail_internally = True
    document = CreateJobUseCase(documents, sync).execute(
        {"title": "Full-Stack Senior", "technologies": ["Python"]},
        user_id=3,
    )

    assert document.status == "synced"
    assert document.error_message is None
    assert documents.published is True
