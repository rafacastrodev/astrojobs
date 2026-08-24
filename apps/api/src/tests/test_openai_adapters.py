from types import SimpleNamespace

from infrastructure.extraction.openai_resume_extractor import (
    OpenAIResumeExtractor,
    ResumeProfile,
)
from infrastructure.services.openai_resume_analyzer import (
    OpenAIResumeAnalyzer,
    StructuredAnalysis,
)


class _Responses:
    def __init__(self, output):
        self.output = output
        self.kwargs = None

    def parse(self, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(output_parsed=self.output)


def test_extractor_uses_structured_response_without_storage() -> None:
    responses = _Responses(ResumeProfile(summary="Engineer", skills=["Python"]))
    extractor = OpenAIResumeExtractor.__new__(OpenAIResumeExtractor)
    extractor._client = SimpleNamespace(responses=responses)

    result = extractor.extract("Engineer with Python", "resume")

    assert result["summary"] == "Engineer"
    assert responses.kwargs["text_format"] is ResumeProfile
    assert responses.kwargs["store"] is False


def test_analyzer_excludes_contact_and_full_text() -> None:
    responses = _Responses(
        StructuredAnalysis(
            score=82,
            summary="Bom currículo.",
            findings=["Inclua resultados mensuráveis."],
            technologies=["Python"],
            companies=["Astro"],
        )
    )
    analyzer = OpenAIResumeAnalyzer.__new__(OpenAIResumeAnalyzer)
    analyzer._client = SimpleNamespace(responses=responses)

    result = analyzer.analyze(
        {
            "summary": "Engineer",
            "contact": {"emails": ["private@example.com"]},
            "full_text": "private@example.com",
        },
        None,
    )

    assert result["score"] == 82
    assert "private@example.com" not in responses.kwargs["input"]
    assert responses.kwargs["store"] is False
