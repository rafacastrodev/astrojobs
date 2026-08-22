import json
import logging
from typing import Any

import boto3
from botocore.config import Config

from domain.analysis.analyzer import AnalysisResult
from domain.analysis.errors import AnalyzerConfigurationError, AnalyzerError
from infrastructure.database.config import settings

logger = logging.getLogger(__name__)

_TOOL_NAME = "submit_resume_analysis"

_TOOL_CONFIG = {
    "tools": [
        {
            "toolSpec": {
                "name": _TOOL_NAME,
                "description": (
                    "Submit the structured result of analyzing a resume for "
                    "ATS-friendliness and, optionally, fit against a job."
                ),
                "inputSchema": {
                    "json": {
                        "type": "object",
                        "properties": {
                            "score": {
                                "type": "integer",
                                "minimum": 0,
                                "maximum": 100,
                                "description": "Overall score from 0 (poor) to 100 (excellent).",
                            },
                            "summary": {
                                "type": "string",
                                "description": "One or two sentence overall verdict.",
                            },
                            "findings": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": (
                                    "Specific, actionable findings: problems found and "
                                    "concrete suggestions to fix them."
                                ),
                            },
                            "years_of_experience": {
                                "type": ["integer", "null"],
                                "minimum": 0,
                                "description": (
                                    "Total years of professional experience found in the "
                                    "resume, or null if it cannot be determined."
                                ),
                            },
                            "technologies": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": (
                                    "Technologies, tools, languages and frameworks "
                                    "explicitly mentioned in the resume."
                                ),
                            },
                            "companies": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": (
                                    "Names of the employers/companies the candidate worked "
                                    "at, most recent first."
                                ),
                            },
                        },
                        "required": [
                            "score",
                            "summary",
                            "findings",
                            "years_of_experience",
                            "technologies",
                            "companies",
                        ],
                    }
                },
            }
        }
    ]
}

_SYSTEM_PROMPT = """You are an ATS (Applicant Tracking System) resume reviewer.

You are given a resume as structured JSON (sections already extracted: about, \
experiences, education, structure flags). If a job is also given, it is \
structured JSON too (title, requirements, responsibilities, seniority, \
employment_type).

First extract these keywords from the resume text:
- years_of_experience: total years of professional experience, estimated from \
the dates in the experience entries. Null if it cannot be determined.
- technologies: every technology, tool, language or framework explicitly \
named in the resume.
- companies: every employer name found in the experience section, most \
recent first.

Then score the resume from 0 (poor) to 100 (excellent):
- If no job is given, score general ATS-friendliness: presence and clarity of \
key sections (about/summary, experience, education), use of concrete, \
keyword-rich language, structural completeness, and the depth/recency of the \
extracted years_of_experience, technologies and companies.
- If a job is given, score how well the resume matches that job's \
requirements and responsibilities in addition to general ATS-friendliness. \
Call out missing keywords/skills the job asks for, comparing them against the \
extracted technologies.

Always respond by calling the submit_resume_analysis tool exactly once. Never \
respond with plain text. Keep findings specific and actionable (e.g. name the \
missing keyword or the missing section), not generic advice."""


class BedrockResumeAnalyzer:
    def __init__(self) -> None:
        if not settings.bedrock_model_id:
            raise AnalyzerConfigurationError(
                "Bedrock is not configured. Set BEDROCK_MODEL_ID."
            )
        self._model_id = settings.bedrock_model_id
        self._client = boto3.client(
            "bedrock-runtime",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id or None,
            aws_secret_access_key=settings.aws_secret_access_key or None,
            aws_session_token=settings.aws_session_token or None,
            config=Config(retries={"max_attempts": 5, "mode": "adaptive"}),
        )

    def analyze(self, resume: dict[str, Any], job: dict[str, Any] | None) -> AnalysisResult:
        user_text = f"Resume:\n{json.dumps(resume, ensure_ascii=True)}"
        if job is not None:
            user_text += f"\n\nJob:\n{json.dumps(job, ensure_ascii=True)}"
        else:
            user_text += "\n\nNo job given — general ATS check only."

        try:
            response = self._client.converse(
                modelId=self._model_id,
                system=[{"text": _SYSTEM_PROMPT}],
                messages=[{"role": "user", "content": [{"text": user_text}]}],
                inferenceConfig={"maxTokens": 2048, "temperature": 0.2},
                toolConfig=_TOOL_CONFIG,
            )
        except Exception as exc:
            raise AnalyzerError(f"Bedrock call failed: {exc}") from exc

        if response.get("stopReason") != "tool_use":
            raise AnalyzerError("Model did not return a structured analysis")

        blocks = response["output"]["message"]["content"]
        tool_block = next((b["toolUse"] for b in blocks if "toolUse" in b), None)
        if tool_block is None or tool_block.get("name") != _TOOL_NAME:
            raise AnalyzerError("Model did not call the expected analysis tool")

        return self._to_result(tool_block["input"])

    @staticmethod
    def _to_result(tool_input: dict[str, Any]) -> AnalysisResult:
        try:
            score = int(tool_input["score"])
            summary = str(tool_input["summary"])
            findings = [str(item) for item in tool_input["findings"]]
            years_raw = tool_input["years_of_experience"]
            years_of_experience = None if years_raw is None else int(years_raw)
            technologies = [str(item) for item in tool_input["technologies"]]
            companies = [str(item) for item in tool_input["companies"]]
        except (KeyError, TypeError, ValueError) as exc:
            raise AnalyzerError(f"Malformed analysis result from model: {exc}") from exc
        score = max(0, min(100, score))
        if years_of_experience is not None:
            years_of_experience = max(0, years_of_experience)
        return {
            "score": score,
            "summary": summary,
            "findings": findings,
            "years_of_experience": years_of_experience,
            "technologies": technologies,
            "companies": companies,
        }
