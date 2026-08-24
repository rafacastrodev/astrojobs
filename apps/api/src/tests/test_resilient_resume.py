from domain.analysis.errors import AnalyzerError
from domain.documents.errors import ExtractionServiceError
from infrastructure.extraction.resilient_resume_extractor import (
    ResilientResumeExtractor,
)
from infrastructure.services.resilient_resume_analyzer import (
    HeuristicResumeAnalyzer,
    ResilientResumeAnalyzer,
)


class _QuotaExtractor:
    def extract(self, text, doc_type):
        error = RuntimeError("quota")
        error.status_code = 429
        error.body = {"error": {"code": "insufficient_quota"}}
        raise ExtractionServiceError("OpenAI has no remaining credits") from error


class _OkExtractor:
    def extract(self, text, doc_type):
        return {"summary": "from-openai", "skills": ["Go"]}


class _FallbackExtractor:
    def extract(self, text, doc_type):
        return {"summary": "from-local", "skills": ["Python"]}


def test_resilient_extractor_falls_back_when_primary_fails():
    extractor = ResilientResumeExtractor(_QuotaExtractor(), _FallbackExtractor())
    assert extractor.extract("resume", "resume")["summary"] == "from-local"


def test_resilient_extractor_keeps_openai_result():
    extractor = ResilientResumeExtractor(_OkExtractor(), _FallbackExtractor())
    assert extractor.extract("resume", "resume")["summary"] == "from-openai"


def test_heuristic_analyzer_returns_structured_result():
    result = HeuristicResumeAnalyzer().analyze(
        {
            "summary": "Engineer with 5 years of experience",
            "skills": ["Python"],
            "experiences": [{"company": "Astro", "job_title": "Engineer"}],
            "education": ["UFPE"],
        },
        None,
    )
    assert 0 <= result["score"] <= 100
    assert result["findings"]
    assert result["technologies"] == ["Python"]
    assert result["companies"] == ["Astro"]
    assert result["years_of_experience"] == 5


def test_resilient_extractor_falls_back_on_timeout():
    class _TimeoutExtractor:
        def extract(self, text, doc_type):
            raise ExtractionServiceError("Resume extraction failed") from TimeoutError(
                "timed out"
            )

    extractor = ResilientResumeExtractor(_TimeoutExtractor(), _FallbackExtractor())
    assert extractor.extract("resume", "resume")["summary"] == "from-local"


def test_resilient_analyzer_falls_back_when_primary_fails():
    class _QuotaAnalyzer:
        def analyze(self, resume, job, retrieved_context=None):
            error = RuntimeError("quota")
            error.status_code = 429
            error.body = {"error": {"code": "insufficient_quota"}}
            raise AnalyzerError("OpenAI has no remaining credits") from error

    result = ResilientResumeAnalyzer(_QuotaAnalyzer(), HeuristicResumeAnalyzer()).analyze(
        {"summary": "Engineer", "skills": ["Python"]},
        None,
    )
    assert result["score"] >= 38
    assert result["findings"]
