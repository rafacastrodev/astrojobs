from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)

from domain.applications.errors import (
    ApplicationNotFoundError,
    InvalidApplicationTransitionError,
)
from domain.applications.use_cases.list_recruiter_applications import (
    ListRecruiterApplicationsUseCase,
)
from domain.applications.use_cases.update_application_status import (
    UpdateApplicationStatusUseCase,
)
from domain.documents.entities import DocumentEntity, DocumentStatus, DocumentType
from domain.documents.errors import (
    DocumentNotFoundError,
    ExtractionError,
    JobClosedError,
    PublishedJobCannotBeDeletedError,
    SyncConfigurationError,
    UnsupportedFileError,
)
from domain.documents.technology_catalog import TECHNOLOGIES
from domain.documents.use_cases.close_job import CloseJobUseCase
from domain.documents.use_cases.create_document_from_upload import (
    CreateDocumentFromUploadUseCase,
)
from domain.documents.use_cases.create_job import CreateJobUseCase
from domain.documents.use_cases.delete_document import DeleteDocumentUseCase
from domain.documents.use_cases.get_document import GetDocumentUseCase
from domain.documents.use_cases.list_documents import ListDocumentsUseCase
from domain.documents.use_cases.match_resumes_for_jobs import MatchResumesForJobsUseCase
from domain.documents.use_cases.sync_documents import SyncDocumentsUseCase
from domain.notifications.errors import NotificationError
from domain.offers.errors import (
    AlreadyOfferedError,
    CannotOfferApplicantError,
    InvalidOfferMessageError,
)
from domain.offers.use_cases.create_offer import CreateOfferUseCase
from domain.users.entities import UserEntity
from infrastructure.documents.dependencies import (
    get_application_repository,
    get_close_job_use_case,
    get_create_document_use_case,
    get_create_job_use_case,
    get_create_offer_use_case,
    get_delete_document_use_case,
    get_document_use_case,
    get_list_documents_use_case,
    get_list_recruiter_applications_use_case,
    get_match_resumes_use_case,
    get_offer_repository,
    get_sync_documents_use_case,
    get_update_application_status_use_case,
    get_user_repository,
)
from infrastructure.repositories.sqlalchemy_application_repository import (
    SqlAlchemyApplicationRepository,
)
from infrastructure.repositories.sqlalchemy_offer_repository import (
    SqlAlchemyOfferRepository,
)
from infrastructure.repositories.sqlalchemy_user_repository import (
    SqlAlchemyUserRepository,
)
from infrastructure.schemas.application_schemas import (
    RecruiterApplicationResponse,
    UpdateApplicationStatusRequest,
)
from infrastructure.schemas.document_schemas import (
    DocumentResponse,
    JobCreateRequest,
    MatchedJobSummary,
    ResumeMatchResponse,
    SyncDocumentsRequest,
    SyncDocumentsResponse,
)
from infrastructure.schemas.offer_schemas import CreateOfferRequest, OfferResponse
from infrastructure.users.dependencies import require_recruiter

router = APIRouter(
    prefix="/recruiter",
    tags=["recruiter"],
    dependencies=[Depends(require_recruiter)],
)


@router.get("/technologies", response_model=list[str])
def list_technologies() -> list[str]:
    return list(TECHNOLOGIES)


def _to_document_response(document: DocumentEntity) -> DocumentResponse:
    return DocumentResponse(
        id=document.id,  # type: ignore[arg-type]
        type=document.type,
        payload=document.payload,
        source_filename=document.source_filename,
        status=document.status,
        pinecone_id=document.pinecone_id,
        error_message=document.error_message,
        closed_at=document.closed_at,
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


@router.post(
    "/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED
)
async def upload_document(
    file: UploadFile = File(...),
    type: DocumentType = Form(...),
    user: UserEntity = Depends(require_recruiter),
    use_case: CreateDocumentFromUploadUseCase = Depends(get_create_document_use_case),
) -> DocumentResponse:
    content = await file.read()
    filename = file.filename or "upload.txt"
    try:
        document = use_case.execute(content, filename, type, user.id)
    except (UnsupportedFileError, ExtractionError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        )
    return _to_document_response(document)


@router.post(
    "/jobs", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED
)
def create_job(
    body: JobCreateRequest,
    user: UserEntity = Depends(require_recruiter),
    use_case: CreateJobUseCase = Depends(get_create_job_use_case),
) -> DocumentResponse:
    return _to_document_response(use_case.execute(body.model_dump(), user.id))


@router.post(
    "/jobs/{job_id}/offers",
    response_model=OfferResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_offer(
    job_id: int,
    body: CreateOfferRequest,
    user: UserEntity = Depends(require_recruiter),
    use_case: CreateOfferUseCase = Depends(get_create_offer_use_case),
) -> OfferResponse:
    try:
        offer = use_case.execute(
            job_id=job_id,
            resume_document_id=body.resume_document_id,
            recruiter_user_id=user.id,
            recruiter_name=user.name,
            message=body.message,
        )
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except (AlreadyOfferedError, CannotOfferApplicantError, JobClosedError) as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except InvalidOfferMessageError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        )
    except NotificationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )
    return OfferResponse(**offer.__dict__)


@router.post("/jobs/{job_id}/close", response_model=DocumentResponse)
def close_job(
    job_id: int,
    user: UserEntity = Depends(require_recruiter),
    use_case: CloseJobUseCase = Depends(get_close_job_use_case),
) -> DocumentResponse:
    try:
        return _to_document_response(use_case.execute(job_id, user.id))
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except NotificationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )


