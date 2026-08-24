# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Job seekers in any field or industry — no niche or geography restriction. They already have a resume and want to know how well it will perform before they send it: either a general ATS-friendliness check, or a fit check against a specific job they're targeting.

## Product Purpose

AstroJobs lets a user upload a resume and run an on-demand AI analysis of it — a general ATS-friendliness check, or a fit comparison against a job (picked from an admin-curated job catalog, or pasted as free text). Each run returns a score, a summary, and a list of concrete findings, and is persisted so the user can revisit it. Success is the user walking away with specific, actionable feedback to improve their resume before applying.

## Positioning

An AI-driven resume analyzer and job-matching product, not a resume builder/template tool or an auto-apply engine. Its core experience combines safe structured resume extraction, actionable scoring through the OpenAI API, and semantic matching against an admin-curated job catalogue stored in Pinecone.

## Operating Context

- User signs up or logs in, lands on a dashboard.
- Uploads a resume file (PDF, DOCX, TXT, or MD, up to 5MB); it gets indexed.
- Runs an analysis in one of two modes: general ATS check, or fit-check against a job — either selected from the admin-managed job catalog or pasted as free text (capped at 20,000 characters).
- Analysis is always synchronous and user-triggered — no background scanning, no auto-run on upload.
- Views the resulting score/summary/findings, can leave feedback on an analysis, and can revisit past analyses.
- Separately, an admin role manages the job catalog and (per the codebase) a training/model area — not user-facing.

## Capabilities and Constraints

- Confirmed capability today: resume upload + indexing, on-demand AI-scored ATS/job-fit analysis, analysis history, feedback on analyses.
- Explicitly **not** built yet: automated job matching, auto-apply/application automation, notifications. The product's own README describes these as part of the broader vision, but the landing page must not present them as current capability — confirmed by the user for this round.
- Signup is open to anyone today — no waitlist or invite gate.
- Project is early-stage/MVP (per repo's own CLAUDE.md); expect a small, growing feature set.
- Observed but unresolved: most UI copy is English, but at least one existing screen (the analysis mode toggle) uses Portuguese labels ("Verificação geral", "Comparar com vaga"). This is a pre-existing inconsistency, not a decision — noted so it isn't silently "fixed" or treated as a locale commitment during this work.

## Brand Commitments

- Name: AstroJobs.
- Existing mark: a simple triangular/mountain-peak glyph (`Logo` component), used at auth and dashboard screens today.
- Existing dark visual system (Tailwind tokens in `apps/web/src/styles.css`): near-black background (`#0a0a0a`), near-white foreground (`#fafafa`), card `#141414`, muted `#18181b`, border `#27272a`, primary `#fafafa` on `#0a0a0a`, destructive `#ef4444`. No other stated voice/tone commitment beyond what the current UI already does (plain, direct, professional copy).

## Evidence on Hand

No testimonials, case studies, press mentions, or usage metrics exist on hand — future work must not fabricate these. No marketing assets or screenshots exist yet beyond the live in-app UI itself.

## Product Principles

1. Only promise what's shipped — no auto-apply or matching claims until those exist.
2. Feedback is structured and specific (score + summary + findings), never vague reassurance.
3. Every analysis is on-demand and user-triggered — no background or passive scanning of a user's resume.
4. Broad by default — copy should read as usable by a candidate in any field, not a specific niche.
5. Low friction to start — signup is open today, so the CTA should invite direct action, not a waitlist.
