---
version: 1
slug: "src-routes-index-tsx"
primary_target: "src/routes/index.tsx"
related_targets: []
---

## Scope & mode

Route `/` (public, unauthenticated-first). Mode: Persuade — a first-time visitor decides whether to sign up.

## Audience, job, action

Job seeker in any field, arriving with a resume in hand, wanting to know if it will pass an ATS filter or fit a specific job before they apply. Action: sign up (open, no waitlist) or log in.

## Proof / content

No testimonials, metrics, or case studies exist — none may be fabricated. Proof comes from demonstrating the mechanism itself: a labeled-synthetic sample analysis (score + findings) shown live in the hero, not claims about it.

## Constraints (brief-pinned)

- Dark theme only — no light mode.
- Colors limited to the tokens already in `apps/web/src/styles.css` (background/foreground/card/muted/border/primary/destructive). No new hues. `destructive` (#ef4444) is the only accent, reserved for critical/failing findings.
- Must not claim auto-apply or automated job matching — not built yet.
- Header: Logo left; right side shows "Log in" / "Sign up" when signed out, a single "Dashboard" button when signed in (resolved client-side, non-blocking).

## Chosen direction

**Split-flap departures board** (won a fused-challenger duel against 6 catalog challengers on audience identification + product clarity, run via `concept-seed.mjs`, seed `8bfa6270`, chosen challenger `signals-instruments-split-flap-concourse`; assigned-by-roll direction `pre-internet job-application desk` lost on product clarity and was not built).

### Direction contract

THESIS: the scan resolves like an airport departures board — every finding is a row that lands with a mechanical character-flip, never a soft fade; refuses the generic centered-headline-plus-gradient SaaS hero.
OWN-WORLD: matte near-black board using only the existing `background`/`card`/`border` tokens; fixed-cell characters in `foreground`/`muted-foreground`; findings render as ruled rows; `destructive` red restyles a row (never a new amber/warning hue) for a critical finding only.
STORY: visitor sees their resume's score resolve character-by-character into a live sample board, understands the mechanism (AI-scored ATS/job-fit analysis with itemized findings) in one viewport, and signs up.
FIRST VIEWPORT: fixed-cell flap headline at top resolving on load; subhead beneath; a live-looking sample score board (score + 3-4 flap-cascading finding rows, one marked critical in `destructive` red) as the hero's proof-of-mechanism; primary CTA ("Sign up") below the board, secondary "Log in" link.
FORM: split-flap concourse board, candidate built via `concept-seed.mjs --scope direction --mode persuade`, seed key `8bfa6270`, chosen challenger `signals-instruments-split-flap-concourse`.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Memorable moment

The hero's sample board resolving in a cascading character-flip on load/scroll-into-view — the one signature interaction the page is built around.

## Unresolved / left to build phase

- Exact type pairing (mechanical flap-numeral face for the board + a quiet grotesk for body copy) — chosen in the build, not the direction round.
- Copy for headline/subhead/section content.
