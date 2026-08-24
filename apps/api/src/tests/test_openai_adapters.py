from types import SimpleNamespace

from infrastructure.extraction.openai_resume_extractor import (
    OpenAIResumeExtractor,
    ResumeProfile,
)
from infrastructure.services.openai_resume_analyzer import (
    OpenAIResumeAnalyzer,
    StructuredAnalysis,
)


def test_extractor_sends_resume_text(monkeypatch) -> None:
    captured: dict = {}

    def fake_parse(client, *, schema, system, user, max_output_tokens):
        captured.update(
            {
                "schema": schema,
                "system": system,
                "user": user,
                "max_output_tokens": max_output_tokens,
            }
        )
        return ResumeProfile(summary="Engineer", skills=["Python"])

    monkeypatch.setattr(
        "infrastructure.extraction.openai_resume_extractor.parse_structured",
        fake_parse,
    )
    extractor = OpenAIResumeExtractor.__new__(OpenAIResumeExtractor)
    extractor._client = SimpleNamespace()

    result = extractor.extract("Engineer with Python", "resume")

    assert result["summary"] == "Engineer"
    assert captured["schema"] is ResumeProfile
    assert "Engineer with Python" in captured["user"]


def test_analyzer_excludes_contact_and_full_text(monkeypatch) -> None:
    captured: dict = {}

    def fake_parse(client, *, schema, system, user, max_output_tokens):
        captured["schema"] = schema
        captured["user"] = user
        return StructuredAnalysis(
            score=82,
            summary="Bom currículo.",
            findings=["Inclua resultados mensuráveis."],
            technologies=["Python"],
            companies=["Astro"],
        )

    monkeypatch.setattr(
        "infrastructure.services.openai_resume_analyzer.parse_structured",
        fake_parse,
    )
    analyzer = OpenAIResumeAnalyzer.__new__(OpenAIResumeAnalyzer)
    analyzer._client = SimpleNamespace()

    result = analyzer.analyze(
        {
            "summary": "Engineer",
            "contact": {"emails": ["private@example.com"]},
            "full_text": "private@example.com",
        },
        None,
        ["Python engineer, 5 years, remote"],
    )

    assert result["score"] == 82
    assert "private@example.com" not in captured["user"]
    assert "Python engineer, 5 years, remote" in captured["user"]
    assert captured["schema"] is StructuredAnalysis
