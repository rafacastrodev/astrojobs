# Resume ATS + Job-Fit Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user run an on-demand LLM analysis of one of their resumes — either a general ATS-friendliness check, or a fit check against a job (picked from the admin job catalog, or pasted as free text) — and persist each run.

**Architecture:** New `domain/analysis/` bounded context in `apps/api` that reads resume/job data from the existing `domain/documents/` context. A `ResumeAnalyzer` port is implemented by a Bedrock-backed adapter using the Converse API's tool-use feature to force structured `{score, summary, findings}` output. Results are persisted in a new `resume_analyses` table. The frontend adds an inline "Analisar" panel to the existing resume list.

**Tech Stack:** FastAPI, SQLAlchemy + Alembic, boto3 (`bedrock-runtime`), Postgres; React 19, TanStack Query, Tailwind v4 (`apps/web`).

**Spec:** [docs/superpowers/specs/2026-08-21-resume-ats-job-fit-analysis-design.md](../specs/2026-08-21-resume-ats-job-fit-analysis-design.md)

## Global Constraints

- No automated tests in this slice — the API codebase has none anywhere today (no pytest dependency, no `test_*.py` files); this plan follows that convention and uses manual/curl verification instead, per explicit user instruction.
- LLM analysis uses an existing model via prompting (Claude on AWS Bedrock, Converse API) — no fine-tuning, no custom model training.
- Analysis is always user-triggered — no auto-run on upload, no background job queue. Every step is synchronous request/response.
- Input to the LLM is the structured payload already produced by `HeuristicTextExtractor` at upload time (`about`/`experiences`/`education` for resumes; `title`/`requirements`/`responsibilities`/`seniority`/`employment_type` for jobs) — not raw file text or layout.
- Pasted job text is capped at 20,000 characters and is never persisted as a `DocumentEntity` — only its extracted `title` is denormalized onto the analysis row.
- No rate limiting / per-user quota on Bedrock calls in this slice (known, accepted risk).
- `bedrock_model_id` must be set via `BEDROCK_MODEL_ID` (empty by default) — mirrors the existing `pinecone_index_name` "empty means not configured" pattern (`apps/api/src/infrastructure/database/config.py`).

---

### Task 1: Bedrock configuration + resume analyzer service

**Files:**
- Modify: `apps/api/src/infrastructure/database/config.py`
- Modify: `.env.example`
- Modify: `docker-compose.yml`
- Create: `apps/api/src/domain/analysis/analyzer.py`
- Create: `apps/api/src/domain/analysis/errors.py`
- Create: `apps/api/src/infrastructure/services/bedrock_resume_analyzer.py`

**Interfaces:**
- Produces: `domain.analysis.analyzer.ResumeAnalyzer` (Protocol, method `analyze(resume: dict, job: dict | None) -> AnalysisResult`), `domain.analysis.analyzer.AnalysisResult` (`TypedDict` with `score: int`, `summary: str`, `findings: list[str]`), `domain.analysis.errors.AnalyzerConfigurationError`, `domain.analysis.errors.AnalyzerError`, `infrastructure.services.bedrock_resume_analyzer.BedrockResumeAnalyzer` (concrete class implementing `ResumeAnalyzer`, no-arg constructor).

- [ ] **Step 1: Add the `bedrock_model_id` setting**

In `apps/api/src/infrastructure/database/config.py`, add a field next to the existing `pinecone_*` settings (after `embedding_dimensions: int = 384`, before the `aws_region` block):

```python
    # Cross-region inference profile id, e.g. "us.anthropic.claude-sonnet-4-6".
    # Verify the current id with: aws bedrock list-foundation-models --region <region>
    bedrock_model_id: str = ""
```

- [ ] **Step 2: Wire the setting into `.env.example` and `docker-compose.yml`**

In `.env.example`, add under the `# AWS` section (after `AWS_SECRET_ACCESS_KEY=`):

```
BEDROCK_MODEL_ID=
```

In `docker-compose.yml`, add to the `api` service's `environment` list (after `- AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-}`):

```yaml
      - BEDROCK_MODEL_ID=${BEDROCK_MODEL_ID:-}
```

- [ ] **Step 3: Create the `ResumeAnalyzer` port**

Create `apps/api/src/domain/analysis/analyzer.py`:

```python
from typing import Protocol, TypedDict


class AnalysisResult(TypedDict):
    score: int
    summary: str
    findings: list[str]


class ResumeAnalyzer(Protocol):
    def analyze(self, resume: dict, job: dict | None) -> AnalysisResult: ...
```

- [ ] **Step 4: Create analysis domain errors**

Create `apps/api/src/domain/analysis/errors.py`:

```python
class AnalysisServiceError(Exception):
    pass


class InvalidJobSourceError(AnalysisServiceError):
    pass


class AnalyzerConfigurationError(AnalysisServiceError):
    pass


class AnalyzerError(AnalysisServiceError):
    pass
```

- [ ] **Step 5: Implement the Bedrock-backed analyzer**

Create `apps/api/src/infrastructure/services/bedrock_resume_analyzer.py`:

