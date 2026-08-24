from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from domain.analysis.entities import AnalysisEntity
from domain.analysis.errors import AnalyzerConfigurationError, AnalyzerError
from domain.documents.entities import DocumentEntity
from domain.documents.errors import (
    DocumentNotFoundError,
    ExtractionConfigurationError,
    ExtractionError,
    ExtractionServiceError,
    FileTooLargeError,
    SafetyConfigurationError,
    SafetyServiceError,
    SearchConfigurationError,
    StorageError,
    UnsafeContentError,
    UnsupportedFileError,
)
from domain.documents.use_cases.delete_user_resume import DeleteUserResumeUseCase
from domain.documents.use_cases.get_user_resume_detail import GetUserResumeDetailUseCase
from domain.documents.use_cases.list_documents import ListDocumentsUseCase
from domain.documents.use_cases.list_user_resumes import ListUserResumesUseCase
from domain.documents.use_cases.match_jobs_for_resume import (
    DEFAULT_TOP_K,
    MatchJobsForResumeUseCase,
)
from domain.documents.use_cases.process_resume import ProcessResumeUseCase
from domain.documents.use_cases.upload_resume import UploadResumeUseCase
from domain.users.entities import UserEntity
from infrastructure.documents.dependencies import (
    get_delete_user_resume_use_case,
    get_list_documents_use_case,
    get_list_user_resumes_use_case,
    get_match_jobs_use_case,
    get_process_resume_use_case,
    get_upload_resume_use_case,
    get_user_resume_detail_use_case,
)
from infrastructure.schemas.document_schemas import (
    JobMatchResponse,
    JobSummaryResponse,
    ProcessResumeRequest,
    ResumeResponse,
)
from infrastructure.users.dependencies import get_current_user
from main.analysis_router import _to_response as _to_analysis_response

router = APIRouter(prefix="/documents", tags=["documents"])


def _to_resume_response(
    document: DocumentEntity, latest_analysis: AnalysisEntity | None = None
) -> ResumeResponse:
    return ResumeResponse(
        id=document.id,  # type: ignore[arg-type]
        payload=document.payload,
        source_filename=document.source_filename,
        status=document.status,
        error_message=document.error_message,
        analysis_status=document.analysis_status,
        analysis_error_message=document.analysis_error_message,
        created_at=document.created_at,
        updated_at=document.updated_at,
        latest_analysis=_to_analysis_response(latest_analysis) if latest_analysis else None,
    )


@router.post("/resumes", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    user: UserEntity = Depends(get_current_user),
    use_case: UploadResumeUseCase = Depends(get_upload_resume_use_case),
) -> ResumeResponse:
    content = await file.read()
    filename = file.filename or "resume.txt"
    try:
        document, analysis = use_case.execute(content, filename, user.id)
    except FileTooLargeError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(exc)
        )
    except (ExtractionConfigurationError, SafetyConfigurationError, AnalyzerConfigurationError) as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except (ExtractionServiceError, SafetyServiceError, AnalyzerError) as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    except (UnsupportedFileError, ExtractionError, UnsafeContentError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except StorageError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    return _to_resume_response(document, analysis)


@router.post("/resumes/{document_id}/process", response_model=ResumeResponse)
def process_resume(
    document_id: int,
    body: ProcessResumeRequest | None = None,
    user: UserEntity = Depends(get_current_user),
    use_case: ProcessResumeUseCase = Depends(get_process_resume_use_case),
) -> ResumeResponse:
    try:
        document, analysis = use_case.execute(
            document_id,
            user.id,
            force_analysis=body.force_analysis if body else False,
        )
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return _to_resume_response(document, analysis)


@router.get("/resumes", response_model=list[ResumeResponse])
def list_resumes(
    user: UserEntity = Depends(get_current_user),
    use_case: ListUserResumesUseCase = Depends(get_list_user_resumes_use_case),
) -> list[ResumeResponse]:
    documents_with_analysis = use_case.execute(user.id)
    return [
        _to_resume_response(document, latest_analysis)
        for document, latest_analysis in documents_with_analysis
    ]


@router.get("/resumes/{document_id}", response_model=ResumeResponse)
def get_resume(
    document_id: int,
    user: UserEntity = Depends(get_current_user),
    use_case: GetUserResumeDetailUseCase = Depends(get_user_resume_detail_use_case),
) -> ResumeResponse:
    try:
        document, analysis = use_case.execute(document_id, user.id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return _to_resume_response(document, analysis)


@router.delete("/resumes/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    document_id: int,
    user: UserEntity = Depends(get_current_user),
    use_case: DeleteUserResumeUseCase = Depends(get_delete_user_resume_use_case),
) -> None:
    try:
        use_case.execute(document_id, user.id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/resumes/{document_id}/matches", response_model=list[JobMatchResponse])
def match_jobs(
    document_id: int,
    top_k: int = DEFAULT_TOP_K,
    user: UserEntity = Depends(get_current_user),
    use_case: MatchJobsForResumeUseCase = Depends(get_match_jobs_use_case),
) -> list[JobMatchResponse]:
    try:
        matches = use_case.execute(document_id, user.id, top_k=top_k)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except SearchConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    return [
        JobMatchResponse(
            id=match.document.id,  # type: ignore[arg-type]
            title=_job_title(match.document),
            source_filename=match.document.source_filename,
            score=match.score,
            payload=match.document.payload,
        )
        for match in matches
    ]


@router.get("/jobs", response_model=list[JobSummaryResponse])
def list_catalog_jobs(
    user: UserEntity = Depends(get_current_user),
    use_case: ListDocumentsUseCase = Depends(get_list_documents_use_case),
) -> list[JobSummaryResponse]:
    documents = use_case.execute(doc_type="job", status="synced")
    return [
        JobSummaryResponse(
            id=document.id,  # type: ignore[arg-type]
            title=_job_title(document),
            source_filename=document.source_filename,
        )
        for document in documents
    ]


def _job_title(document: DocumentEntity) -> str:
    title = document.payload.get("title") if isinstance(document.payload, dict) else None
    return title if isinstance(title, str) and title.strip() else document.source_filename
