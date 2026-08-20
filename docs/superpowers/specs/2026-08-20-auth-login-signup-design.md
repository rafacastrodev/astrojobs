# Auth: Login/Signup Design

**Date:** 2026-08-20
**Status:** Approved, pending implementation plan

## Summary

Add email/password authentication (signup, login, logout, forgot/reset password) to AstroJobs, spanning both `apps/api` (new auth subsystem — no auth exists today) and `apps/web` (new login/signup/forgot-password/reset-password pages, plus a route guard that redirects `/` to `/dashboard` or `/login` based on session state).

This was classified architectural rather than bounded because `apps/api` has no auth, database, or session layer at all — this introduces a new subsystem, not a change to an existing flow.

## Goals

- Users can sign up and log in with email + password.
- Sessions persist via an httpOnly JWT cookie.
- Users can reset a forgotten password via a token-based flow.
- `/` redirects to `/dashboard` (authenticated) or `/login` (not authenticated); `/dashboard` and the auth pages guard symmetrically.
- Frontend organized per the requested convention: `components/`, `hooks/`, `utils/` for general-purpose code, `pages/<feature>/{components,hooks}` for feature-scoped code, thin route files in `src/routes/`.

## Out of scope (explicit follow-ups, not part of this task)

- Email verification.
- Making the social-login buttons functional (OAuth backend). They render as icon-only, non-interactive UI.
- Real email delivery for password reset (see below — dev-mode stub only).
- Refresh-token rotation / short-lived access tokens (single ~7-day JWT is enough for MVP).
- Automated test tooling (pytest for `apps/api`, vitest for `apps/web`) — neither exists in the repo today; introducing it is a separate decision. Verification for this task is manual (see Verification section).
- Dashboard content beyond a placeholder stub.
- Route guards/auth checks on any page other than `/`, `/dashboard`, `/login`, `/signup` (nothing else exists to protect yet).

## Backend architecture (`apps/api`)

The repo already contains `domain/entities/user_entity.py` (plain dataclass) and `infrastructure/models/user_model.py` (SQLAlchemy model, currently broken — references an undefined `Base`), signaling an intended domain/infrastructure layered (hexagonal-ish) architecture. This design extends that pattern rather than replacing it with a flatter conventional-FastAPI layout, per "follow existing patterns."

```
apps/api/
  core/
    config.py                          # pydantic-settings: DATABASE_URL, JWT_SECRET,
                                        # JWT_EXPIRES_MIN, COOKIE_SECURE, FRONTEND_ORIGIN
  domain/
    entities/
      user_entity.py                   # existing; add hashed_password field
      password_reset_token_entity.py   # new
    repositories/
      user_repository.py               # Protocol: get_by_email, get_by_id, create
      password_reset_token_repository.py  # Protocol: create, get_valid_by_token, mark_used
  application/
    auth/
      service.py                       # AuthService: signup, login, request_password_reset,
                                        # reset_password, get_current_user
  infrastructure/
    db/
      base.py                          # declarative Base + engine + SessionLocal
                                        # (fixes today's undefined Base in user_model.py)
    models/
      user_model.py                    # existing; add hashed_password column
      password_reset_token_model.py    # new
    repositories/
      sqlalchemy_user_repository.py
      sqlalchemy_password_reset_token_repository.py
    security/
      hashing.py                       # bcrypt hash/verify
      jwt.py                           # encode/decode JWT
  interface/
    api/
      auth_router.py                   # FastAPI APIRouter, mounted at /auth
      dependencies.py                  # get_current_user: reads cookie, verifies JWT, loads user
      schemas.py                       # Pydantic request/response models
  alembic/                             # alembic.ini, env.py, versions/
  main.py                              # FastAPI() + CORSMiddleware(allow_origin=FRONTEND_ORIGIN,
                                        # allow_credentials=True) + include_router(auth_router)
```

## Data model

- `users`: `id`, `name`, `email` (unique, indexed), `hashed_password`, `created_at`.
- `password_reset_tokens`: `id`, `user_id`, `token_hash`, `expires_at`, `used_at` — kept as a separate table rather than columns on `users`, since it's a transient, potentially-multi-row concern.
- Postgres via Docker (`docker-compose.yml` gets one `db` service; `apps/api` continues running locally via `uv run fastapi dev` and connects over `DATABASE_URL`).
- Schema changes go through Alembic migrations from the start (initial migration creates both tables), rather than `Base.metadata.create_all()`, to avoid a painful retrofit once there's real data.
- Passwords hashed with `bcrypt`. JWTs via `pyjwt` (HS256, secret from env).

## Endpoints

All under `/auth`, JSON in/out unless noted. All mutate the `jwt` httpOnly cookie as described.

