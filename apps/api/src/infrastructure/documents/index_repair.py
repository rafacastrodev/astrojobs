import logging

from domain.documents.use_cases.sync_documents import SyncDocumentsUseCase
from infrastructure.database.config import settings
from infrastructure.database.session import SessionLocal
from infrastructure.repositories.sqlalchemy_document_repository import (
    SqlAlchemyDocumentRepository,
)
from infrastructure.vector.factory import make_embedder, make_vector_store

logger = logging.getLogger(__name__)


def repair_missing_document_embeddings() -> None:
    """Rebuild vectors missing after a transient provider or deployment failure."""
    with SessionLocal() as db:
        documents = SqlAlchemyDocumentRepository(db)
        result = SyncDocumentsUseCase(
            documents,
            make_embedder(),
            pinecone_client_factory=lambda: make_vector_store(db),
            namespace_resumes=settings.pinecone_namespace_resumes,
            namespace_jobs=settings.pinecone_namespace_jobs,
        ).execute()
    if result["synced"] or result["failed"] or result["skipped"]:
        logger.info(
            "Embedding repair finished: %s synced, %s failed, %s skipped",
            result["synced"],
            result["failed"],
            result["skipped"],
        )
