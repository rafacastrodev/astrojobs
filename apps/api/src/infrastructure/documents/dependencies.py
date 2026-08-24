import logging

from fastapi import Depends
from sqlalchemy.orm import Session

from domain.documents.use_cases.create_document_from_upload import (
    CreateDocumentFromUploadUseCase,
)
from domain.documents.use_cases.create_job import CreateJobUseCase
from domain.documents.use_cases.delete_document import DeleteDocumentUseCase
from domain.documents.use_cases.delete_user_resume import DeleteUserResumeUseCase
from domain.documents.use_cases.get_document import GetDocumentUseCase
from domain.documents.use_cases.get_user_resume_detail import GetUserResumeDetailUseCase
from domain.documents.use_cases.list_documents import ListDocumentsUseCase
from domain.documents.use_cases.list_user_resumes import ListUserResumesUseCase
from domain.documents.use_cases.match_jobs_for_resume import MatchJobsForResumeUseCase
from domain.documents.use_cases.sync_documents import SyncDocumentsUseCase
from domain.documents.use_cases.upload_resume import UploadResumeUseCase
from infrastructure.database.config import settings
from infrastructure.database.session import get_db
from infrastructure.extraction.file_text_loader import CompositeFileTextLoader
from infrastructure.extraction.heuristic_text_extractor import HeuristicTextExtractor
from infrastructure.extraction.openai_resume_extractor import OpenAIResumeExtractor
from infrastructure.repositories.sqlalchemy_analysis_repository import (
    SqlAlchemyAnalysisRepository,
)
from infrastructure.repositories.sqlalchemy_document_repository import (
    SqlAlchemyDocumentRepository,
)
from infrastructure.security.openai_content_safety import OpenAIContentSafetyChecker
from infrastructure.security.pii_redactor import ResumePiiRedactor
from infrastructure.security.resume_file_validator import ResumeFileSafetyValidator
from infrastructure.services.openai_resume_analyzer import OpenAIResumeAnalyzer
from infrastructure.services.pinecone_embedder import PineconeEmbedder
from infrastructure.services.pinecone_service import PineconeClient
from infrastructure.storage.s3_file_storage import S3FileStorage

logger = logging.getLogger(__name__)


def get_create_document_use_case(
    db: Session = Depends(get_db),
) -> CreateDocumentFromUploadUseCase:
    return CreateDocumentFromUploadUseCase(
        SqlAlchemyDocumentRepository(db), CompositeFileTextLoader(), HeuristicTextExtractor()
    )


def get_create_job_use_case(db: Session = Depends(get_db)) -> CreateJobUseCase:
    documents = SqlAlchemyDocumentRepository(db)
    return CreateJobUseCase(
        documents,
        SyncDocumentsUseCase(
            documents,
            PineconeEmbedder(),
            pinecone_client_factory=PineconeClient,
            namespace_resumes=settings.pinecone_namespace_resumes,
            namespace_jobs=settings.pinecone_namespace_jobs,
        ),
    )


def get_user_resume_detail_use_case(
    db: Session = Depends(get_db),
) -> GetUserResumeDetailUseCase:
    return GetUserResumeDetailUseCase(
        SqlAlchemyDocumentRepository(db), SqlAlchemyAnalysisRepository(db)
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
    document_repository = SqlAlchemyDocumentRepository(db)
    analysis_repository = SqlAlchemyAnalysisRepository(db)
    sync_use_case = SyncDocumentsUseCase(
        document_repository,
        PineconeEmbedder(),
        pinecone_client_factory=PineconeClient,
        namespace_resumes=settings.pinecone_namespace_resumes,
        namespace_jobs=settings.pinecone_namespace_jobs,
    )
    return UploadResumeUseCase(
        document_repository,
        CompositeFileTextLoader(),
        OpenAIResumeExtractor(),
        S3FileStorage(),
        max_file_bytes=settings.max_upload_bytes,
        file_validator=ResumeFileSafetyValidator(),
        pii_redactor=ResumePiiRedactor(),
        content_safety=OpenAIContentSafetyChecker(),
        analyzer=OpenAIResumeAnalyzer(),
        analysis_repository=analysis_repository,
        sync_documents_use_case=sync_use_case,
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


def get_match_jobs_use_case(db: Session = Depends(get_db)) -> MatchJobsForResumeUseCase:
    return MatchJobsForResumeUseCase(
        SqlAlchemyDocumentRepository(db),
        PineconeEmbedder(input_type="query"),
        pinecone_client_factory=PineconeClient,
        namespace_jobs=settings.pinecone_namespace_jobs,
    )


def get_sync_documents_use_case(db: Session = Depends(get_db)) -> SyncDocumentsUseCase:
    return SyncDocumentsUseCase(
        SqlAlchemyDocumentRepository(db),
        PineconeEmbedder(),
        pinecone_client_factory=PineconeClient,
        namespace_resumes=settings.pinecone_namespace_resumes,
        namespace_jobs=settings.pinecone_namespace_jobs,
    )
