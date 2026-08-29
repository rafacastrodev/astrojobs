# AstroJobs

AstroJobs is an AI-first hiring platform. Professionals upload a resume, the system extracts and scores it, and they get ranked job matches they can apply to. Recruiters publish job openings, receive ranked candidates, and move applications through a status pipeline.

The project is no longer deployed. The AWS deploy workflow is disabled (`.github/workflows/ci.yml` is `workflow_dispatch` only, with the job gated by `if: false`), so nothing ships on push to `main`. The code, the infrastructure scripts, and the test suites remain in the repository as the record of what was built.

---

## What was built

### Accounts and roles

Two profile types, `professional` and `recruiter`, decided at signup and enforced end to end. Authentication is email/password with a JWT stored in an HTTP-only cookie; every protected endpoint resolves the current user from that cookie and every recruiter operation additionally checks that the caller owns the resource it touches. Password reset works through a single-use token table with expiry. Users have a profile (username, headline, seniority, region, technologies) and an avatar stored in S3, plus an onboarding flow that runs once and is tracked by a database flag.

### Resume ingestion and analysis

The upload path is a single use case that runs a fixed sequence before anything reaches an LLM:

1. **File validation** — extension allowlist (PDF, DOCX, TXT, MD), magic-byte check that the content matches the extension, PDF scanned for `/JavaScript`, `/EmbeddedFile` and `/Launch` markers, DOCX inspected as a zip for entry-count, uncompressed-size and compression-ratio limits (zip-bomb defence), size cap from `MAX_UPLOAD_BYTES`.
2. **Storage first** — the file goes to S3 before the database row is created, so a storage failure never leaves a document pointing at a missing object.
3. **Text extraction** — a loader per format, then a structured extractor.
4. **PII redaction** — emails, phone numbers, government IDs, postal codes, links and addresses are stripped by regex before any text is sent to a model.
5. **Content safety** — the redacted text goes through a moderation check.
6. **Analysis** — the LLM returns an ATS score, ATS category, summary, findings, experiences, technologies and companies.
7. **Indexing** — the resume text is embedded and upserted into the vector store.

Deduplication is by content hash, so re-uploading the same file returns the existing document instead of paying for extraction again. Each stage records its own state, which is what makes the retry endpoint (`POST /documents/resumes/{id}/process`) possible: a failed analysis or a failed index can be re-run without asking the user to upload the file a second time.

### Jobs, matching and applications

Recruiters create jobs with title, technologies, seniority, work arrangement, region, contract type and description. Technologies are not free text — they are resolved against a canonical catalog with alias normalisation, so "React.js", "reactjs" and "React" collapse to one token and matching stays comparable across records. Regions come from a catalog served by the API.

Matching runs in both directions from the same scoring code: `GET /documents/resumes/{id}/matches` for a professional and `GET /recruiter/matches` for a recruiter. The score combines vector similarity, technology overlap, and a title-similarity term, then applies hard filters (seniority, work arrangement, region, contract type) and overlays the user's own profile preferences on top of what the resume says.

Applications link a professional, a recruiter-owned job and a specific resume. A database unique constraint prevents duplicate applications; the use case additionally verifies the job is still open and the resume belongs to the caller. Status moves through a controlled set (`submitted`, `reviewing`, `accepted`, `rejected`) and each change is validated and recorded. Status changes push a real-time notification to the candidate through Liveblocks, published only after the transaction commits so a rolled-back update can never notify.

### Analysis feedback loop

Users rate an analysis (`PUT /analysis/{id}/feedback`), and a dataset export pairs each reviewed analysis with the exact input that produced it. An analysis is exported only when its input can be rebuilt byte-for-byte; pasted job descriptions are never stored and documents can be deleted, so those rows are reported as *skipped* rather than exported against a guessed input. That keeps the dataset usable for future fine-tuning instead of quietly poisoning it.

---

## How it was built

### Repository layout

pnpm workspace monorepo:

