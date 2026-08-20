# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository structure

This is a pnpm workspace monorepo (`pnpm-workspace.yaml`: `apps/*`) with two apps, both very early-stage:

- `apps/web` — TanStack Start (React 19) frontend. This is where nearly all current code lives.
- `apps/api` — FastAPI backend, managed with [uv](https://docs.astral.sh/uv/). See `apps/api/AGENTS.md` for its commands and architecture.

There is no root-level build/lint/test tooling — everything happens inside each app.

## Commands

Run from `apps/web` (or prefix with `pnpm --filter web` from the repo root; the root `pnpm dev` script just does `cd apps/web && pnpm dev`):

```bash
pnpm dev             # start dev server on port 3000
pnpm build            # production build (vite build)
pnpm preview          # preview a production build
pnpm generate-routes  # regenerate src/routeTree.gen.ts (tsr generate)
pnpm lint             # eslint
pnpm format           # prettier --write . && eslint --fix
pnpm check            # prettier --check .
```

There is no test runner configured yet in `apps/web`.

For `apps/api` commands (uv, dev server, etc.), see `apps/api/AGENTS.md`.

## Architecture (apps/web)

- **Framework**: TanStack Start (React 19) using file-based routing via `@tanstack/react-router`. Routes live in `src/routes/`; the router plugin auto-generates `src/routeTree.gen.ts` from those files — do not hand-edit that generated file.
- **Root route/shell**: `src/routes/__root.tsx` defines the HTML document shell (`shellComponent`), page `<head>` metadata, and mounts TanStack Devtools (router + React Query panels).
- **Data layer**: `@tanstack/react-query` is wired into the router via `@tanstack/react-router-ssr-query` (see `src/router.tsx` — `getRouter()` creates a `QueryClient` and calls `setupRouterSsrQueryIntegration`), so loader data and Query cache are integrated for SSR.
- **Router context**: `Register.router` and `createRootRouteWithContext<{ queryClient: QueryClient }>()` type the router's context to expose `queryClient` to every route.
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite`, imported in `src/styles.css` and linked from the root route (`appCss` import with `?url`).
- **Path aliases**: both `#/*` and `@/*` map to `src/*` (see `tsconfig.json` `paths` and `package.json` `imports`).
- **Vite plugin order matters**: in `vite.config.ts`, `devtools()` must run first, followed by `tailwindcss()`, `tanstackStart()`, `viteReact()`.
- **Forms**: `react-hook-form` + `zod` are dependencies for form handling/validation, though not yet wired into any route.

## Architecture (apps/api)

See `apps/api/AGENTS.md`.

## Notes

- The project is a work in progress: `apps/web/src/routes/login.tsx` and other routes are currently stubs, and `apps/api` is a minimal FastAPI skeleton.
- ESLint config extends `@tanstack/eslint-config` (`apps/web/eslint.config.js`) with several rules disabled (`import/no-cycle`, `import/order`, `sort-imports`, `@typescript-eslint/array-type`, `@typescript-eslint/require-await`, `pnpm/json-enforce-catalog`).