```python
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
                        },
                        "required": ["score", "summary", "findings"],
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

Score the resume from 0 (poor) to 100 (excellent):
- If no job is given, score general ATS-friendliness: presence and clarity of \
key sections (about/summary, experience, education), use of concrete, \
keyword-rich language, and structural completeness.
- If a job is given, score how well the resume matches that job's \
requirements and responsibilities in addition to general ATS-friendliness. \
Call out missing keywords/skills the job asks for.

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
        except Exception as exc:  # noqa: BLE001
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
        except (KeyError, TypeError, ValueError) as exc:
            raise AnalyzerError(f"Malformed analysis result from model: {exc}") from exc
        score = max(0, min(100, score))
        return {"score": score, "summary": summary, "findings": findings}
```

- [ ] **Step 6: Verify manually against real Bedrock**

Set `BEDROCK_MODEL_ID` in your local `.env` (verify a current id first: `aws bedrock list-foundation-models --region us-east-1 | grep -i claude`, or `aws bedrock list-inference-profiles --region us-east-1` for a cross-region `us.` prefixed id), and confirm your AWS credentials have `bedrock:InvokeModel` in that region.

Run from `apps/api`:

```bash
uv run python -c "
from infrastructure.services.bedrock_resume_analyzer import BedrockResumeAnalyzer

analyzer = BedrockResumeAnalyzer()
result = analyzer.analyze(
    {'about': 'Backend engineer', 'experiences': ['5 years Python'], 'education': ['BSc CS'], 'structure': {'has_about': True, 'has_experience': True, 'has_education': True, 'section_count': 3}},
    None,
)
print(result)
"
```

Expected: prints a dict like `{'score': 78, 'summary': '...', 'findings': ['...', '...']}` with no traceback. If credentials/model access aren't available in this environment yet, skip this manual check and rely on Task 3's end-to-end curl instead — note that explicitly if skipped.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/infrastructure/database/config.py apps/api/src/domain/analysis/analyzer.py apps/api/src/domain/analysis/errors.py apps/api/src/infrastructure/services/bedrock_resume_analyzer.py .env.example docker-compose.yml
git commit -m "feat: add Bedrock-backed resume analyzer service"
```

---

### Task 2: Analysis domain entity, repository, and data model

**Files:**
- Create: `apps/api/src/domain/analysis/entities.py`
- Create: `apps/api/src/domain/analysis/repository.py`
- Create: `apps/api/src/infrastructure/models/analysis_model.py`
- Modify: `apps/api/src/infrastructure/models/__init__.py`
- Create: `apps/api/migrations/versions/<autogenerated>_add_resume_analyses_table.py` (via `alembic revision --autogenerate`)
- Create: `apps/api/src/infrastructure/repositories/sqlalchemy_analysis_repository.py`

**Interfaces:**
- Consumes: nothing from Task 1 (this task is independent domain/data-model work).
- Produces: `domain.analysis.entities.AnalysisEntity` (dataclass: `id: int | None`, `user_id: int`, `resume_document_id: int`, `job_source: Literal["none","catalog","pasted"]`, `job_document_id: int | None`, `job_title: str | None`, `score: int`, `summary: str`, `findings: list[str]`, `created_at: datetime`), `domain.analysis.entities.JobSource` (the `Literal` type alias), `domain.analysis.repository.AnalysisRepository` (Protocol with `create(...)` and `list_by_resume(resume_document_id, user_id)`), `infrastructure.repositories.sqlalchemy_analysis_repository.SqlAlchemyAnalysisRepository` (concrete repo, constructor `(session: Session)`).

- [ ] **Step 1: Create the `AnalysisEntity`**

Create `apps/api/src/domain/analysis/entities.py`:

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

JobSource = Literal["none", "catalog", "pasted"]


@dataclass
class AnalysisEntity:
    id: int | None
    user_id: int
    resume_document_id: int
    job_source: JobSource
    job_document_id: int | None
    job_title: str | None
    score: int
    summary: str
    findings: list[str]
    created_at: datetime
```

- [ ] **Step 2: Create the `AnalysisRepository` protocol**

Create `apps/api/src/domain/analysis/repository.py`:

```python
from collections.abc import Sequence
from typing import Protocol

from domain.analysis.entities import AnalysisEntity, JobSource


class AnalysisRepository(Protocol):
    def create(
        self,
        user_id: int,
        resume_document_id: int,
        job_source: JobSource,
        job_document_id: int | None,
        job_title: str | None,
        score: int,
        summary: str,
        findings: list[str],
    ) -> AnalysisEntity: ...

    def list_by_resume(
        self, resume_document_id: int, user_id: int
    ) -> Sequence[AnalysisEntity]: ...
```

- [ ] **Step 3: Create the SQLAlchemy model**

Create `apps/api/src/infrastructure/models/analysis_model.py`:

```python
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from infrastructure.database.session import Base


class AnalysisModel(Base):
    __tablename__ = "resume_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    resume_document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id"), nullable=False, index=True
    )
    job_source: Mapped[str] = mapped_column(String(20), nullable=False)
    job_document_id: Mapped[int | None] = mapped_column(
        ForeignKey("documents.id"), nullable=True
    )
    job_title: Mapped[str | None] = mapped_column(String(512), nullable=True)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    findings: Mapped[list[Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 4: Register the model on `Base`**

In `apps/api/src/infrastructure/models/__init__.py`, add the import and export so Alembic's autogenerate and `Base.metadata` pick it up:

```python
from infrastructure.models.analysis_model import AnalysisModel
from infrastructure.models.document_model import DocumentModel
from infrastructure.models.password_reset_token_model import PasswordResetTokenModel
from infrastructure.models.user_model import UserModel

