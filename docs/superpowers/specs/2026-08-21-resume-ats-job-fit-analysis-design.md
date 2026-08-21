# Resume ATS + Job-Fit Analysis Design

**Date:** 2026-08-21
**Status:** Proposed

## Summary

Let a user, on demand, ask the system to score one of their uploaded resumes: either a general ATS-friendliness check, or a fit check against a specific job (picked from the admin-curated job catalog, or pasted in as free text). Analysis is done by calling an LLM (Claude via AWS Bedrock) with the resume's already-stored structured payload as input, producing a score, a short summary, and a list of findings. Results are persisted per run so a user can see history for a resume.

This is the next slice after [2026-08-20-admin-documents-pinecone-design.md](2026-08-20-admin-documents-pinecone-design.md), which explicitly left "ATS score UI" out of scope.

## Goals

- User can trigger "Verificação geral ATS" on any of their own resumes.
- User can trigger "Comparar com vaga" against either a catalog job document or pasted job text.
- Each run returns a score (0–100), a short summary, and a bullet list of findings, and is persisted.
- User can see past analysis runs for a resume.

## Out of scope

- Fine-tuning / training a custom model. This uses an existing LLM (Claude on Bedrock) via prompting, not model training.
- Automatic analysis on upload — analysis is always user-triggered.
- Layout/formatting-based ATS checks (tables, columns, images, fonts) — input is the already-extracted structured text payload, not raw layout.
- Background job queue / async processing — the analysis call is synchronous request/response.
- Rate limiting or per-user quotas on Bedrock calls. Each click is a real, uncapped Bedrock invocation — a real cost/abuse risk, deliberately deferred.
- Editing or diffing between historical runs. Each run is an independent stored row.
- Storing raw resume/job text or file layout. Admin job documents don't currently keep their original file at all; resumes do (`storage_key`) but this design doesn't use it — see Data model.

## Architecture

New `analysis` domain, separate from `documents`, that reads resume/job data from the `documents` domain but owns its own entity, repository, and use case — same layering as `documents`.

### Backend

- `domain/analysis/`: `AnalysisEntity`; `AnalysisRepository` protocol; `ResumeAnalyzer` protocol (`analyze(resume: dict, job: dict | None) -> AnalysisResult`).
- `domain/analysis/use_cases/analyze_resume.py`: loads the resume (must belong to the requesting user), resolves the job side, calls `ResumeAnalyzer`, persists, returns the entity.
- `infrastructure/services/bedrock_resume_analyzer.py`: implements `ResumeAnalyzer` using `boto3`'s `bedrock-runtime` Converse API (already a dependency — no new SDK). Uses tool-use / a forced JSON schema (`{score, summary, findings}`) so output parsing never depends on free-text extraction.
- `infrastructure/repositories/sqlalchemy_analysis_repository.py` + new `AnalysisModel` + Alembic migration for a new `resume_analyses` table.
- `main/analysis_router.py`: new router, user-authenticated (`get_current_user`, not `require_admin`).
- `main/documents_router.py`: add `GET /documents/jobs` — same `ListDocumentsUseCase` as the admin route, but user-authenticated and returning a trimmed shape (no `payload`/`pinecone_id`/`status` internals).

No automated tests are added for this slice — the API codebase currently has none anywhere (no pytest dependency, no `test_*.py` files), so this follows existing convention rather than introducing a test framework as a side effect of one feature.

### Frontend (`apps/web`)

- `ResumeSection.tsx`: add an "Analisar" action per resume card, expanding an inline panel (no new route).
- Panel: switcher between "Verificação geral" and "Comparar com vaga"; the latter toggles between a `<select>` populated from `GET /documents/jobs` and a textarea for pasted text.
- Submit → loading state → result panel (score badge, summary, findings list). Errors shown inline with retry, reusing the existing `role="alert" text-destructive` pattern in this file.
- New `services/analysisServices.ts` + `pages/dashboard/hooks/useResumeAnalysis.ts`, mirroring `resumeServices.ts` / `useResumes.ts`.
- New types added to `pages/dashboard/types.ts`: `AnalysisResult`, `JobSummary`.

## Data model

**resume_analyses:** `id`, `user_id` (FK users, owner), `resume_document_id` (FK documents), `job_source` (`none`|`catalog`|`pasted`), `job_document_id` (FK documents, nullable), `score` (int 0–100), `summary` (text), `findings` (JSON list[str]), `created_at`.

No changes to the existing `documents` table or storage. Pasted job text is never persisted as a `documents` row — it's extracted on the fly (see below) and only its structured shape lives inside the analysis row implicitly via the prompt sent, not stored separately. `job_document_id` is null for both `"none"` and `"pasted"` sources.

## Job source resolution

Inside `AnalyzeResumeUseCase`, based on request `job_source`:

- `"none"` — no job context; prompt is ATS-only.
- `"catalog"` — loads the `DocumentEntity` (`type="job"`) by `job_document_id` via the existing `DocumentRepository`. 404 if missing or not a job document.
- `"pasted"` — request carries `job_text` (non-empty, capped length, e.g. 20,000 chars). Run the existing `HeuristicTextExtractor.extract(text, "job")` on it to get the same structured shape (`title`, `requirements`, `responsibilities`, `seniority`, `employment_type`) used for catalog jobs, so the prompt is uniform regardless of source. Not persisted as a `DocumentEntity`.

Both `AnalyzeResumeUseCase` inputs (resume and job payloads) are the structured JSON already produced by `HeuristicTextExtractor` at upload time — not raw file text. This is a real limitation (see Out of scope) accepted to avoid a storage/schema change for job documents, which don't currently keep their source file at all.

## API

- `POST /analysis/resumes/{resume_id}` — body `{job_source, job_document_id?, job_text?}` → `AnalysisResponse {id, resume_document_id, job_source, job_document_id, job_title, score, summary, findings, created_at}`. 404 if the resume doesn't belong to the caller or doesn't exist; 422 for invalid job source combinations (e.g. `catalog` without `job_document_id`, `pasted` without `job_text`, or `job_text` over the length cap); 502/503 if the Bedrock call fails (nothing persisted on failure).
- `GET /analysis/resumes/{resume_id}` — list past `AnalysisResponse` rows for that resume, newest first. 404 if the resume isn't the caller's.
- `GET /documents/jobs` — user-authenticated list of catalog jobs: `{id, title, source_filename}[]`, `title` read from `payload.title`.

## Errors

401 unauthenticated. 404 resume/job not found or not owned by caller. 422 invalid job-source combination or oversized pasted text. 502/503 when the Bedrock call itself fails (timeout, throttling, malformed structured output) — surfaced to the user as a retryable error, matching the existing `SyncConfigurationError` → 503 pattern used for Pinecone.

## Verification

Manual, matching this project's current convention (no automated test suite in `apps/api`):

- User with a resume runs "Verificação geral" → gets a score, summary, findings; row appears via `GET /analysis/resumes/{id}`.
- User picks a catalog job and runs "Comparar com vaga" → result reflects job context; `job_document_id` set on the stored row.
- User pastes job text instead → result persisted with `job_source="pasted"`, `job_document_id` null.
- Invalid combinations (catalog without id, pasted without text, oversized paste) → 422.
- Resume belonging to another user → 404.
- Simulated Bedrock failure → 502/503, no row persisted, UI shows retryable error.
