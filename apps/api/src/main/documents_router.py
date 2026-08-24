from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from domain.analysis.entities import AnalysisEntity
from domain.analysis.errors import AnalyzerConfigurationError, AnalyzerError
from domain.applications.errors import AlreadyAppliedError, NoResumeToApplyError
from domain.applications.use_cases.apply_to_job import ApplyToJobUseCase
from domain.documents.entities import DocumentEntity
from domain.documents.errors import (
    DocumentNotFoundError,
    DuplicateDocumentError,
    ExtractionConfigurationError,
    ExtractionError,
    ExtractionServiceError,
    FileTooLargeError,
    InvalidResumeNameError,
    JobClosedError,
    SafetyConfigurationError,
    SafetyServiceError,
    StorageError,
    UnsafeContentError,
    UnsupportedFileError,
)
from domain.documents.experience_grouping import grouped_resume_payload
from domain.documents.use_cases.delete_user_resume import DeleteUserResumeUseCase
from domain.documents.use_cases.get_user_resume_detail import GetUserResumeDetailUseCase
from domain.documents.use_cases.list_user_resumes import ListUserResumesUseCase
from domain.documents.use_cases.match_jobs_for_resume import (
    DEFAULT_TOP_K,
    JobMatch,
    MatchJobsForResumeUseCase,
)
from domain.documents.use_cases.process_resume import ProcessResumeUseCase
from domain.documents.use_cases.rename_user_resume import RenameUserResumeUseCase
from domain.documents.use_cases.upload_resume import UploadResumeUseCase
from domain.notifications.errors import NotificationError
from domain.users.entities import UserEntity
from infrastructure.documents.dependencies import (
    get_application_repository,
    get_apply_to_job_use_case,
    get_delete_user_resume_use_case,
    get_document_repository,
    get_list_user_resumes_use_case,
    get_match_jobs_use_case,
    get_offer_repository,
    get_process_resume_use_case,
    get_rename_user_resume_use_case,
    get_upload_resume_use_case,
    get_user_repository,
    get_user_resume_detail_use_case,
)
from infrastructure.repositories.sqlalchemy_application_repository import (
    SqlAlchemyApplicationRepository,
)
from infrastructure.repositories.sqlalchemy_document_repository import (
    SqlAlchemyDocumentRepository,
)
from infrastructure.repositories.sqlalchemy_offer_repository import (
    SqlAlchemyOfferRepository,
)
from infrastructure.repositories.sqlalchemy_user_repository import (
    SqlAlchemyUserRepository,
)
from infrastructure.schemas.application_schemas import (
    ApplicationResponse,
    ApplyToJobRequest,
)
from infrastructure.schemas.document_schemas import (
    JobMatchResponse,
    ProcessResumeRequest,
    RenameResumeRequest,
    ResumeResponse,
)
from infrastructure.users.dependencies import get_current_user, require_professional
from main.analysis_router import _to_response as _to_analysis_response

router = APIRouter(prefix="/documents", tags=["documents"])


def _to_resume_response(
    document: DocumentEntity, latest_analysis: AnalysisEntity | None = None
) -> ResumeResponse:
    return ResumeResponse(
        id=document.id,  # type: ignore[arg-type]
        payload=grouped_resume_payload(document.payload),
        source_filename=document.source_filename,
        status=document.status,
        error_message=document.error_message,
        analysis_status=document.analysis_status,
        analysis_error_message=document.analysis_error_message,
        created_at=document.created_at,
        updated_at=document.updated_at,
        latest_analysis=_to_analysis_response(latest_analysis)
        if latest_analysis
        else None,
    )


@router.post(
    "/resumes", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED
)
async def upload_resume(
    file: UploadFile = File(...),
    user: UserEntity = Depends(get_current_user),
    use_case: UploadResumeUseCase = Depends(get_upload_resume_use_case),
) -> ResumeResponse:
    content = await file.read()
    filename = file.filename or "resume.txt"
    try:
        document, analysis = use_case.execute(content, filename, user.id)
    except DuplicateDocumentError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except FileTooLargeError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(exc)
        )
    except (
        ExtractionConfigurationError,
        SafetyConfigurationError,
        AnalyzerConfigurationError,
    ) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )
    except (ExtractionServiceError, SafetyServiceError, AnalyzerError) as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    except (UnsupportedFileError, ExtractionError, UnsafeContentError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        )
    except StorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )
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


