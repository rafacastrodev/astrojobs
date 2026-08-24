import pytest
from pydantic import ValidationError

from infrastructure.schemas.document_schemas import JobCreateRequest


def test_job_form_normalizes_lists() -> None:
    job = JobCreateRequest(
        title="  Backend Engineer  ",
        requirements=[" Python ", "", "Python"],
        responsibilities=[],
    )
    assert job.title == "Backend Engineer"
    assert job.requirements == ["Python"]


def test_job_form_requires_content() -> None:
    with pytest.raises(ValidationError, match="requirement or responsibility"):
        JobCreateRequest(title="Backend Engineer")
