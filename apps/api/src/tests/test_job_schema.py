import pytest
from pydantic import ValidationError

from infrastructure.schemas.document_schemas import JobCreateRequest


def test_job_form_normalizes_technologies() -> None:
    job = JobCreateRequest(
        title="  Backend Engineer  ",
        technologies=[" Python ", "", "python", "FastAPI"],
        description="  Build APIs  ",
        seniority="senior",
        work_mode="remote",
        region="  São Paulo  ",
        employment_type="full-time",
    )
    assert job.title == "Backend Engineer"
    assert job.technologies == ["Python", "FastAPI"]
    assert job.description == "Build APIs"
    assert job.region == "São Paulo"


def test_job_form_requires_technologies() -> None:
    with pytest.raises(ValidationError, match="at least one technology"):
        JobCreateRequest(
            title="Backend Engineer",
            description="Build APIs",
            seniority="senior",
            work_mode="remote",
            region="São Paulo",
            employment_type="full-time",
        )
