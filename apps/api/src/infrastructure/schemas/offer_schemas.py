from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class CreateOfferRequest(BaseModel):
    resume_document_id: int
    message: str = Field(min_length=1, max_length=500)

    @field_validator("message")
    @classmethod
    def _trim_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Offer message cannot be empty")
        return value


class OfferResponse(BaseModel):
    id: int
    job_document_id: int
    resume_document_id: int | None
    professional_user_id: int
    recruiter_user_id: int
    message: str
    created_at: datetime