__all__ = [
    "AnalysisModel",
    "DocumentModel",
    "PasswordResetTokenModel",
    "UserModel",
]
```

- [ ] **Step 5: Generate and apply the migration**

Make sure the local Postgres is up (`docker compose up -d db` from the repo root, with `.env` populated), then from `apps/api`:

```bash
uv run alembic revision --autogenerate -m "add resume_analyses table"
```

Open the generated file in `apps/api/migrations/versions/` and confirm the `upgrade()` function creates a `resume_analyses` table with columns `id, user_id, resume_document_id, job_source, job_document_id, job_title, score, summary, findings, created_at`, a foreign key from `user_id` to `users.id`, a foreign key from `resume_document_id` and `job_document_id` to `documents.id`, and indexes on `user_id` and `resume_document_id`. Adjust by hand if autogenerate missed an index or FK (compare against `apps/api/migrations/versions/3f41dae8ebfe_add_resume_ownership_to_documents.py` for the expected style). Its `down_revision` should point at the current head, `c411423c3dee`.

Apply it:

```bash
uv run alembic upgrade head
```

Expected: command exits 0, and `psql` (or any DB client) against the configured database shows a new `resume_analyses` table.

- [ ] **Step 6: Implement the repository**

Create `apps/api/src/infrastructure/repositories/sqlalchemy_analysis_repository.py`:

```python
from collections.abc import Sequence

from sqlalchemy.orm import Session

from domain.analysis.entities import AnalysisEntity, JobSource
from infrastructure.models.analysis_model import AnalysisModel


class SqlAlchemyAnalysisRepository:
    def __init__(self, session: Session):
        self._session = session

    def create(
        self,
        user_id: int,
        resume_document_id: int,
        job_source: JobSource,
        job_document_id: int | None,
        job_title: str | None,
        score: int,
        summary: str,
        findings: list[str],
    ) -> AnalysisEntity:
        model = AnalysisModel(
            user_id=user_id,
            resume_document_id=resume_document_id,
            job_source=job_source,
            job_document_id=job_document_id,
            job_title=job_title,
            score=score,
            summary=summary,
            findings=findings,
        )
        self._session.add(model)
        self._session.commit()
        self._session.refresh(model)
        return self._to_entity(model)

    def list_by_resume(
        self, resume_document_id: int, user_id: int
    ) -> Sequence[AnalysisEntity]:
        models = (
            self._session.query(AnalysisModel)
            .filter(
                AnalysisModel.resume_document_id == resume_document_id,
                AnalysisModel.user_id == user_id,
            )
            .order_by(AnalysisModel.created_at.desc())
            .all()
        )
        return [self._to_entity(model) for model in models]

    @staticmethod
    def _to_entity(model: AnalysisModel) -> AnalysisEntity:
        return AnalysisEntity(
            id=model.id,
            user_id=model.user_id,
            resume_document_id=model.resume_document_id,
            job_source=model.job_source,  # type: ignore[arg-type]
            job_document_id=model.job_document_id,
            job_title=model.job_title,
            score=model.score,
            summary=model.summary,
            findings=model.findings,
            created_at=model.created_at,
        )
```

- [ ] **Step 7: Verify manually against the local database**

From `apps/api`, with the migration applied and at least one row already in `users` and `documents` (`type='resume'`) tables (reuse ids from your local dev data — check with `psql` or via the app's own signup/upload flow):

```bash
uv run python -c "
from infrastructure.database.session import SessionLocal
from infrastructure.repositories.sqlalchemy_analysis_repository import SqlAlchemyAnalysisRepository

db = SessionLocal()
repo = SqlAlchemyAnalysisRepository(db)
created = repo.create(
    user_id=1, resume_document_id=1, job_source='none', job_document_id=None,
    job_title=None, score=80, summary='Solid resume', findings=['Add more keywords'],
)
print(created)
print(repo.list_by_resume(1, 1))
db.close()
"
```

Expected: prints the created `AnalysisEntity`, then a list containing it. Adjust the `user_id`/`resume_document_id` literals to match real rows in your local DB before running.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/domain/analysis/entities.py apps/api/src/domain/analysis/repository.py apps/api/src/infrastructure/models/analysis_model.py apps/api/src/infrastructure/models/__init__.py apps/api/src/infrastructure/repositories/sqlalchemy_analysis_repository.py apps/api/migrations/versions/
git commit -m "feat: add resume_analyses table and repository"
```

---

### Task 3: Use cases and API endpoints

