from domain.documents.entities import DocumentEntity
from domain.documents.errors import DocumentNotFoundError


def require_recruiter_job(document: DocumentEntity, recruiter_user_id: int) -> DocumentEntity:
    if document.type != "job" or document.user_id != recruiter_user_id:
        raise DocumentNotFoundError("Job not found")
    return document


def recruiter_owned_jobs(
    documents: list[DocumentEntity], recruiter_user_id: int
) -> list[DocumentEntity]:
    return [
        document
        for document in documents
        if document.type == "job" and document.user_id == recruiter_user_id
    ]
