from fastapi import Depends
from sqlalchemy.orm import Session

from domain.analysis.use_cases.analyze_resume import AnalyzeResumeUseCase
from domain.applications.use_cases.apply_to_job import ApplyToJobUseCase
from domain.applications.use_cases.list_recruiter_applications import (
    ListRecruiterApplicationsUseCase,
)
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
from domain.documents.use_cases.match_resumes_for_jobs import MatchResumesForJobsUseCase
from domain.documents.use_cases.process_resume import ProcessResumeUseCase
from domain.documents.use_cases.retrieve_similar_jobs import RetrieveSimilarJobsUseCase
from domain.documents.use_cases.sync_documents import SyncDocumentsUseCase
from domain.documents.use_cases.upload_resume import UploadResumeUseCase
from infrastructure.database.config import settings
from infrastructure.database.session import get_db
from infrastructure.extraction.file_text_loader import CompositeFileTextLoader
from infrastructure.extraction.heuristic_text_extractor import HeuristicTextExtractor
from infrastructure.extraction.openai_resume_extractor import OpenAIResumeExtractor
from infrastructure.extraction.resilient_resume_extractor import (
    ResilientResumeExtractor,
)
from infrastructure.repositories.sqlalchemy_analysis_repository import (
    SqlAlchemyAnalysisRepository,
)
from infrastructure.repositories.sqlalchemy_application_repository import (
    SqlAlchemyApplicationRepository,
)
from infrastructure.repositories.sqlalchemy_document_repository import (
    SqlAlchemyDocumentRepository,
)
from infrastructure.repositories.sqlalchemy_user_repository import (
    SqlAlchemyUserRepository,
)
from infrastructure.security.openai_content_safety import OpenAIContentSafetyChecker
from infrastructure.security.pii_redactor import ResumePiiRedactor
from infrastructure.security.resume_file_validator import ResumeFileSafetyValidator
from infrastructure.services.openai_resume_analyzer import OpenAIResumeAnalyzer
from infrastructure.services.resilient_resume_analyzer import (
    HeuristicResumeAnalyzer,
    ResilientResumeAnalyzer,
)
from infrastructure.storage.s3_file_storage import S3FileStorage
from infrastructure.vector.factory import (
    make_context_retriever,
    make_embedder,
    make_vector_store,
)


def _resume_extractor():
    return ResilientResumeExtractor(OpenAIResumeExtractor(), HeuristicTextExtractor())


def _resume_analyzer():
    return ResilientResumeAnalyzer(OpenAIResumeAnalyzer(), HeuristicResumeAnalyzer())


def _sync_documents_use_case(documents, db: Session) -> SyncDocumentsUseCase:
    return SyncDocumentsUseCase(
        documents,
        make_embedder(),
        pinecone_client_factory=lambda: make_vector_store(db),
        namespace_resumes=settings.pinecone_namespace_resumes,
        namespace_jobs=settings.pinecone_namespace_jobs,
    )


def _similar_jobs_use_case(db: Session) -> RetrieveSimilarJobsUseCase:
    return RetrieveSimilarJobsUseCase(
        make_embedder(input_type="query"),
        lambda: make_vector_store(db),
        settings.pinecone_namespace_jobs,
        context_retriever=make_context_retriever(),
    )


def get_create_document_use_case(
    db: Session = Depends(get_db),
) -> CreateDocumentFromUploadUseCase:
    documents = SqlAlchemyDocumentRepository(db)
    return CreateDocumentFromUploadUseCase(
        documents,
        CompositeFileTextLoader(),
        HeuristicTextExtractor(),
        _sync_documents_use_case(documents, db),
    )


def get_create_job_use_case(db: Session = Depends(get_db)) -> CreateJobUseCase:
    documents = SqlAlchemyDocumentRepository(db)
    return CreateJobUseCase(
        documents,
        _sync_documents_use_case(documents, db),
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
        pinecone_client_factory=lambda: make_vector_store(db),
        namespace_resumes=settings.pinecone_namespace_resumes,
        namespace_jobs=settings.pinecone_namespace_jobs,
    )


def get_upload_resume_use_case(db: Session = Depends(get_db)) -> UploadResumeUseCase:
    document_repository = SqlAlchemyDocumentRepository(db)
    analysis_repository = SqlAlchemyAnalysisRepository(db)
    return UploadResumeUseCase(
        document_repository,
        CompositeFileTextLoader(),
        _resume_extractor(),
        S3FileStorage(),
        max_file_bytes=settings.max_upload_bytes,
        file_validator=ResumeFileSafetyValidator(),
        pii_redactor=ResumePiiRedactor(),
        content_safety=OpenAIContentSafetyChecker(),
        analyzer=_resume_analyzer(),
        analysis_repository=analysis_repository,
        sync_documents_use_case=_sync_documents_use_case(document_repository, db),
        similar_jobs=_similar_jobs_use_case(db),
    )


def get_process_resume_use_case(
    db: Session = Depends(get_db),
) -> ProcessResumeUseCase:
    documents = SqlAlchemyDocumentRepository(db)
    analyses = SqlAlchemyAnalysisRepository(db)
    analyze = AnalyzeResumeUseCase(
        analyses,
        documents,
        _resume_analyzer(),
        HeuristicTextExtractor(),
        _similar_jobs_use_case(db),
    )
    return ProcessResumeUseCase(
        documents,
        analyses,
        analyze,
        _sync_documents_use_case(documents, db),
    )


def get_list_user_resumes_use_case(db: Session = Depends(get_db)) -> ListUserResumesUseCase:
    return ListUserResumesUseCase(
        SqlAlchemyDocumentRepository(db), SqlAlchemyAnalysisRepository(db)
    )


def get_delete_user_resume_use_case(db: Session = Depends(get_db)) -> DeleteUserResumeUseCase:
    return DeleteUserResumeUseCase(
        SqlAlchemyDocumentRepository(db),
        S3FileStorage(),
        pinecone_client_factory=lambda: make_vector_store(db),
        namespace_resumes=settings.pinecone_namespace_resumes,
    )


def get_match_jobs_use_case(db: Session = Depends(get_db)) -> MatchJobsForResumeUseCase:
    return MatchJobsForResumeUseCase(
        SqlAlchemyDocumentRepository(db),
        SqlAlchemyAnalysisRepository(db),
    )


def get_match_resumes_use_case(
    db: Session = Depends(get_db),
) -> MatchResumesForJobsUseCase:
    return MatchResumesForJobsUseCase(
        SqlAlchemyDocumentRepository(db),
        SqlAlchemyAnalysisRepository(db),
    )


def get_sync_documents_use_case(db: Session = Depends(get_db)) -> SyncDocumentsUseCase:
    return _sync_documents_use_case(SqlAlchemyDocumentRepository(db), db)


def get_apply_to_job_use_case(db: Session = Depends(get_db)) -> ApplyToJobUseCase:
    return ApplyToJobUseCase(
        SqlAlchemyDocumentRepository(db),
        SqlAlchemyApplicationRepository(db),
    )


def get_list_recruiter_applications_use_case(
    db: Session = Depends(get_db),
) -> ListRecruiterApplicationsUseCase:
    return ListRecruiterApplicationsUseCase(
        SqlAlchemyApplicationRepository(db),
        SqlAlchemyDocumentRepository(db),
        SqlAlchemyUserRepository(db),
        SqlAlchemyAnalysisRepository(db),
    )


def get_application_repository(
    db: Session = Depends(get_db),
) -> SqlAlchemyApplicationRepository:
    return SqlAlchemyApplicationRepository(db)
