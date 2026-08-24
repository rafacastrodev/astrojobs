from domain.documents.experience_grouping import grouped_resume_payload
from domain.documents.technology_catalog import normalize_tech_stack


def test_normalize_tech_stack_keeps_catalog_names_only() -> None:
    stack = normalize_tech_stack(
        ["Languages: Python", "Testing: Playwright", "Other: Docker", "REST APIs"]
    )
    assert stack["languages"] == ["Python"]
    assert stack["tools"] == ["Playwright", "Docker"]
    assert stack["other"] == []
    assert "REST APIs" not in stack["other"]
    assert "Languages: Python" not in stack["languages"]


def test_grouped_resume_payload_canonicalizes_stored_skills() -> None:
    payload = grouped_resume_payload(
        {
            "skills": ["Languages: Python", "REST APIs"],
            "experiences": [],
        }
    )
    assert payload["skills"] == ["Python"]
    assert payload["tech_stack"]["languages"] == ["Python"]