**Files:**
- Create: `apps/api/src/domain/analysis/use_cases/analyze_resume.py`
- Create: `apps/api/src/domain/analysis/use_cases/list_resume_analyses.py`
- Create: `apps/api/src/infrastructure/schemas/analysis_schemas.py`
- Modify: `apps/api/src/infrastructure/schemas/document_schemas.py`
- Create: `apps/api/src/infrastructure/analysis/dependencies.py`
- Create: `apps/api/src/main/analysis_router.py`
- Modify: `apps/api/src/main/documents_router.py`
- Modify: `apps/api/src/main/server.py`

**Interfaces:**
- Consumes: `domain.analysis.analyzer.ResumeAnalyzer`, `domain.analysis.errors.{AnalyzerConfigurationError,AnalyzerError,InvalidJobSourceError}`, `infrastructure.services.bedrock_resume_analyzer.BedrockResumeAnalyzer` (Task 1); `domain.analysis.entities.{AnalysisEntity,JobSource}`, `domain.analysis.repository.AnalysisRepository`, `infrastructure.repositories.sqlalchemy_analysis_repository.SqlAlchemyAnalysisRepository` (Task 2); `domain.documents.use_cases.get_user_resume.GetUserResumeUseCase`, `domain.documents.errors.DocumentNotFoundError`, `domain.documents.repository.DocumentRepository`, `domain.documents.text_extractor.TextExtractor`, `infrastructure.extraction.heuristic_text_extractor.HeuristicTextExtractor`, `infrastructure.repositories.sqlalchemy_document_repository.SqlAlchemyDocumentRepository`, `infrastructure.users.dependencies.get_current_user`, `domain.users.entities.UserEntity` (existing).
- Produces: `domain.analysis.use_cases.analyze_resume.AnalyzeResumeUseCase` (constructor `(analysis_repository, document_repository, analyzer, extractor)`, method `execute(user_id, resume_document_id, job_source, job_document_id=None, job_text=None) -> AnalysisEntity`), `domain.analysis.use_cases.list_resume_analyses.ListResumeAnalysesUseCase` (constructor `(analysis_repository, document_repository)`, method `execute(resume_document_id, user_id) -> Sequence[AnalysisEntity]`), HTTP endpoints `POST /analysis/resumes/{resume_id}`, `GET /analysis/resumes/{resume_id}`, `GET /documents/jobs`.

- [ ] **Step 1: Implement `AnalyzeResumeUseCase`**

Create `apps/api/src/domain/analysis/use_cases/analyze_resume.py`:

```python
import logging

from domain.analysis.analyzer import ResumeAnalyzer
from domain.analysis.entities import AnalysisEntity, JobSource
from domain.analysis.errors import AnalyzerError, InvalidJobSourceError
from domain.analysis.repository import AnalysisRepository
from domain.documents.errors import DocumentNotFoundError
from domain.documents.repository import DocumentRepository
from domain.documents.text_extractor import TextExtractor
from domain.documents.use_cases.get_user_resume import GetUserResumeUseCase

logger = logging.getLogger(__name__)

MAX_PASTED_JOB_TEXT_CHARS = 20_000


class AnalyzeResumeUseCase:
    def __init__(
        self,
        analysis_repository: AnalysisRepository,
        document_repository: DocumentRepository,
        analyzer: ResumeAnalyzer,
        extractor: TextExtractor,
    ):
        self._analyses = analysis_repository
        self._documents = document_repository
        self._analyzer = analyzer
        self._extractor = extractor
        self._get_resume = GetUserResumeUseCase(document_repository)

    def execute(
        self,
        user_id: int,
        resume_document_id: int,
        job_source: JobSource,
        job_document_id: int | None = None,
        job_text: str | None = None,
    ) -> AnalysisEntity:
        resume = self._get_resume.execute(resume_document_id, user_id)

        job_payload, resolved_job_document_id, job_title = self._resolve_job(
            job_source, job_document_id, job_text
        )

        try:
            result = self._analyzer.analyze(resume.payload, job_payload)
        except AnalyzerError:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Resume analysis failed for document %s: %s", resume_document_id, exc
            )
            raise AnalyzerError(str(exc)) from exc

        return self._analyses.create(
            user_id=user_id,
            resume_document_id=resume_document_id,
            job_source=job_source,
            job_document_id=resolved_job_document_id,
            job_title=job_title,
            score=result["score"],
            summary=result["summary"],
            findings=result["findings"],
        )

    def _resolve_job(
        self,
        job_source: JobSource,
        job_document_id: int | None,
        job_text: str | None,
    ) -> tuple[dict | None, int | None, str | None]:
        if job_source == "none":
            return None, None, None

        if job_source == "catalog":
            if job_document_id is None:
                raise InvalidJobSourceError(
                    "job_document_id is required when job_source is 'catalog'"
                )
            job = self._documents.get_by_id(job_document_id)
            if job is None or job.type != "job":
                raise DocumentNotFoundError(f"Job document {job_document_id} not found")
            title = job.payload.get("title") if isinstance(job.payload, dict) else None
            return job.payload, job.id, title

        if job_source == "pasted":
            if not job_text or not job_text.strip():
                raise InvalidJobSourceError(
                    "job_text is required when job_source is 'pasted'"
                )
            if len(job_text) > MAX_PASTED_JOB_TEXT_CHARS:
                raise InvalidJobSourceError(
                    f"job_text is longer than the {MAX_PASTED_JOB_TEXT_CHARS} character limit"
                )
            try:
                payload = self._extractor.extract(job_text, "job")
            except ValueError as exc:
                raise InvalidJobSourceError(str(exc)) from exc
            title = payload.get("title") if isinstance(payload, dict) else None
            return payload, None, title

        raise InvalidJobSourceError(f"Unknown job_source '{job_source}'")
```

