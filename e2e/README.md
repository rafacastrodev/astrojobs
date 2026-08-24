# e2e

End-to-end tests that drive the deployed app in a real browser.

## Running

```bash
pnpm --filter e2e install
pnpm --filter e2e install-browsers   # once, downloads Chromium
pnpm --filter e2e test
```

Targets `https://astrojobs.rafacastro.dev` by default. Point it elsewhere with
`E2E_BASE_URL`:

```bash
E2E_BASE_URL=http://localhost pnpm --filter e2e test
```

Other entry points: `pnpm --filter e2e test:ui` for the Playwright UI,
`pnpm --filter e2e report` for the last HTML report.

## Coverage

| Spec | Flow |
| --- | --- |
| `auth.spec.ts` | signup, login, logout, route guards, duplicate email, wrong password, form validation |
| `resume.spec.ts` | empty state, upload, extraction, removal, unsupported type, anonymous access |
| `matching.spec.ts` | semantic ranking, `top_k`, cross-user isolation, anonymous access |

## Notes

Tests run against production, so each one signs up a fresh account with a
unique `@example.com` address. There is no account-deletion endpoint, so those
accounts accumulate — prune them from the `users` table periodically.

Resumes and their vectors are cleaned up by the tests that create them through
the UI; the matching specs leave their resume behind for the same reason.

The matching specs skip themselves when the job catalogue is empty, since
seeding it needs an admin account and admin is granted directly in the
database.
