from domain.documents.payload_text import payload_to_embedding_text


def test_resume_embedding_excludes_full_text_and_contact() -> None:
    text = payload_to_embedding_text(
        {
            "summary": "Backend engineer",
            "skills": ["Python", "FastAPI"],
            "contact": {"emails": ["private@example.com"]},
            "full_text": "private@example.com 99999-0000",
        },
        "resume",
    )
    assert "Backend engineer" in text
    assert "Python" in text
    assert "private@example.com" not in text
    assert "99999-0000" not in text


def test_job_embedding_uses_catalog_fields() -> None:
    text = payload_to_embedding_text(
        {
            "title": "Python Engineer",
            "requirements": ["FastAPI"],
            "responsibilities": ["Build APIs"],
            "internal_note": "do not embed",
        },
        "job",
    )
    assert "Python Engineer" in text
    assert "FastAPI" in text
    assert "internal_note" not in text


def test_job_embedding_uses_technologies_and_description() -> None:
    text = payload_to_embedding_text(
        {
            "title": "Python Engineer",
            "technologies": ["Python", "FastAPI"],
            "description": "Build internal APIs",
            "internal_note": "do not embed",
        },
        "job",
    )
    assert "Python Engineer" in text
    assert "FastAPI" in text
    assert "Build internal APIs" in text
    assert "internal_note" not in text


def test_job_embedding_uses_filter_fields() -> None:
    text = payload_to_embedding_text(
        {
            "title": "Python Engineer",
            "seniority": "senior",
            "work_mode": "hybrid",
            "region": "São Paulo",
            "employment_type": "full-time",
            "internal_note": "do not embed",
        },
        "job",
    )
    assert "senior" in text
    assert "hybrid" in text
    assert "São Paulo" in text
    assert "full-time" in text
    assert "internal_note" not in text


def test_resume_embedding_includes_profile_fields() -> None:
    text = payload_to_embedding_text(
        {
            "summary": "Backend engineer",
            "job_title": "Backend Engineer",
            "company": "Nubank",
            "region": "Sao Paulo",
            "salary_min_usd": 80000,
        },
        "resume",
    )
    assert "Backend Engineer" in text
    assert "Nubank" in text
    assert "Sao Paulo" in text
    assert "80000" in text


def test_job_embedding_includes_salary() -> None:
    text = payload_to_embedding_text(
        {
            "title": "Python Engineer",
            "salary_min_usd": 90000,
            "salary_max_usd": 120000,
            "internal_note": "do not embed",
        },
        "job",
    )
    assert "90000" in text
    assert "120000" in text
    assert "internal_note" not in text
