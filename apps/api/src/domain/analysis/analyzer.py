from typing import Protocol, TypedDict


class AnalysisResult(TypedDict):
    score: int
    summary: str
    findings: list[str]
    years_of_experience: int | None
    technologies: list[str]
    companies: list[str]


class ResumeAnalyzer(Protocol):
    def analyze(self, resume: dict, job: dict | None) -> AnalysisResult: ...