@router.get("/applications", response_model=list[RecruiterApplicationResponse])
def list_applications(
    job_id: int | None = Query(default=None),
    user: UserEntity = Depends(require_recruiter),
    use_case: ListRecruiterApplicationsUseCase = Depends(
        get_list_recruiter_applications_use_case
    ),
) -> list[RecruiterApplicationResponse]:
    return [
        RecruiterApplicationResponse(**application.__dict__)
        for application in use_case.execute(user.id, job_id)
    ]


@router.patch(
    "/applications/{application_id}", response_model=RecruiterApplicationResponse
)
def update_application_status(
    application_id: int,
    body: UpdateApplicationStatusRequest,
    user: UserEntity = Depends(require_recruiter),
    update: UpdateApplicationStatusUseCase = Depends(
        get_update_application_status_use_case
    ),
    list_use_case: ListRecruiterApplicationsUseCase = Depends(
        get_list_recruiter_applications_use_case
    ),
) -> RecruiterApplicationResponse:
    try:
        update.execute(application_id, user.id, user.name, body.status)
    except ApplicationNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except InvalidApplicationTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except NotificationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )
    application = next(
        (item for item in list_use_case.execute(user.id) if item.id == application_id),
        None,
    )
    if application is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )
    return RecruiterApplicationResponse(**application.__dict__)


@router.delete(
    "/applications/{application_id}", response_model=RecruiterApplicationResponse
)
def remove_candidate(
    application_id: int,
    user: UserEntity = Depends(require_recruiter),
    update: UpdateApplicationStatusUseCase = Depends(
        get_update_application_status_use_case
    ),
    list_use_case: ListRecruiterApplicationsUseCase = Depends(
        get_list_recruiter_applications_use_case
    ),
) -> RecruiterApplicationResponse:
    return update_application_status(
        application_id,
        UpdateApplicationStatusRequest(status="removed"),
        user,
        update,
        list_use_case,
    )


@router.get("/matches", response_model=list[ResumeMatchResponse])
def list_matching_resumes(
    user: UserEntity = Depends(require_recruiter),
    use_case: MatchResumesForJobsUseCase = Depends(get_match_resumes_use_case),
    applications: SqlAlchemyApplicationRepository = Depends(get_application_repository),
    offers: SqlAlchemyOfferRepository = Depends(get_offer_repository),
    users: SqlAlchemyUserRepository = Depends(get_user_repository),
) -> list[ResumeMatchResponse]:
    matches = []
    professionals = {}
    for match in use_case.execute(user.id):  # type: ignore[arg-type]
        professional_id = match.document.user_id
        if professional_id is None:
            continue
        professional = users.get_by_id(professional_id)
        if professional is None or professional.role != "professional":
            continue
        professionals[professional_id] = professional
        matches.append(match)
    professional_ids = [
        match.document.user_id
        for match in matches
        if match.document.user_id is not None
    ]
    offered_by_professional = offers.list_job_ids_for_professionals(professional_ids)
    return [
        ResumeMatchResponse(
            id=match.document.id,  # type: ignore[arg-type]
            created_at=match.document.created_at,
            professional_name=professionals[match.document.user_id].name,
            professional_email=professionals[match.document.user_id].email,
            source_filename=match.document.source_filename,
            score=match.score,
            matched_technologies=match.matched_technologies,
            matched_jobs=[
                MatchedJobSummary(
                    id=job.id,  # type: ignore[arg-type]
                    title=str(job.payload.get("title") or job.source_filename),
                    score=match.matched_job_scores.get(job.id, 0.0),  # type: ignore[arg-type]
                )
                for job in match.matched_jobs
                if job.id is not None
            ],
            payload=match.document.payload,
            summary=match.summary,
            applied_job_ids=list(
                applications.list_job_ids_for_applicant(match.document.user_id)
            )
            if match.document.user_id is not None
            else [],
            offered_job_ids=sorted(
                offered_by_professional.get(match.document.user_id, set())
            )
            if match.document.user_id is not None
            else [],
        )
        for match in matches
    ]


@router.get("/documents", response_model=list[DocumentResponse])
def list_documents(
    type: DocumentType | None = None,
    doc_status: DocumentStatus | None = Query(default=None, alias="status"),
    user: UserEntity = Depends(require_recruiter),
    use_case: ListDocumentsUseCase = Depends(get_list_documents_use_case),
) -> list[DocumentResponse]:
    documents = [
        document
        for document in use_case.execute(doc_type=type, status=doc_status)
        if document.type != "job" or document.user_id == user.id
    ]
    return [_to_document_response(document) for document in documents]


@router.get("/documents/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    user: UserEntity = Depends(require_recruiter),
    use_case: GetDocumentUseCase = Depends(get_document_use_case),
) -> DocumentResponse:
    try:
        document = use_case.execute(document_id)
        if document.type == "job" and document.user_id != user.id:
            raise DocumentNotFoundError("Job not found")
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return _to_document_response(document)


@router.post("/documents/sync", response_model=SyncDocumentsResponse)
def sync_documents(
    body: SyncDocumentsRequest,
    use_case: SyncDocumentsUseCase = Depends(get_sync_documents_use_case),
) -> SyncDocumentsResponse:
    try:
        result = use_case.execute(body.ids)
    except SyncConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )
    return SyncDocumentsResponse(**result)


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    user: UserEntity = Depends(require_recruiter),
    document_use_case: GetDocumentUseCase = Depends(get_document_use_case),
    use_case: DeleteDocumentUseCase = Depends(get_delete_document_use_case),
) -> None:
    try:
        document = document_use_case.execute(document_id)
        if document.type == "job" and document.user_id != user.id:
            raise DocumentNotFoundError("Job not found")
        use_case.execute(document_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PublishedJobCannotBeDeletedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
