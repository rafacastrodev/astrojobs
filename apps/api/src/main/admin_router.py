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

from domain.documents.entities import DocumentEntity, DocumentStatus, DocumentType
from domain.documents.errors import (
    DocumentNotFoundError,
    ExtractionError,
    SyncConfigurationError,
    UnsupportedFileError,
)
from domain.documents.use_cases.create_document_from_upload import (
    CreateDocumentFromUploadUseCase,
)
from domain.documents.use_cases.create_job import CreateJobUseCase
from domain.documents.use_cases.delete_document import DeleteDocumentUseCase
from domain.documents.use_cases.get_document import GetDocumentUseCase
from domain.documents.use_cases.list_documents import ListDocumentsUseCase
from domain.documents.use_cases.match_resumes_for_jobs import MatchResumesForJobsUseCase
from domain.documents.use_cases.sync_documents import SyncDocumentsUseCase
from domain.users.entities import UserEntity
from infrastructure.documents.dependencies import (
    get_create_document_use_case,
    get_create_job_use_case,
    get_delete_document_use_case,
    get_document_use_case,
    get_list_documents_use_case,
    get_match_resumes_use_case,
    get_sync_documents_use_case,
)
from infrastructure.schemas.document_schemas import (
    DocumentResponse,
    JobCreateRequest,
    ResumeMatchResponse,
    MatchedJobSummary,
    SyncDocumentsRequest,
    SyncDocumentsResponse,
)
from infrastructure.users.dependencies import require_recruiter

router = APIRouter(
    prefix="/recruiter",
    tags=["recruiter"],
    dependencies=[Depends(require_recruiter)],
)


def _to_document_response(document: DocumentEntity) -> DocumentResponse:
    return DocumentResponse(
        id=document.id,  # type: ignore[arg-type]
        type=document.type,
        payload=document.payload,
        source_filename=document.source_filename,
        status=document.status,
        pinecone_id=document.pinecone_id,
        error_message=document.error_message,
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


@router.post("/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    type: DocumentType = Form(...),
    use_case: CreateDocumentFromUploadUseCase = Depends(get_create_document_use_case),
) -> DocumentResponse:
    content = await file.read()
    filename = file.filename or "upload.txt"
    try:
        document = use_case.execute(content, filename, type)
    except (UnsupportedFileError, ExtractionError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    return _to_document_response(document)


@router.post("/jobs", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    body: JobCreateRequest,
    user: UserEntity = Depends(require_recruiter),
    use_case: CreateJobUseCase = Depends(get_create_job_use_case),
) -> DocumentResponse:
    return _to_document_response(use_case.execute(body.model_dump(), user.id))


@router.get("/matches", response_model=list[ResumeMatchResponse])
def list_matching_resumes(
    user: UserEntity = Depends(require_recruiter),
    use_case: MatchResumesForJobsUseCase = Depends(get_match_resumes_use_case),
) -> list[ResumeMatchResponse]:
    matches = use_case.execute(user.id)  # type: ignore[arg-type]
    return [
        ResumeMatchResponse(
            id=match.document.id,  # type: ignore[arg-type]
            source_filename=match.document.source_filename,
            score=match.score,
            matched_technologies=match.matched_technologies,
            matched_jobs=[
                MatchedJobSummary(
                    id=job.id,  # type: ignore[arg-type]
                    title=str(job.payload.get("title") or job.source_filename),
                )
                for job in match.matched_jobs
                if job.id is not None
            ],
            payload=match.document.payload,
            summary=match.summary,
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
        if type != "job" or document.user_id in (None, user.id)
    ]
    return [_to_document_response(document) for document in documents]


@router.get("/documents/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    use_case: GetDocumentUseCase = Depends(get_document_use_case),
) -> DocumentResponse:
    try:
        document = use_case.execute(document_id)
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
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    return SyncDocumentsResponse(**result)


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    use_case: DeleteDocumentUseCase = Depends(get_delete_document_use_case),
) -> None:
    try:
        use_case.execute(document_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