@router.patch("/resumes/{document_id}", response_model=ResumeResponse)
def rename_resume(
    document_id: int,
    body: RenameResumeRequest,
    user: UserEntity = Depends(get_current_user),
    use_case: RenameUserResumeUseCase = Depends(get_rename_user_resume_use_case),
    detail: GetUserResumeDetailUseCase = Depends(get_user_resume_detail_use_case),
) -> ResumeResponse:
    try:
        use_case.execute(document_id, user.id, body.source_filename)
        document, analysis = detail.execute(document_id, user.id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except InvalidResumeNameError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        )
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
    user: UserEntity = Depends(require_professional),
    use_case: MatchJobsForResumeUseCase = Depends(get_match_jobs_use_case),
    applications: SqlAlchemyApplicationRepository = Depends(get_application_repository),
    offers: SqlAlchemyOfferRepository = Depends(get_offer_repository),
    users: SqlAlchemyUserRepository = Depends(get_user_repository),
) -> list[JobMatchResponse]:
    try:
        matches = use_case.execute(document_id, user.id, top_k=top_k)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    application_by_job = {
        application.job_document_id: application
        for application in applications.list_by_applicant(user.id)
    }
    applied_job_ids = set(application_by_job)
    offered_job_ids = set(offers.list_job_ids_for_professional(user.id))
    recruiters = _recruiter_cache(users)
    return [
        _to_job_match_response(
            match,
            applied=match.document.id in applied_job_ids,
            offered=match.document.id in offered_job_ids,
            recruiter=recruiters(match.document.user_id),
            application=application_by_job.get(match.document.id),
        )
        for match in matches
    ]


@router.get("/jobs", response_model=list[JobMatchResponse])
def list_catalog_jobs(
    user: UserEntity = Depends(require_professional),
    use_case: MatchJobsForResumeUseCase = Depends(get_match_jobs_use_case),
    applications: SqlAlchemyApplicationRepository = Depends(get_application_repository),
    offers: SqlAlchemyOfferRepository = Depends(get_offer_repository),
    documents: SqlAlchemyDocumentRepository = Depends(get_document_repository),
    users: SqlAlchemyUserRepository = Depends(get_user_repository),
) -> list[JobMatchResponse]:
    application_by_job = {
        application.job_document_id: application
        for application in applications.list_by_applicant(user.id)
    }
    applied_job_ids = set(application_by_job)
    offered_job_ids = set(offers.list_job_ids_for_professional(user.id))
    recruiters = _recruiter_cache(users)
    matches = use_case.execute_for_user(user.id)
    open_ids = {match.document.id for match in matches}
    matches.extend(
        JobMatch(document=job, score=0.0)
        for job in documents.list_by_ids(list(applied_job_ids))
        if (
            job.id not in open_ids
            and job.type == "job"
            and job.status == "synced"
            and job.user_id is not None
            and job.closed_at is not None
        )
    )
    return [
        _to_job_match_response(
            match,
            applied=match.document.id in applied_job_ids,
            offered=match.document.id in offered_job_ids,
            recruiter=recruiters(match.document.user_id),
            application=application_by_job.get(match.document.id),
        )
        for match in matches
    ]


@router.post(
    "/jobs/{job_id}/apply",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
def apply_to_job(
    job_id: int,
    body: ApplyToJobRequest | None = None,
    user: UserEntity = Depends(require_professional),
    use_case: ApplyToJobUseCase = Depends(get_apply_to_job_use_case),
) -> ApplicationResponse:
    try:
        application = use_case.execute(
            job_id,
            user.id,
            user.name,
            body.resume_document_id if body else None,
        )
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except NoResumeToApplyError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        )
    except AlreadyAppliedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except JobClosedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except NotificationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )
    return ApplicationResponse(
        id=application.id,
        job_document_id=application.job_document_id,
        resume_document_id=application.resume_document_id,
        created_at=application.created_at,
        status=application.status,
        updated_at=application.updated_at or application.created_at,
    )


def _to_job_match_response(
    match,
    applied: bool = False,
    offered: bool = False,
    recruiter: UserEntity | None = None,
    application=None,
) -> JobMatchResponse:
    return JobMatchResponse(
        id=match.document.id,  # type: ignore[arg-type]
        title=_job_title(match.document),
        source_filename=match.document.source_filename,
        created_at=match.document.created_at,
        score=match.score,
        payload=_payload_for_professional(match.document.payload),
        matched_technologies=match.matched_technologies,
        applied=applied,
        offered=offered,
        closed_at=match.document.closed_at,
        recruiter_name=recruiter.name if recruiter else None,
        recruiter_email=recruiter.email if recruiter else None,
        application_id=application.id if application else None,
        application_status=application.status if application else None,
        application_updated_at=(
            application.updated_at or application.created_at if application else None
        ),
    )


def _payload_for_professional(payload: object) -> dict:
    if not isinstance(payload, dict):
        return {}
    if not payload.get("hide_salary"):
        return payload
    redacted = dict(payload)
    redacted.pop("salary_min_usd", None)
    redacted.pop("salary_max_usd", None)
    return redacted


def _recruiter_cache(users: SqlAlchemyUserRepository):
    cache: dict[int, UserEntity | None] = {}

    def recruiter(user_id: int | None) -> UserEntity | None:
        if user_id is None:
            return None
        if user_id not in cache:
            cache[user_id] = users.get_by_id(user_id)
        return cache[user_id]

    return recruiter


def _job_title(document: DocumentEntity) -> str:
    title = (
        document.payload.get("title") if isinstance(document.payload, dict) else None
    )
    return (
        title if isinstance(title, str) and title.strip() else document.source_filename
    )