| Endpoint | Behavior |
|---|---|
| `POST /auth/signup` | `name, email, password` → creates user, hashes password, sets JWT cookie, returns user (no password). 409 if email already taken. |
| `POST /auth/login` | `email, password` → verifies hash, sets JWT cookie, returns user. 401 on bad credentials, generic message (doesn't reveal which field was wrong). |
| `POST /auth/logout` | Clears the cookie. |
| `GET /auth/me` | Reads cookie → returns current user, or 401 if not authenticated. |
| `POST /auth/forgot-password` | `email` → if a matching user exists, creates a reset token (~1h expiry) and logs the reset link (`FRONTEND_ORIGIN/reset-password?token=...`) via `logger.info`, gated to non-production. **Always returns 200** regardless of whether the email exists, to avoid user enumeration. |
| `POST /auth/reset-password` | `token, new_password` → validates token (exists, unexpired, unused), updates `hashed_password`, marks token used. 400 on invalid/expired/used token. |

**Cookie:** `httpOnly`, `secure` in production, `samesite=lax`, ~7 day expiry, payload `sub=user_id`.

**Signup auto-authenticates** — it sets the same cookie as login, so the user lands already signed in.

## Frontend structure (`apps/web`)

**Auth-state check for SSR routing:** a TanStack Start server function forwards the incoming request's cookie header to `GET /auth/me` and returns the user or `null`. Any non-200 (401, network error) is treated as "not logged in" rather than thrown, so a down API fails safe into a redirect instead of crashing routing.

```
src/utils/auth/getCurrentUser.server.ts   # createServerFn wrapping GET /auth/me
```

Used in `beforeLoad` on:

```
src/routes/index.tsx            # user ? redirect /dashboard : redirect /login
src/routes/dashboard.tsx         # !user ? redirect /login : continue (placeholder stub page)
src/routes/login.tsx            # user ? redirect /dashboard : continue
src/routes/signup.tsx            # user ? redirect /dashboard : continue
src/routes/forgot-password.tsx
src/routes/reset-password.tsx    # reads ?token= via route search params
```

**Feature/page structure:**

```
src/
  components/                 # generic reusable UI
    Input/                     # existing
    Button/
    PasswordInput/              # Input + show/hide toggle
    SocialIconButton/           # icon-only, non-functional
    AuthLayout/                 # dark, split-screen shell shared by all auth pages
  hooks/
    useAuth.ts                  # react-query wrapper around GET /auth/me (client-side reads,
                                 # e.g. dashboard logout button)
  utils/
    api/client.ts                # fetch wrapper, credentials:'include', base URL from
                                  # VITE_API_URL, typed error parsing
    auth/getCurrentUser.server.ts
    validation/authSchemas.ts     # zod: emailSchema, passwordSchema, signupSchema, loginSchema,
                                   # forgotPasswordSchema, resetPasswordSchema
  pages/
    signin/
      components/SigninForm.tsx
      hooks/useSignin.ts          # react-query mutation -> POST /auth/login
    signup/
      components/SignupForm.tsx
      hooks/useSignup.ts
    forgot-password/
      components/ForgotPasswordForm.tsx
      hooks/useForgotPassword.ts
    reset-password/
      components/ResetPasswordForm.tsx
      hooks/useResetPassword.ts
    dashboard/
      components/DashboardStub.tsx
      hooks/useLogout.ts
  routes/                      # thin: beforeLoad guard + render the page component
```

**Visual direction:** dark-mode-first, split-screen layout (form on one side, visual/copy on the other), vibrant accent color. Exact styling decisions (palette, typography, imagery) deferred to the `frontend-design` skill at implementation time; this sets the overall feel only.

## Error handling

- Client-side `react-hook-form` + `zod` catch shape errors before submit (empty fields, invalid email, short password, mismatched confirm-password) as inline field errors.
- Server is the source of truth: a 422 from FastAPI maps field errors back onto the form by field name. Domain-level failures (409 duplicate email, 401 bad credentials, 400 invalid/expired reset token) surface as a form-level banner, not a field error.
- Login and forgot-password both return generic, enumeration-safe messaging (see Endpoints table).
- Unexpected errors (API unreachable, 500) show a generic "Something went wrong, try again" banner rather than failing silently.
- Route-guard failures (`getCurrentUser.server.ts` seeing a non-200) redirect to `/login` rather than throwing.

## Verification

Neither app has automated test tooling configured today, and adding it is out of scope for this task (see above). Verification is manual:

- **`apps/api`**: exercise each endpoint via FastAPI's `/docs` Swagger UI or `curl` — signup, duplicate signup (409), login (valid/invalid), `/me` with and without cookie, forgot-password (confirm the token link appears in the server console log), reset-password (valid, expired, and reused token).
- **`apps/web`**: run both dev servers and walk the golden paths in a real browser — signup → lands on `/dashboard`; logout → lands on `/login`; direct hit on `/` while logged out → `/login`; direct hit on `/` while logged in → `/dashboard`; direct hit on `/dashboard` while logged out → `/login`; forgot-password → reset-password with the logged token → login with the new password.
