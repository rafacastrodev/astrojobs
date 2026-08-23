---
name: AstroJobs
description: AI-first resume analysis — upload a resume, get an AI-scored ATS/job-fit read with itemized findings.
colors:
  background: "#0a0a0a"
  foreground: "#fafafa"
  card: "#141414"
  card-foreground: "#fafafa"
  muted: "#18181b"
  muted-foreground: "#a1a1aa"
  border: "#27272a"
  input: "#18181b"
  ring: "#52525b"
  primary: "#fafafa"
  primary-foreground: "#0a0a0a"
  destructive: "#ef4444"
  destructive-foreground: "#fafafa"
typography:
  display:
    fontFamily: "Martian Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "clamp(1.25rem, 3vw, 2.25rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "normal"
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Martian Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.2em"
rounded:
  sm: "3px"
  md: "8px"
  lg: "16px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
  flap-cell:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
  flap-cell-critical:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    rounded: "{rounded.sm}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
---

# Design System: AstroJobs

## Overview

**Creative North Star: "The Departures Board"**

AstroJobs reads its own product output the way a concourse board reads a flight: a result arrives by resolving into place, one fixed-width character at a time, not by fading in. The system was chosen by running an assigned direction (drawn by lot from a grounded candidate list) against six catalog challengers on two axes — audience identification and product clarity — and the split-flap board won both outright: its mechanical, satisfying reveal is the closest visual analogue this product has to "your score is ready," and its native palette (matte near-black boards, white cells, one reserved warning color) was already the app's own dark theme before this surface existed.

The palette is deliberately narrow: the app's pre-existing near-black/near-white pair, plus the single existing `destructive` red repurposed as the board's one warning lamp. No new hues were introduced for this surface — restraint here is a constraint inherited from the product's existing screens, not a stylistic choice invented for the landing page alone.

**Key Characteristics:**
- Fixed-cell mechanical typography (Martian Mono) for anything that "resolves" — headlines, scores, status tags — set apart from ordinary prose.
- A strictly two-tone palette: near-black and near-white, with red reserved exclusively for a failing/critical signal, never decoration.
- Flat, bordered surfaces — no gradients, no glass, no soft glow shadows.
- Content structured as ruled rows (findings lists, numbered steps) rather than bordered card grids.

## Colors

The palette reads as a night concourse: matte near-black grounds, chalk-white ink, and exactly one warning lamp.

### Primary
- **Chalk White** (`#fafafa`): the ink color. Body text, headline flap-cell fill, primary button surface (inverted: white background, near-black text).

### Neutral
- **Near-Black** (`#0a0a0a`): page background — the board's housing.
- **Panel Black** (`#141414`): card and flap-cell surfaces, one step lighter than the page so panels read as distinct objects sitting on the ground.
- **Recessed Black** (`#18181b`): input fills and the muted surface tone.
- **Muted Grey** (`#a1a1aa`): secondary text — captions, subheads, finding descriptions.
- **Seam Grey** (`#27272a`): hairline borders and dividers between ruled rows.
- **Focus Grey** (`#52525b`): the focus ring color, also used as the scrollbar-thumb hover tone.

### Named Rules
**The One Warning Lamp Rule.** `destructive` (#ef4444) is the only color outside the black/white pair anywhere in the system. It marks exactly one thing: a failing or critical finding. It never decorates a heading, a hover state, or an icon that isn't reporting a failure.

## Typography

**Display Font:** Martian Mono (with ui-monospace, SFMono-Regular, monospace fallback)
**Body Font:** Hanken Grotesk (with ui-sans-serif, system-ui, sans-serif fallback)

**Character:** Martian Mono is the mechanical voice — a geometric, fixed-cell mono with a variable-width axis that reads like physical destination-board type. Hanken Grotesk is the human voice — a quiet, humanist grotesk with no display ambition of its own, so it never competes with a flap headline for attention.

### Hierarchy
- **Display** (400, `clamp(1.25rem, 3vw, 2.25rem)`, 1.1 line-height): set only inside a `FlapCell` — hero headline, the sample score, and short status/tag words ("STRONG FIT", "OK", "FIX"). Never used for a full sentence.
- **Body** (400, 1rem–1.125rem, 1.5 line-height): every sentence a visitor reads start to end — subheads, finding descriptions, section copy. Max measure kept to `max-w-md` (~65ch) in the hero and findings list.
- **Label** (400, 0.6875rem, 0.2em tracking, uppercase): small mono captions like "SAMPLE ANALYSIS — ILLUSTRATIVE" and numbered step markers ("01", "02", "03").

### Named Rules
**The Mechanical/Human Split Rule.** Martian Mono speaks only through discrete, boxed character cells. Hanken Grotesk carries every full sentence. A headline never sets in Hanken Grotesk, and a paragraph never sets in Martian Mono — swapping their jobs breaks the board metaphor.

## Layout

Content sits in a `max-w-5xl` (64rem) container, centered, with `px-4 sm:px-6` gutters. The hero is a single centered column (`max-w-2xl`) — headline, subhead, the sample board, then the primary CTA — deliberately not a two-column split, since the board reads as a fixture sitting in the middle of the page, not content pinned beside a sidebar. Section rhythm is generous: `py-16` on mobile stepping up to `py-24`/`py-32` at `sm`/`lg`. Secondary sections (How it works) return to left-aligned prose since a numbered sequence and a findings-style ruled list read better unranged than centered.

## Elevation & Depth

Flat by default — no drop shadows anywhere. Depth is conveyed by two flat layers only: the page ground (`background`) and a panel one step lighter (`card`), separated by a 1px `border`. The one departure from flat is the `FlapCell`'s internal fold: a subtle top-half gradient plus a 1px seam line at the cell's vertical center, simulating the physical crease of a real split-flap character — this is a structural device (the signature component's defining trait), not a decorative shadow, and it appears nowhere else in the system.

### Named Rules
**The No-Glow Rule.** Nothing outside a `FlapCell`'s internal seam ever carries a shadow, glow, or gradient. Depth comes from a bordered panel one tone lighter than its ground, full stop.

## Shapes

Two radius steps only. `rounded-[3px]` (sm) on every `FlapCell` — tight enough to read as a stamped mechanical part, not a soft UI chip. `rounded-lg`/`rounded-2xl` (md/lg — 8px/16px) on buttons, inputs, and card-level containers, matching the radius language already established on the app's auth screens and dashboard. No fully-rounded (pill) shapes anywhere.

## Components

### Buttons
- **Shape:** `rounded-lg` (8px).
- **Primary:** inverted fill — white background (`primary`), near-black text (`primary-foreground`), `px-5 py-2.5` padding, medium weight. Used for every "Sign up" / "Sign up free" CTA.
- **Ghost/Link:** no fill, `muted-foreground` text that brightens to `foreground` on hover — used for "Log in" wherever it sits beside a primary CTA.
- **Hover:** primary drops to `opacity-90`; ghost/link swaps text color. No transform, no shadow.

### Flap Cell (signature component)
- **Shape:** fixed `1.05em × 1.6em` bordered cell, `rounded-[3px]`, border in `border`, fill in `card` (or `destructive` fill/`destructive` border+text at 10–40% opacity for a critical row).
- **Behavior:** on entering view (once, via IntersectionObserver — never on every scroll), each cell cycles 3–5 random characters at ~65ms per step, staggered left-to-right per word, before landing on its target character; each change plays a brief `rotateX` flip (110ms). Respects `prefers-reduced-motion`: the cycle is skipped and the cell shows its final character immediately.
- **Seam:** a 1px horizontal line at 50% height plus a soft gradient over the top half, simulating the physical fold — present on every cell, critical or not.
- **Composition:** cells group per word (never split mid-word across a wrapped line); words wrap as whole units at narrow widths.

### Cards / Panels
- **Corner Style:** `rounded-2xl` (16px).
- **Background:** `card` at full or reduced opacity (`bg-card/60` for the sample board, so the panel reads slightly recessed against the page).
- **Border:** 1px, `border` token.
- **Internal Padding:** `p-5 sm:p-6` for compact panels (sample board), `p-8` for auth-style cards elsewhere in the app.

### Findings / Ruled Rows
- **Style:** no card-per-item. Rows are separated by a single `border` hairline (`border-t`/`border-b`), not individually boxed.
- **Leading marker:** a short (2–3 char) label in a `FlapCell` row ("OK" / "FIX"), signaling status before the reader reaches the sentence.
- **State:** `destructive` tone is reserved for the row whose finding is a failure; every other row uses the neutral cell tone.

### Navigation (Header)
- **Style:** logo + wordmark left, auth-aware action right. Flat, 1px `border-b` separates it from page content — no elevation, no background tint.
- **Signed out:** "Log in" (ghost) + "Sign up" (primary) side by side.
- **Signed in:** the two auth actions collapse into a single primary "Dashboard" button — never both states shown at once, and the swap is non-blocking (resolved client-side after first paint, never gating render behind a loading screen).

## Do's and Don'ts

### Do:
- **Do** reserve `destructive` red exclusively for a critical/failing finding — never for emphasis, decoration, or a second accent.
- **Do** set any text that "resolves" (headline, score, short status tags) in Martian Mono inside a `FlapCell`; set every full sentence in Hanken Grotesk.
- **Do** trigger a `FlapCell` reveal once per element, on first scroll-into-view, and skip the character-cycle entirely under `prefers-reduced-motion`.
- **Do** separate list rows (findings, steps) with a single hairline border rather than individual card boxes.

### Don't:
- **Don't** introduce a color outside the existing background/foreground/card/muted/border/primary/destructive set.
- **Don't** add a drop shadow, glow, or gradient anywhere outside a `FlapCell`'s internal fold seam.
- **Don't** set a full sentence in Martian Mono, or a headline/score in Hanken Grotesk.
- **Don't** replay a `FlapCell`'s character-cycle on every scroll past it — it fires once, the first time it enters view.
