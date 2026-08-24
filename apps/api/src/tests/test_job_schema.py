import pytest
from pydantic import ValidationError

from infrastructure.schemas.document_schemas import JobCreateRequest


def test_job_form_normalizes_technologies() -> None:
    job = JobCreateRequest(
        title="  Backend Engineer  ",
        technologies=[" Python ", "", "python", "FastAPI", "node"],
        description="  Build APIs  ",
        seniority="senior",
        work_mode="remote",
        region="  São Paulo  ",
        employment_type="full-time",
    )
    assert job.title == "Backend Engineer"
    assert job.technologies == ["Python", "FastAPI", "Node.js"]
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


def test_job_form_rejects_unknown_technology() -> None:
    with pytest.raises(ValidationError, match="Unknown technology: MadeUpDB"):
        JobCreateRequest(
            title="Backend Engineer",
            technologies=["MadeUpDB"],
            description="Build APIs",
            seniority="senior",
            work_mode="remote",
            region="São Paulo",
            employment_type="full-time",
        )
