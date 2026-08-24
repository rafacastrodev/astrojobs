from domain.documents.technology_catalog import technologies_in_text


def test_extracts_canonical_technologies_and_aliases_from_text() -> None:
    assert technologies_in_text(
        "Worked with Python, Fast API, postgres, React.js and Amazon Web Services."
    ) == ["AWS", "FastAPI", "PostgreSQL", "React", "Python"]


def test_does_not_treat_common_lowercase_go_as_the_language() -> None:
    assert "Go" not in technologies_in_text("Ready to go from idea to production")
    assert "Go" in technologies_in_text("Production services written in Go and Golang")
