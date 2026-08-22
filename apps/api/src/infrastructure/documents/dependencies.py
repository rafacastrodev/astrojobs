import logging

from fastapi import Depends
from sqlalchemy.orm import Session

from domain.analysis.errors import AnalyzerConfigurationError
from domain.analysis.use_cases.analyze_resume import AnalyzeResumeUseCase
from domain.documents.use_cases.create_document_from_upload import (
    CreateDocumentFromUploadUseCase,
)
from domain.documents.use_cases.delete_document import DeleteDocumentUseCase
from domain.documents.use_cases.delete_user_resume import DeleteUserResumeUseCase
from domain.documents.use_cases.get_document import GetDocumentUseCase
from domain.documents.use_cases.list_documents import ListDocumentsUseCase
from domain.documents.use_cases.list_user_resumes import ListUserResumesUseCase
from domain.documents.use_cases.sync_documents import SyncDocumentsUseCase
from domain.documents.use_cases.upload_resume import UploadResumeUseCase
from infrastructure.database.config import settings
from infrastructure.database.session import get_db
from infrastructure.extraction.file_text_loader import CompositeFileTextLoader
from infrastructure.extraction.heuristic_text_extractor import HeuristicTextExtractor
from infrastructure.repositories.sqlalchemy_analysis_repository import (
    SqlAlchemyAnalysisRepository,
)
from infrastructure.repositories.sqlalchemy_document_repository import (
    SqlAlchemyDocumentRepository,
)
from infrastructure.services.bedrock_resume_analyzer import BedrockResumeAnalyzer
from infrastructure.services.hashing_embedder import HashingEmbedder
from infrastructure.services.pinecone_service import PineconeClient
from infrastructure.storage.s3_file_storage import S3FileStorage

logger = logging.getLogger(__name__)


def _build_analyze_resume_use_case(db: Session) -> AnalyzeResumeUseCase | None:
    try:
        analyzer = BedrockResumeAnalyzer()
    except AnalyzerConfigurationError:
        logger.info("Bedrock is not configured; resumes will upload without an initial score.")
        return None
    return AnalyzeResumeUseCase(
        SqlAlchemyAnalysisRepository(db),
        SqlAlchemyDocumentRepository(db),
        analyzer,
        HeuristicTextExtractor(),
    )


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


def get_upload_resume_use_case(db: Session = Depends(get_db)) -> UploadResumeUseCase:
    return UploadResumeUseCase(
        SqlAlchemyDocumentRepository(db),
        CompositeFileTextLoader(),
        HeuristicTextExtractor(),
        S3FileStorage(),
        max_file_bytes=settings.max_upload_bytes,
        analyze_resume_use_case=_build_analyze_resume_use_case(db),
    )


def get_list_user_resumes_use_case(db: Session = Depends(get_db)) -> ListUserResumesUseCase:
    return ListUserResumesUseCase(
        SqlAlchemyDocumentRepository(db), SqlAlchemyAnalysisRepository(db)
    )


def get_delete_user_resume_use_case(db: Session = Depends(get_db)) -> DeleteUserResumeUseCase:
    return DeleteUserResumeUseCase(
        SqlAlchemyDocumentRepository(db),
        S3FileStorage(),
        pinecone_client_factory=PineconeClient,
        namespace_resumes=settings.pinecone_namespace_resumes,
    )


def get_sync_documents_use_case(db: Session = Depends(get_db)) -> SyncDocumentsUseCase:
    return SyncDocumentsUseCase(
        SqlAlchemyDocumentRepository(db),
        HashingEmbedder(),
        pinecone_client_factory=PineconeClient,
        namespace_resumes=settings.pinecone_namespace_resumes,
        namespace_jobs=settings.pinecone_namespace_jobs,
    )
