from datetime import UTC, datetime

from domain.documents.entities import DocumentEntity
from domain.documents.use_cases.sync_documents import SyncDocumentsUseCase


def _document(doc_id: int, doc_type: str) -> DocumentEntity:
    now = datetime.now(UTC)
    return DocumentEntity(
        id=doc_id,
        type=doc_type,  # type: ignore[arg-type]
        payload={"title": "Full-Stack Senior"},
        source_filename="job",
        status="draft",
        pinecone_id=None,
        error_message=None,
        created_at=now,
        updated_at=now,
    )


class FakeDocuments:
    def __init__(self, documents: list[DocumentEntity]) -> None:
        self.documents = {document.id: document for document in documents}
        self.failed: dict[int, str] = {}

    def list_by_ids(self, ids):
        return [self.documents[item] for item in ids if item in self.documents]

    def mark_synced(self, document_id, pinecone_id):
        document = self.documents[document_id]
        document.status = "synced"
        document.pinecone_id = pinecone_id
        document.error_message = None
        return document

    def mark_failed(self, document_id, message):
        document = self.documents[document_id]
        document.status = "failed"
        document.error_message = message
        self.failed[document_id] = message
        return document


class FakeEmbedder:
    def embed(self, _texts):
        raise RuntimeError("embedding unavailable")


class FakeClient:
    def upsert(self, *_args, **_kwargs):
        return None


def test_sync_skips_jobs_when_indexing_fails() -> None:
    documents = FakeDocuments([_document(8, "job")])
    use_case = SyncDocumentsUseCase(
        documents,
        FakeEmbedder(),
        FakeClient,
        "resumes",
        "jobs",
    )

    result = use_case.execute([8])

    assert result["failed"] == 0
    assert result["skipped"] == 1
    assert documents.documents[8].status == "draft"
    assert 8 not in documents.failed


def test_sync_marks_resumes_failed_when_indexing_fails() -> None:
    documents = FakeDocuments([_document(9, "resume")])
    use_case = SyncDocumentsUseCase(
        documents,
        FakeEmbedder(),
        FakeClient,
        "resumes",
        "jobs",
    )

    result = use_case.execute([9])

    assert result["failed"] == 1
    assert documents.documents[9].status == "failed"
    assert documents.failed[9] == "Could not index document"
