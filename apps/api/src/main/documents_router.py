from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from domain.documents.entities import DocumentEntity
from domain.documents.errors import (
    DocumentNotFoundError,
    ExtractionError,
    FileTooLargeError,
    StorageError,
    UnsupportedFileError,
)
from domain.documents.use_cases.delete_user_resume import DeleteUserResumeUseCase
from domain.documents.use_cases.list_documents import ListDocumentsUseCase
from domain.documents.use_cases.list_user_resumes import ListUserResumesUseCase
from domain.documents.use_cases.upload_resume import UploadResumeUseCase
from domain.users.entities import UserEntity
from infrastructure.documents.dependencies import (
    get_delete_user_resume_use_case,
    get_list_documents_use_case,
    get_list_user_resumes_use_case,
    get_upload_resume_use_case,
)
from infrastructure.schemas.document_schemas import JobSummaryResponse, ResumeResponse
from infrastructure.users.dependencies import get_current_user

router = APIRouter(prefix="/documents", tags=["documents"])


def _to_resume_response(document: DocumentEntity) -> ResumeResponse:
    return ResumeResponse(
        id=document.id,  # type: ignore[arg-type]
        payload=document.payload,
        source_filename=document.source_filename,
        status=document.status,
        error_message=document.error_message,
        created_at=document.created_at,
        updated_at=document.updated_at,
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
        document = use_case.execute(content, filename, user.id)
    except FileTooLargeError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(exc)
        )
    except (UnsupportedFileError, ExtractionError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except StorageError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    return _to_resume_response(document)


@router.get("/resumes", response_model=list[ResumeResponse])
def list_resumes(
    user: UserEntity = Depends(get_current_user),
    use_case: ListUserResumesUseCase = Depends(get_list_user_resumes_use_case),
) -> list[ResumeResponse]:
    documents = use_case.execute(user.id)
    return [_to_resume_response(document) for document in documents]


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


@router.get("/jobs", response_model=list[JobSummaryResponse])
def list_catalog_jobs(
    user: UserEntity = Depends(get_current_user),
    use_case: ListDocumentsUseCase = Depends(get_list_documents_use_case),
) -> list[JobSummaryResponse]:
    documents = use_case.execute(doc_type="job")
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
