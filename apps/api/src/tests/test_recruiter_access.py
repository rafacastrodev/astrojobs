from datetime import UTC, datetime

import pytest

from domain.documents.entities import DocumentEntity
from domain.documents.errors import DocumentNotFoundError
from domain.documents.recruiter_access import (
    recruiter_owned_jobs,
    require_recruiter_job,
)


def _doc(doc_id: int, doc_type: str, user_id: int | None) -> DocumentEntity:
    now = datetime.now(UTC)
    return DocumentEntity(
        id=doc_id,
        type=doc_type,  # type: ignore[arg-type]
        payload={},
        source_filename="file",
        status="synced",
        pinecone_id=None,
        error_message=None,
        created_at=now,
        updated_at=now,
        user_id=user_id,
    )


def test_recruiter_can_only_see_own_jobs() -> None:
    own_job = _doc(1, "job", 10)
    other_job = _doc(2, "job", 11)
    resume = _doc(3, "resume", 20)
    assert recruiter_owned_jobs([own_job, other_job, resume], 10) == [own_job]


def test_recruiter_cannot_open_a_resume() -> None:
    with pytest.raises(DocumentNotFoundError):
        require_recruiter_job(_doc(3, "resume", 20), 10)


def test_recruiter_cannot_open_someone_elses_job() -> None:
    with pytest.raises(DocumentNotFoundError):
        require_recruiter_job(_doc(2, "job", 11), 10)


def test_recruiter_can_open_own_job() -> None:
    job = _doc(1, "job", 10)
    assert require_recruiter_job(job, 10) is job
