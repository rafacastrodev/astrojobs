# AGENTS.md — apps/api

Guidance for working in the FastAPI backend.

## Tooling

Dependencies and the virtual environment are managed with [uv](https://docs.astral.sh/uv/), not pip/poetry. This app is configured as a non-packaged uv project (`[tool.uv] package = false` in `pyproject.toml`) — it's a service, not a distributable library, so there's no `src/` layout or build backend.

## Commands

Run from `apps/api`:

```bash
uv sync                          # install/update dependencies from uv.lock
uv add <package>                 # add a runtime dependency
uv add --dev <package>           # add a dev-only dependency
uv run fastapi dev main.py       # start the dev server with auto-reload (default port 8000)
uv run fastapi run main.py       # run in production mode
uv run python -m <module>        # run any script inside the project's venv
```

There is no lint/format/test tooling configured yet.

## Architecture

- `main.py` — single-file FastAPI app. The `app = FastAPI()` instance and all routes currently live here.
- As routes grow, split them into APIRouter modules rather than growing `main.py` indefinitely — no such structure exists yet, so introduce it when it's actually needed.
- No database, auth, or config layer exists yet.
