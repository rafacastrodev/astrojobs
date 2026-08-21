from dataclasses import dataclass
from datetime import datetime
from typing import Any, Literal, Optional

DocumentType = Literal["resume", "job"]
DocumentStatus = Literal["draft", "synced", "failed"]


@dataclass
class DocumentEntity:
    id: Optional[int]
    type: DocumentType
    payload: dict[str, Any]
    source_filename: str
    status: DocumentStatus
    pinecone_id: Optional[str]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
