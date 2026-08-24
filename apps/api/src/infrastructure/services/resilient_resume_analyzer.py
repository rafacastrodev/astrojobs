import logging
import re

from domain.analysis.analyzer import AnalysisResult
from domain.analysis.errors import AnalyzerError
from infrastructure.database.config import settings
from infrastructure.openai_errors import caused_by_llm_unavailability

logger = logging.getLogger(__name__)


def _strings(value: object) -> list[str]:
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    if not isinstance(value, list):
        return []
    items: list[str] = []
    for item in value:
        if isinstance(item, str) and item.strip():
            items.append(item.strip())
        elif isinstance(item, dict):
            text = " ".join(
                str(item.get(key) or "")
                for key in ("job_title", "company", "name", "description")
            ).strip()
            if text:
                items.append(text)
    return items


class HeuristicResumeAnalyzer:
    def analyze(
        self,
        resume: dict,
        job: dict | None,
        retrieved_context: list[str] | None = None,
    ) -> AnalysisResult:
        summary = str(resume.get("summary") or resume.get("about") or "").strip()
        skills = _strings(resume.get("skills"))
        experiences = resume.get("experiences") or []
        education = resume.get("education") or []
        has_experience = bool(experiences)
        has_education = bool(education)

        score = 38
        if summary:
            score += 12
        if skills:
            score += 12
        if has_experience:
            score += 18
        if has_education:
            score += 8
        if job:
            score += 6
        if retrieved_context:
            score += 4
        score = min(score, 88)

        findings: list[str] = []
        if not summary:
            findings.append("Add a short professional summary at the top of the resume.")
        if not skills:
            findings.append("List core skills as keywords so ATS parsers can match them.")
        if not has_experience:
            findings.append("Include work experience with role, company, and dates.")
        else:
            findings.append("Add measurable results and impact to experience bullets.")
        if not has_education:
            findings.append("Add an education section with institution and dates.")
        if job:
            findings.append("Mirror language from the target job description in skills and recent roles.")
        if not findings:
            findings.append("Tighten dates, titles, and keywords so ATS parsers can extract them cleanly.")

        companies: list[str] = []
        for item in experiences:
            if isinstance(item, dict):
                company = str(item.get("company") or "").strip()
                if company:
                    companies.append(company)

        years = None
        blob = " ".join([summary, *skills, *_strings(experiences)])
        match = re.search(r"\b(\d{1,2})\+?\s+years?\b", blob, flags=re.IGNORECASE)
        if match:
            years = int(match.group(1))

        return {
            "score": score,
            "summary": (
                "The resume has a readable structure for ATS parsing. "
                "Strengthen evidence, dates, and keyword coverage for a higher match."
            ),
            "findings": findings[:8],
            "years_of_experience": years,
            "technologies": skills[:20],
            "companies": companies[:12],
        }


class ResilientResumeAnalyzer:
    def __init__(self, primary, fallback):
        self._primary = primary
        self._fallback = fallback

    def analyze(
        self,
        resume: dict,
        job: dict | None,
        retrieved_context: list[str] | None = None,
    ) -> AnalysisResult:
        try:
            return self._primary.analyze(resume, job, retrieved_context)
        except AnalyzerError as exc:
            if not settings.is_development or not caused_by_llm_unavailability(exc):
                raise
            logger.warning("Primary analysis unavailable; using local analyzer")
            return self._fallback.analyze(resume, job, retrieved_context)
