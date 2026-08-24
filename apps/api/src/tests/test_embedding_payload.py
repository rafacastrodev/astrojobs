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