- [ ] **Step 2: Implement `ListResumeAnalysesUseCase`**

Create `apps/api/src/domain/analysis/use_cases/list_resume_analyses.py`:

```python
from collections.abc import Sequence

from domain.analysis.entities import AnalysisEntity
from domain.analysis.repository import AnalysisRepository
from domain.documents.repository import DocumentRepository
from domain.documents.use_cases.get_user_resume import GetUserResumeUseCase


class ListResumeAnalysesUseCase:
    def __init__(
        self,
        analysis_repository: AnalysisRepository,
        document_repository: DocumentRepository,
    ):
        self._analyses = analysis_repository
        self._get_resume = GetUserResumeUseCase(document_repository)

    def execute(self, resume_document_id: int, user_id: int) -> Sequence[AnalysisEntity]:
        self._get_resume.execute(resume_document_id, user_id)
        return self._analyses.list_by_resume(resume_document_id, user_id)
```

- [ ] **Step 3: Add response/request schemas**

Create `apps/api/src/infrastructure/schemas/analysis_schemas.py`:

```python
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class AnalyzeResumeRequest(BaseModel):
    job_source: Literal["none", "catalog", "pasted"]
    job_document_id: int | None = None
    job_text: str | None = None


class AnalysisResponse(BaseModel):
    id: int
    resume_document_id: int
    job_source: Literal["none", "catalog", "pasted"]
    job_document_id: int | None
    job_title: str | None
    score: int
    summary: str
    findings: list[str]
    created_at: datetime
```

