from fastapi import Depends
from sqlalchemy.orm import Session

from domain.documents.use_cases.create_document_from_upload import (
    CreateDocumentFromUploadUseCase,
)
from domain.documents.use_cases.delete_document import DeleteDocumentUseCase
from domain.documents.use_cases.get_document import GetDocumentUseCase
from domain.documents.use_cases.list_documents import ListDocumentsUseCase
from domain.documents.use_cases.sync_documents import SyncDocumentsUseCase
from infrastructure.database.config import settings
from infrastructure.database.session import get_db
from infrastructure.extraction.file_text_loader import CompositeFileTextLoader
from infrastructure.extraction.heuristic_text_extractor import HeuristicTextExtractor
from infrastructure.repositories.sqlalchemy_document_repository import (
    SqlAlchemyDocumentRepository,
)
from infrastructure.services.hashing_embedder import HashingEmbedder
from infrastructure.services.pinecone_service import PineconeClient


def get_create_document_use_case(
    db: Session = Depends(get_db),
) -> CreateDocumentFromUploadUseCase:
    return CreateDocumentFromUploadUseCase(
        SqlAlchemyDocumentRepository(db), CompositeFileTextLoader(), HeuristicTextExtractor()
    )


def get_list_documents_use_case(db: Session = Depends(get_db)) -> ListDocumentsUseCase:
    return ListDocumentsUseCase(SqlAlchemyDocumentRepository(db))


def get_document_use_case(db: Session = Depends(get_db)) -> GetDocumentUseCase:
    return GetDocumentUseCase(SqlAlchemyDocumentRepository(db))


def get_delete_document_use_case(db: Session = Depends(get_db)) -> DeleteDocumentUseCase:
    return DeleteDocumentUseCase(
        SqlAlchemyDocumentRepository(db),
        pinecone_client_factory=PineconeClient,
        namespace_resumes=settings.pinecone_namespace_resumes,
        namespace_jobs=settings.pinecone_namespace_jobs,
    )


def get_sync_documents_use_case(db: Session = Depends(get_db)) -> SyncDocumentsUseCase:
    return SyncDocumentsUseCase(
        SqlAlchemyDocumentRepository(db),
        HashingEmbedder(),
        pinecone_client_factory=PineconeClient,
        namespace_resumes=settings.pinecone_namespace_resumes,
        namespace_jobs=settings.pinecone_namespace_jobs,
    )
