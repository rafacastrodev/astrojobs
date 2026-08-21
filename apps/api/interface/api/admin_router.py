from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status

from application.documents.errors import (
    DocumentNotFoundError,
    ExtractionError,
    SyncConfigurationError,
    UnsupportedFileError,
)
from application.documents.service import DocumentService
from domain.entities.document_entity import DocumentEntity, DocumentStatus, DocumentType
from interface.api.dependencies import get_document_service, require_admin
from interface.api.schemas import DocumentResponse, SyncDocumentsRequest, SyncDocumentsResponse

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


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
    service: DocumentService = Depends(get_document_service),
) -> DocumentResponse:
    content = await file.read()
    filename = file.filename or "upload.txt"
    try:
        document = service.create_from_upload(content, filename, type)
    except (UnsupportedFileError, ExtractionError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    return _to_document_response(document)


@router.get("/documents", response_model=list[DocumentResponse])
def list_documents(
    type: Optional[DocumentType] = None,
    doc_status: Optional[DocumentStatus] = Query(default=None, alias="status"),
    service: DocumentService = Depends(get_document_service),
) -> list[DocumentResponse]:
    documents = service.list(doc_type=type, status=doc_status)
    return [_to_document_response(document) for document in documents]


@router.get("/documents/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    service: DocumentService = Depends(get_document_service),
) -> DocumentResponse:
    try:
        document = service.get(document_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return _to_document_response(document)


@router.post("/documents/sync", response_model=SyncDocumentsResponse)
def sync_documents(
    body: SyncDocumentsRequest,
    service: DocumentService = Depends(get_document_service),
) -> SyncDocumentsResponse:
    try:
        result = service.sync(body.ids)
    except SyncConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    return SyncDocumentsResponse(**result)


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    service: DocumentService = Depends(get_document_service),
) -> None:
    try:
        service.delete(document_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
