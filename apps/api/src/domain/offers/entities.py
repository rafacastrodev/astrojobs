from dataclasses import dataclass
from datetime import datetime


@dataclass
class OfferEntity:
    id: int
    job_document_id: int
    resume_document_id: int | None
    professional_user_id: int
    recruiter_user_id: int
    message: str
    created_at: datetime