```
apps/web     TanStack Start + React 19 frontend
apps/api     FastAPI backend (uv)
e2e          Playwright suite driving the real stack
migrations   Alembic revisions (under apps/api)
scripts      deploy-ci.sh / deploy-host.sh
docs         requirements, tech stack, next steps
```

A monorepo means the API's OpenAPI schema and the frontend's generated TypeScript types live in the same commit, so a contract change and its consumer never drift.

### Backend architecture

`apps/api/src` is split into `domain` and `infrastructure`, with `main` holding only the HTTP routers.

- **`domain/*`** — entities, errors, repository *ports* (Protocols) and one file per use case. No SQLAlchemy, no boto3, no HTTP. `UploadResumeUseCase` receives a `FileStoragePort`, a `PiiRedactor`, a `ContentSafetyChecker` and a `ResumeAnalyzer` as constructor arguments and knows nothing about S3, regex or OpenAI.
- **`infrastructure/*`** — the adapters that satisfy those ports: SQLAlchemy repositories, S3 storage, OpenAI/Gemini clients, Pinecone and pgvector stores, Liveblocks publisher, JWT and hashing.
- **`main/*`** — four routers (`auth`, `admin`, `documents`, `analysis`) that wire dependencies through FastAPI's DI and translate domain errors into HTTP status codes.

The payoff is the test suite: use cases are tested against in-memory fakes, so 163 backend tests run in about a second with no database, no network and no API keys.

### Provider selection at runtime

A factory (`infrastructure/vector/factory.py`) picks implementations from configuration rather than hardcoding a vendor:

- **Embeddings** — `EMBEDDING_PROVIDER=auto` resolves to Gemini if a Gemini key is present, else OpenAI, else a local deterministic embedder. Tests and offline development take the local path.
- **Vector store** — pgvector when running against Postgres locally, Pinecone in production.
- **Retrieval context** — Bedrock Knowledge Base if a KB id is configured, otherwise an AgentCore Gateway URL, otherwise nothing.

Every LLM-backed component also has a heuristic fallback (`HeuristicResumeAnalyzer`, `ResilientResumeExtractor`): when the model errors, times out or returns unparseable JSON, the request still produces a scored, structured result instead of a 500.

### Database and migrations

PostgreSQL with the `pgvector` extension, SQLAlchemy models, Alembic for schema history — 18 revisions, each additive and each with a downgrade path, covering the schema as it grew: resume ownership, analyses, applications, the offers table, job closure, content hashes and their backfill, ATS processing states, extracted keywords, onboarding status, unique usernames, role renames to `professional`/`recruiter`, and cascade rules so deleting a document removes its analyses.

### Frontend architecture

TanStack Start (React 19) with file-based routing. Routes in `src/routes` stay thin — each one mounts a page from `src/pages/<page>`, and every page owns its `components/`, `hooks/` and `utils/`. Shared UI lives in `src/components`, API calls in `src/services`, and pure logic (validation, formatting, grouping) in `src/utils` where it can be unit-tested without rendering anything.

Server state is TanStack Query, integrated with the router for SSR through `@tanstack/react-router-ssr-query`, so loader data and the query cache are one thing. Forms are React Hook Form with Zod resolvers, and the same Zod schemas back the standalone validation tests. Styling is Tailwind CSS v4 via the Vite plugin. Liveblocks drives the notification bell.

### Testing

- **163 pytest tests** — use cases, authorization and ownership rules, the security pipeline (file validator, PII redactor, moderation), embedding payloads, matching in both directions, catalog normalisation, provider factories, notification publishing and audit regressions.
- **7 Jest suites** — password rules, API error mapping, auth schemas, job-text validation, job catalog, recruiter matching and admin audit fixes.
- **18 Playwright specs** across three flows — auth, resume, matching — run against the real API and database rather than mocks.
- **Ruff** for Python lint, **ESLint + Prettier** for TypeScript, both wired into Husky hooks.

### Infrastructure (as deployed)