In `apps/api/src/infrastructure/schemas/document_schemas.py`, add (this belongs with the other document-facing schemas, not analysis, since it's about listing catalog job documents):

```python
class JobSummaryResponse(BaseModel):
    id: int
    title: str
    source_filename: str
```

- [ ] **Step 4: Add the DI wiring module**

Create `apps/api/src/infrastructure/analysis/dependencies.py`:

```python
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from domain.analysis.use_cases.analyze_resume import AnalyzeResumeUseCase
from domain.analysis.use_cases.list_resume_analyses import ListResumeAnalysesUseCase
from infrastructure.database.config import settings
from infrastructure.database.session import get_db
from infrastructure.extraction.heuristic_text_extractor import HeuristicTextExtractor
from infrastructure.repositories.sqlalchemy_analysis_repository import (
    SqlAlchemyAnalysisRepository,
)
from infrastructure.repositories.sqlalchemy_document_repository import (
    SqlAlchemyDocumentRepository,
)
from infrastructure.services.bedrock_resume_analyzer import BedrockResumeAnalyzer


def get_analyze_resume_use_case(db: Session = Depends(get_db)) -> AnalyzeResumeUseCase:
    if not settings.bedrock_model_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Resume analysis is not configured",
        )
    return AnalyzeResumeUseCase(
        SqlAlchemyAnalysisRepository(db),
        SqlAlchemyDocumentRepository(db),
        BedrockResumeAnalyzer(),
        HeuristicTextExtractor(),
    )


def get_list_resume_analyses_use_case(
    db: Session = Depends(get_db),
) -> ListResumeAnalysesUseCase:
    return ListResumeAnalysesUseCase(
        SqlAlchemyAnalysisRepository(db), SqlAlchemyDocumentRepository(db)
    )
```

- [ ] **Step 5: Add the analysis router**

Create `apps/api/src/main/analysis_router.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, status

from domain.analysis.entities import AnalysisEntity
from domain.analysis.errors import AnalyzerConfigurationError, AnalyzerError, InvalidJobSourceError
from domain.analysis.use_cases.analyze_resume import AnalyzeResumeUseCase
from domain.analysis.use_cases.list_resume_analyses import ListResumeAnalysesUseCase
from domain.documents.errors import DocumentNotFoundError
from domain.users.entities import UserEntity
from infrastructure.analysis.dependencies import (
    get_analyze_resume_use_case,
    get_list_resume_analyses_use_case,
)
from infrastructure.schemas.analysis_schemas import AnalysisResponse, AnalyzeResumeRequest
from infrastructure.users.dependencies import get_current_user

router = APIRouter(prefix="/analysis", tags=["analysis"])


def _to_response(analysis: AnalysisEntity) -> AnalysisResponse:
    return AnalysisResponse(
        id=analysis.id,  # type: ignore[arg-type]
        resume_document_id=analysis.resume_document_id,
        job_source=analysis.job_source,
        job_document_id=analysis.job_document_id,
        job_title=analysis.job_title,
        score=analysis.score,
        summary=analysis.summary,
        findings=analysis.findings,
        created_at=analysis.created_at,
    )


@router.post(
    "/resumes/{resume_id}", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED
)
def analyze_resume(
    resume_id: int,
    body: AnalyzeResumeRequest,
    user: UserEntity = Depends(get_current_user),
    use_case: AnalyzeResumeUseCase = Depends(get_analyze_resume_use_case),
) -> AnalysisResponse:
    try:
        analysis = use_case.execute(
            user_id=user.id,
            resume_document_id=resume_id,
            job_source=body.job_source,
            job_document_id=body.job_document_id,
            job_text=body.job_text,
        )
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except InvalidJobSourceError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except AnalyzerConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except AnalyzerError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    return _to_response(analysis)


@router.get("/resumes/{resume_id}", response_model=list[AnalysisResponse])
def list_resume_analyses(
    resume_id: int,
    user: UserEntity = Depends(get_current_user),
    use_case: ListResumeAnalysesUseCase = Depends(get_list_resume_analyses_use_case),
) -> list[AnalysisResponse]:
    try:
        analyses = use_case.execute(resume_id, user.id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [_to_response(analysis) for analysis in analyses]
```

- [ ] **Step 6: Add `GET /documents/jobs` to the existing documents router**

In `apps/api/src/main/documents_router.py`, add these imports (extend the existing `from domain.documents.entities import DocumentEntity` line stays as-is; add new ones):

```python
from domain.documents.use_cases.list_documents import ListDocumentsUseCase
from infrastructure.documents.dependencies import get_list_documents_use_case
from infrastructure.schemas.document_schemas import JobSummaryResponse, ResumeResponse
```

(This replaces the existing `from infrastructure.schemas.document_schemas import ResumeResponse` line — add `JobSummaryResponse` to the same import.)

Then add the route and its helper at the end of the file:

```python
@router.get("/jobs", response_model=list[JobSummaryResponse])
def list_catalog_jobs(
    user: UserEntity = Depends(get_current_user),
    use_case: ListDocumentsUseCase = Depends(get_list_documents_use_case),
) -> list[JobSummaryResponse]:
    documents = use_case.execute(doc_type="job")
    return [
        JobSummaryResponse(
            id=document.id,  # type: ignore[arg-type]
            title=_job_title(document),
            source_filename=document.source_filename,
        )
        for document in documents
    ]


def _job_title(document: DocumentEntity) -> str:
    title = document.payload.get("title") if isinstance(document.payload, dict) else None
    return title if isinstance(title, str) and title.strip() else document.source_filename
```

- [ ] **Step 7: Register the new router**

In `apps/api/src/main/server.py`, add the import and registration:

```python
from main.analysis_router import router as analysis_router
```

(alongside the existing router imports), and:

```python
app.include_router(analysis_router)
```

(alongside the existing `app.include_router(...)` calls).

- [ ] **Step 8: Verify manually end-to-end**

Start the API from `apps/api`:

```bash
uv run uvicorn main.server:app --app-dir src --reload
```

In another terminal, log in as a test user to get the `jwt` cookie (reuse whatever local login flow/credentials you already use for this repo), then, with a resume you've uploaded via the existing `/documents/resumes` endpoint (note its `id`):

```bash
# General ATS check
curl -i -b "jwt=<token>" -X POST http://localhost:8000/analysis/resumes/<resume_id> \
  -H "Content-Type: application/json" \
  -d '{"job_source": "none"}'

# History
curl -s -b "jwt=<token>" http://localhost:8000/analysis/resumes/<resume_id>

# Catalog job list
curl -s -b "jwt=<token>" http://localhost:8000/documents/jobs

# Pasted job text
curl -i -b "jwt=<token>" -X POST http://localhost:8000/analysis/resumes/<resume_id> \
  -H "Content-Type: application/json" \
  -d '{"job_source": "pasted", "job_text": "Title: Backend Engineer\n\nRequirements:\n- Python\n- SQL"}'

# Error cases
curl -i -b "jwt=<token>" -X POST http://localhost:8000/analysis/resumes/999999 \
  -H "Content-Type: application/json" -d '{"job_source": "none"}'   # expect 404
curl -i -b "jwt=<token>" -X POST http://localhost:8000/analysis/resumes/<resume_id> \
  -H "Content-Type: application/json" -d '{"job_source": "catalog"}'  # expect 422
```

Expected: first call returns `201` with a JSON body containing `score`/`summary`/`findings`; the history call returns a list containing it; the jobs call returns the admin-curated job catalog (`[]` if none uploaded yet); the pasted-text call returns `201` with `job_source: "pasted"` and a non-null `job_title`; the two error calls return `404` and `422` respectively.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/domain/analysis/use_cases/ apps/api/src/infrastructure/schemas/analysis_schemas.py apps/api/src/infrastructure/schemas/document_schemas.py apps/api/src/infrastructure/analysis/dependencies.py apps/api/src/main/analysis_router.py apps/api/src/main/documents_router.py apps/api/src/main/server.py
git commit -m "feat: add resume analysis API endpoints"
```

---

### Task 4: Frontend — analysis panel on the dashboard

**Files:**
- Modify: `apps/web/src/pages/dashboard/types.ts`
- Create: `apps/web/src/services/analysisServices.ts`
- Create: `apps/web/src/pages/dashboard/hooks/useResumeAnalysis.ts`
- Create: `apps/web/src/pages/dashboard/components/AnalysisPanel.tsx`
- Modify: `apps/web/src/pages/dashboard/components/ResumeSection.tsx`

**Interfaces:**
- Consumes: `POST /analysis/resumes/{resume_id}`, `GET /documents/jobs` (Task 3); existing `api` client (`apps/web/src/utils/api/client.ts`), `getApiErrorMessage` (`apps/web/src/utils/api/errors.ts`), `Button` (`apps/web/src/components/Button/index.tsx`).
- Produces: `AnalysisResult`, `JobSummary`, `JobSource` types (`apps/web/src/pages/dashboard/types.ts`); `analysisServices.analyze(resumeId, payload)` and `analysisServices.listJobs()` (`apps/web/src/services/analysisServices.ts`); `useResumeAnalysis(resumeId)` hook; `<AnalysisPanel resumeId={number} />` component.

- [ ] **Step 1: Add the frontend types**

In `apps/web/src/pages/dashboard/types.ts`, append:

```ts
export type JobSource = 'none' | 'catalog' | 'pasted'

export type AnalysisResult = {
  id: number
  resume_document_id: number
  job_source: JobSource
  job_document_id: number | null
  job_title: string | null
  score: number
  summary: string
  findings: string[]
  created_at: string
}

export type JobSummary = {
  id: number
  title: string
  source_filename: string
}
```

- [ ] **Step 2: Add the analysis service**

Create `apps/web/src/services/analysisServices.ts`:

```ts
import type { JobSource, JobSummary, AnalysisResult } from '@/pages/dashboard/types'
import { api } from '@/utils/api/client'

type AnalyzeResumePayload = {
  job_source: JobSource
  job_document_id?: number
  job_text?: string
}

async function analyze(resumeId: number, payload: AnalyzeResumePayload) {
  const response = await api.post<AnalysisResult>(`/analysis/resumes/${resumeId}`, payload)
  return response.data
}

async function listJobs() {
  const response = await api.get<JobSummary[]>('/documents/jobs')
  return response.data
}

export const analysisServices = {
  analyze,
  listJobs,
}
```

- [ ] **Step 3: Add the `useResumeAnalysis` hook**

Create `apps/web/src/pages/dashboard/hooks/useResumeAnalysis.ts`:

```ts
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { analysisServices } from '@/services/analysisServices'
import { getApiErrorMessage } from '@/utils'

import type { JobSource } from '../types'

type Mode = 'ats' | 'job'
type JobInputMode = 'catalog' | 'pasted'

export const useResumeAnalysis = (resumeId: number) => {
  const [mode, setMode] = useState<Mode>('ats')
  const [jobInputMode, setJobInputMode] = useState<JobInputMode>('catalog')
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)
  const [pastedText, setPastedText] = useState('')

  const jobs = useQuery({
    queryKey: ['catalog-jobs'],
    queryFn: analysisServices.listJobs,
    enabled: mode === 'job' && jobInputMode === 'catalog',
  })

  const analyze = useMutation({
    mutationFn: () => {
      const jobSource: JobSource =
        mode === 'ats' ? 'none' : jobInputMode === 'catalog' ? 'catalog' : 'pasted'
      return analysisServices.analyze(resumeId, {
        job_source: jobSource,
        job_document_id: jobSource === 'catalog' ? (selectedJobId ?? undefined) : undefined,
        job_text: jobSource === 'pasted' ? pastedText : undefined,
      })
    },
  })

  const canSubmit =
    mode === 'ats' ||
    (jobInputMode === 'catalog' && selectedJobId !== null) ||
    (jobInputMode === 'pasted' && pastedText.trim().length > 0)

  return {
    mode,
    setMode,
    jobInputMode,
    setJobInputMode,
    selectedJobId,
    setSelectedJobId,
    pastedText,
    setPastedText,
    jobs: Array.isArray(jobs.data) ? jobs.data : [],
    jobsLoading: jobs.isLoading,
    canSubmit,
    run: () => analyze.mutate(),
    isAnalyzing: analyze.isPending,
    result: analyze.data ?? null,
    error: analyze.isError ? getApiErrorMessage(analyze.error) : null,
  }
}
```

- [ ] **Step 4: Add the `AnalysisPanel` component**

Create `apps/web/src/pages/dashboard/components/AnalysisPanel.tsx`:

```tsx
import { Button } from '@/components/Button'

