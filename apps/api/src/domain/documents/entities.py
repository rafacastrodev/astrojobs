from dataclasses import dataclass
from datetime import datetime
from typing import Any, Literal

DocumentType = Literal["resume", "job"]
DocumentStatus = Literal["draft", "synced", "failed"]


@dataclass
class DocumentEntity:
    id: int | None
    type: DocumentType
    payload: dict[str, Any]
    source_filename: str
    status: DocumentStatus
    pinecone_id: str | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    user_id: int | None = None
    storage_key: str | None = None
