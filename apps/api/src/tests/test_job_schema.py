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
    assert job.region == "Sao Paulo"


def test_job_form_requires_technologies() -> None:
    with pytest.raises(ValidationError, match="at least one technology"):
        JobCreateRequest(
            title="Backend Engineer",
            description="Build APIs",
            seniority="senior",
            work_mode="remote",
            region="Sao Paulo",
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
            region="Sao Paulo",
            employment_type="full-time",
        )


def test_job_form_canonicalizes_region_and_rejects_unknown_ones() -> None:
    job = JobCreateRequest(
        title="Backend Engineer",
        technologies=["Python"],
        description="Build APIs",
        seniority="senior",
        work_mode="hybrid",
        region="Brasil",
        employment_type="full-time",
    )
    assert job.region == "Brazil"

    with pytest.raises(ValidationError, match="region"):
        JobCreateRequest(
            title="Backend Engineer",
            technologies=["Python"],
            description="Build APIs",
            seniority="senior",
            work_mode="hybrid",
            region="Narnia",
            employment_type="full-time",
        )


def test_job_form_rejects_html_and_script() -> None:
    payload = {
        "technologies": ["Python"],
        "seniority": "junior",
        "work_mode": "on-site",
        "region": "Sao Paulo",
        "employment_type": "internship",
    }
    with pytest.raises(ValidationError, match="HTML and script"):
        JobCreateRequest(
            title="<img src=x onerror=alert(1)>QA XSS Probe",
            description="Testing stored XSS handling.",
            **payload,
        )
    with pytest.raises(ValidationError, match="HTML and script"):
        JobCreateRequest(
            title="QA Engineer",
            description="<script>alert(3)</script> Testing stored XSS handling.",
            **payload,
        )


def test_job_form_allows_plain_comparison_and_cplusplus() -> None:
    job = JobCreateRequest(
        title="C++ Engineer",
        technologies=["C++"],
        description="Ship native clients with salary > 80k.",
        seniority="senior",
        work_mode="remote",
        region="Remote / Worldwide",
        employment_type="full-time",
    )
    assert job.title == "C++ Engineer"


def test_job_form_accepts_optional_hidden_salary_range() -> None:
    job = JobCreateRequest(
        title="Backend Engineer",
        technologies=["Python"],
        description="Build APIs",
        seniority="senior",
        work_mode="remote",
        region="Remote / Worldwide",
        employment_type="full-time",
        salary_min_usd=80000,
        salary_max_usd=120000,
        hide_salary=True,
    )
    assert job.salary_min_usd == 80000
    assert job.salary_max_usd == 120000
    assert job.hide_salary is True