import { useResumeAnalysis } from '../hooks/useResumeAnalysis'

type AnalysisPanelProps = {
  resumeId: number
}

export const AnalysisPanel = ({ resumeId }: AnalysisPanelProps) => {
  const {
    mode,
    setMode,
    jobInputMode,
    setJobInputMode,
    selectedJobId,
    setSelectedJobId,
    pastedText,
    setPastedText,
    jobs,
    jobsLoading,
    canSubmit,
    run,
    isAnalyzing,
    result,
    error,
  } = useResumeAnalysis(resumeId)

  return (
    <div className="mt-4 rounded-lg border border-border bg-input/40 p-4">
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode('ats')}
          className={`cursor-pointer rounded-md px-3 py-1.5 ${
            mode === 'ats'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent text-muted-foreground'
          }`}
        >
          Verificação geral
        </button>
        <button
          type="button"
          onClick={() => setMode('job')}
          className={`cursor-pointer rounded-md px-3 py-1.5 ${
            mode === 'job'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent text-muted-foreground'
          }`}
        >
          Comparar com vaga
        </button>
      </div>

      {mode === 'job' ? (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex gap-3 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => setJobInputMode('catalog')}
              className={`cursor-pointer ${jobInputMode === 'catalog' ? 'font-semibold text-card-foreground' : ''}`}
            >
              Escolher vaga cadastrada
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setJobInputMode('pasted')}
              className={`cursor-pointer ${jobInputMode === 'pasted' ? 'font-semibold text-card-foreground' : ''}`}
            >
              Colar descrição
            </button>
          </div>

          {jobInputMode === 'catalog' ? (
            <select
              value={selectedJobId ?? ''}
              onChange={(event) =>
                setSelectedJobId(event.target.value ? Number(event.target.value) : null)
              }
              className="rounded-md border border-border bg-card p-2 text-sm text-card-foreground"
            >
              <option value="">{jobsLoading ? 'Carregando vagas…' : 'Selecione uma vaga'}</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          ) : (
            <textarea
              value={pastedText}
              onChange={(event) => setPastedText(event.target.value)}
              placeholder="Cole aqui a descrição da vaga"
              rows={4}
              className="rounded-md border border-border bg-card p-2 text-sm text-card-foreground"
            />
          )}
        </div>
      ) : null}

      <div className="mt-4 w-40">
        <Button
          type="button"
          onClick={run}
          isLoading={isAnalyzing}
          disabled={!canSubmit}
          className="!py-2 text-sm"
        >
          Analisar
        </Button>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-lg border border-border bg-card p-4">
          <p className="text-2xl font-semibold text-card-foreground">{result.score}/100</p>
          <p className="mt-1 text-sm text-muted-foreground">{result.summary}</p>
          <ul className="mt-3 flex flex-col gap-1 text-sm text-card-foreground">
            {result.findings.map((finding, index) => (
              <li key={index}>• {finding}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 5: Wire it into `ResumeSection`**

In `apps/web/src/pages/dashboard/components/ResumeSection.tsx`:

Add imports:

```ts
import { AnalysisPanel } from './AnalysisPanel'
```

Add local state inside the `ResumeSection` component body (alongside the existing `isDraggingOver` state):

```ts
const [expandedResumeId, setExpandedResumeId] = useState<number | null>(null)
```

Replace the `<li>` block (currently: a `flex flex-col ... sm:flex-row` `<li>` with the filename/status `<div>` and the `Remove` `<button>` as direct siblings) with:

```tsx
<li
  key={resume.id}
  className="rounded-xl border border-border p-4"
>
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <p className="truncate font-medium text-card-foreground">
        {resume.source_filename}
      </p>
      <p className="text-sm text-muted-foreground">
        {STATUS_LABELS[resume.status]} ·{' '}
        {new Date(resume.created_at).toLocaleDateString()}
      </p>
    </div>
    <div className="flex shrink-0 gap-4">
      <button
        type="button"
        onClick={() =>
          setExpandedResumeId(expandedResumeId === resume.id ? null : resume.id)
        }
        className="cursor-pointer text-sm text-muted-foreground transition hover:text-card-foreground"
      >
        {expandedResumeId === resume.id ? 'Fechar' : 'Analisar'}
      </button>
      <button
        type="button"
        onClick={() => handleDelete(resume.id)}
        disabled={deletingId === resume.id}
        className="cursor-pointer text-sm text-muted-foreground transition hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
      >
        {deletingId === resume.id ? 'Removing…' : 'Remove'}
      </button>
    </div>
  </div>
  {expandedResumeId === resume.id ? <AnalysisPanel resumeId={resume.id} /> : null}
</li>
```

(Keep the surrounding `<ul>`/`.map()` structure as-is — only the `<li>` body changes.)

- [ ] **Step 6: Verify manually in the browser**

From `apps/web`, run `pnpm dev` (with the API from Task 3 running and `VITE_API_URL` pointed at it), log into the dashboard, and:

1. Click "Analisar" on a resume → the panel expands with "Verificação geral" selected by default.
2. Click the "Analisar" submit button → loading state shows, then a score/summary/findings panel appears below.
3. Switch to "Comparar com vaga" → "Escolher vaga cadastrada" → confirm the `<select>` lists jobs from `GET /documents/jobs` (or shows "Selecione uma vaga" if the catalog is empty); pick one and submit → result reflects the job.
4. Switch to "Colar descrição", paste a short job description, submit → result reflects the pasted job; the submit button stays disabled until text is entered.
5. Click "Fechar" → panel collapses; reopening resets to the default "Verificação geral" state.
6. Force an error (e.g. stop the API mid-flow) → the red inline error message appears instead of a crash.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/dashboard/types.ts apps/web/src/services/analysisServices.ts apps/web/src/pages/dashboard/hooks/useResumeAnalysis.ts apps/web/src/pages/dashboard/components/AnalysisPanel.tsx apps/web/src/pages/dashboard/components/ResumeSection.tsx
git commit -m "feat: add resume ATS/job-fit analysis panel to dashboard"
```
