from typing import Protocol, TypedDict


class AnalysisResult(TypedDict):
    score: int
    summary: str
    findings: list[str]


class ResumeAnalyzer(Protocol):
    def analyze(self, resume: dict, job: dict | None) -> AnalysisResult: ...
