# Admin Documents + Pinecone Sync Design

**Date:** 2026-08-20  
**Status:** Implemented (local SQLite + Pinecone verified; tidy-up pending)

## Summary

Add an admin dashboard to upload resumes and jobs, extract structured data with a swappable heuristic pipeline, store rows in Postgres as `draft`, then push selected/batch documents to Pinecone. Extend `users` with `role` (`user` | `admin`) and seed one hardcoded admin. JWT-gated `/admin` and admin APIs. No ATS scoring UI in this slice. Original files are discarded after extract.

## Goals

- Admins upload PDF / DOCX / TXT / MD resumes and jobs.
- Heuristic extractors produce structured JSON (modular `TextExtractor` / `FileTextLoader` for later LLM swap).
- Persist documents in Postgres; separate **Push to Pinecone** for draft (or selected) rows.
- Role-based access with a seeded hardcoded admin user.
- UI reuses existing dark Tailwind design tokens and shared components.

## Out of scope

- ATS score UI (0–100%).
- LLM extraction (interface only).
- Keeping original file bytes.
- Real admin invite / promotion UI.

## Architecture

Document store + sync queue + modular extractors (Approach 1).

### Backend

- `domain`: `Document` entity; `DocumentRepository`; `TextExtractor`; `FileTextLoader`; `Embedder` protocols.
- `application/documents`: upload → extract → persist; list; sync to Pinecone; delete.
- `infrastructure`: heuristic loaders/extractors; SQLAlchemy models; Pinecone client + embedder impl; Alembic migrations.
- `interface`: `/admin` router; `require_admin` on JWT user.

### Frontend

- `/admin` route guarded by `role === 'admin'`.
- `pages/admin/{components,hooks}` — tabs Resumes | Jobs, upload, list, select, Push to Pinecone.
- Extend `UserResponse` / `getCurrentUser` with `role`.

## Data model

**users:** add `role` (`user` | `admin`, default `user`). Seed hardcoded admin in code (`admin@astrojobs.com` / `adminadmin`).

**documents:** `id`, `type` (`resume`|`job`), `payload` (JSON), `source_filename`, `status` (`draft`|`synced`|`failed`), `pinecone_id` (nullable), `error_message` (nullable), `created_at`, `updated_at`.

**Resume payload:** `about`, `experiences[]`, `education[]`, `structure`, `currently_employed` — no name.  
**Job payload:** `title`, `requirements`, `responsibilities`, `seniority`, `employment_type`.

## API

- `POST /admin/documents` — multipart + `type`
- `GET /admin/documents?type=&status=`
- `GET /admin/documents/{id}`
- `POST /admin/documents/sync` — `{ ids?: number[] }`
- `DELETE /admin/documents/{id}`

## Errors

401 unauthenticated; 403 non-admin; 422 bad/unsupported extract; sync sets per-doc `failed` with summary response.

## Verification

Manual: admin reaches `/admin`; user redirected; upload → draft JSON; sync → synced; bad file → 422.