Docker Compose ran three services: `pgvector/pgvector:pg17`, the FastAPI container, and an NGINX container serving the built frontend and reverse-proxying `/api` to the backend, with TLS from Let's Encrypt mounted read-only from the host. Both application services declared healthchecks and `depends_on: service_healthy`, so the frontend never came up in front of an API that could not reach the database.

Deployment used GitHub Actions with OIDC — no long-lived AWS keys in the repository. The workflow assumed an IAM role, wrote a `.env` from GitHub Secrets with `umask 077` and JSON-escaped values, then ran `scripts/deploy-ci.sh`: tar the source, upload it to S3, and drive the EC2 host through **Systems Manager Run Command** rather than SSH, so no inbound port and no deploy key were ever needed. On the host, `scripts/deploy-host.sh` rebuilt the compose project with `--wait` and then curled `/health`, `/healthz` and the TLS endpoint; a failed healthcheck failed the deploy. The workflow polled the SSM invocation and exited non-zero on anything but `Success`.

Persistent AWS pieces: **S3** for resume files and avatars, **RDS** for Postgres (`verify-full` SSL with the RDS global CA bundle), **EC2** for the application host, **Bedrock** for the LLM and retrieval path, and **Pinecone** for production vectors.

---

## Decisions and trade-offs

**Monorepo.** Backend and frontend share one repository so the API contract and its TypeScript consumer move together — `apps/web/src/types/api.d.ts` is generated from the API's OpenAPI schema. One CI pipeline covers both. The cost is tooling friction: an IDE holding Python and TypeScript in one workspace occasionally attaches the wrong language server or serves stale diagnostics until the window is reloaded.

**TanStack Start over Next.js.** The product is a client-heavy dashboard, not a content site, so server components buy little. TanStack Start on Vite keeps the router, data layer and build under direct control and stays framework-agnostic, and the static output can sit behind the same NGINX container that already terminates TLS — cheaper than a managed platform.

**FastAPI for the backend.** Pydantic validates request and response contracts and generates the OpenAPI document for free, and FastAPI's dependency injection is what makes auth, persistence and the AI services swappable in tests. Python also matches the rest of the pipeline — SQLAlchemy, embeddings, boto3 — so there is no split between a JavaScript API and a separate Python worker. The trade-off is real: running Python and TypeScript in one monorepo is more operational overhead than TypeScript alone, and it is a deliberate cost paid to keep the AI work in the ecosystem where its libraries live.

**Split storage: S3 for files, a vector database for embeddings.** Resumes are stored once and embedded once; requests carry an id rather than the document text. A Vercel AI SDK route would feel snappier, but it would resend document text on every request and give up a dedicated vector store. The cost of the split is latency — a match request touches Postgres, the vector store and, for some paths, S3.

**Vendor-neutral AI layer.** Every model call sits behind a domain port with a factory choosing the implementation and a heuristic fallback behind it. That is why the suite runs offline and why swapping Gemini for OpenAI, or Pinecone for pgvector, is a configuration change rather than a refactor. The cost is indirection: reading the analysis path means reading a port, a factory and two adapters instead of one function.

**Bedrock's free-tier models.** Cheap, and weaker than a paid frontier model — extraction and matching are less accurate than they could be. The feedback dataset export exists precisely to make that improvable later with real labelled data.

**Deployment over SSM instead of SSH.** No inbound SSH port, no deploy key, no secret in the repo — the runner assumes a short-lived role through OIDC and the host pulls its own artifact. It is slower to debug than an SSH session, and that was the accepted trade.

---

## Running it locally

```bash
cp .env.example .env
pnpm install
pnpm dev          # api on :8000, web on :3000
```

Or the full container stack:

```bash
pnpm up           # docker compose up -d --build
pnpm down
```

Tests:

```bash
cd apps/api && uv run pytest        # 163 backend tests
cd apps/web && pnpm test            # Jest
cd e2e && pnpm test                 # Playwright
```
