from domain.documents.entities import DocumentEntity
from domain.documents.errors import InvalidResumeNameError
from domain.documents.repository import DocumentRepository
from domain.documents.use_cases.get_user_resume import GetUserResumeUseCase

MAX_RESUME_NAME_LENGTH = 200


class RenameUserResumeUseCase:
    def __init__(self, document_repository: DocumentRepository):
        self._documents = document_repository
        self._get = GetUserResumeUseCase(document_repository)

    def execute(self, document_id: int, user_id: int, name: str) -> DocumentEntity:
        document = self._get.execute(document_id, user_id)
        cleaned = _clean_name(name)
        if document.id is None or cleaned == document.source_filename:
            return document
        return self._documents.update_source_filename(document.id, cleaned)


def _clean_name(name: str) -> str:
    cleaned = " ".join(
        name.replace("\0", "").replace("/", "-").replace("\\", "-").split()
    )
    if not cleaned:
        raise InvalidResumeNameError("Resume name cannot be empty")
    if len(cleaned) > MAX_RESUME_NAME_LENGTH:
        raise InvalidResumeNameError("Resume name is too long")
    return cleaned
