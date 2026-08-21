from domain.documents.entities import DocumentEntity
from domain.documents.errors import DocumentNotFoundError
from domain.documents.repository import DocumentRepository


class GetUserResumeUseCase:
    """Loads a resume that belongs to the given user.

    A document owned by someone else is reported as missing rather than
    forbidden, so the endpoint never confirms that an id exists.
    """

    def __init__(self, document_repository: DocumentRepository):
        self._documents = document_repository

    def execute(self, document_id: int, user_id: int) -> DocumentEntity:
        document = self._documents.get_by_id(document_id)
        if document is None or document.user_id != user_id or document.type != "resume":
            raise DocumentNotFoundError(f"Document {document_id} not found")
        return document
