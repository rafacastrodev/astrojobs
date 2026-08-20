# Login/Signup Auth Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add email/password authentication (signup, login, logout, forgot/reset password) to AstroJobs — a new layered auth subsystem in `apps/api`, plus `apps/web` pages and a session-aware routing guard (`/` → `/dashboard` or `/login`).

**Architecture:** `apps/api` gets a domain/application/infrastructure/interface layered auth subsystem (JWT-in-httpOnly-cookie sessions, bcrypt password hashing, Postgres via SQLAlchemy + Alembic). `apps/web` gets thin TanStack Start routes backed by `src/pages/<feature>/{components,hooks}` and shared `src/components|hooks|utils`, with a server function forwarding the session cookie for SSR auth checks in `beforeLoad`.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Alembic, `psycopg` (v3), `bcrypt`, `pyjwt`, `pydantic-settings`, Postgres (Docker) — TanStack Start/Router, React 19, React Query, `react-hook-form` + `zod` + `@hookform/resolvers`, Tailwind CSS v4.

**Spec:** `docs/superpowers/specs/2026-08-20-auth-login-signup-design.md`

## Global Constraints

- No automated test tooling exists in either app; every task is verified manually (curl/Swagger UI for the API, a real browser for the frontend) — do not introduce pytest/vitest as part of this plan.
- Auth cookie name is always `jwt`: httpOnly, `secure` only in production, `samesite=lax`, ~7 day expiry (`JWT_EXPIRES_MINUTES=10080`).
- Login and forgot-password return generic, enumeration-safe responses (see Task 7).
- `apps/api` follows the existing domain/infrastructure layering already implied by `domain/entities/user_entity.py` and `infrastructure/models/user_model.py` — do not flatten it into a conventional `routers/`+`models.py` layout.
- Frontend imports use the existing `#/*` path alias (see `apps/web/tsconfig.json`), matching the codebase's current convention.
- Bcrypt has a 72-byte input limit — password fields are capped at 72 characters client- and server-side, not the more common 128.
- Password reset tokens expire after 1 hour and are single-use; the raw token is only ever logged to the API console in non-production (`ENVIRONMENT != "production"`), never emailed (no email service exists yet — out of scope).

---

## Task 1: Backend dependencies, config, and local Postgres

**Files:**
- Modify: `apps/api/pyproject.toml` (via `uv add`)
- Create: `docker-compose.yml` (repo root — currently an empty untracked stub)
- Create: `apps/api/.env.example`
- Create: `apps/api/core/config.py`

**Interfaces:**
- Produces: `apps/api/core/config.py` exports `settings: Settings` with fields `database_url: str`, `jwt_secret: str`, `jwt_expires_minutes: int`, `cookie_secure: bool`, `frontend_origin: str`, `environment: str`. Every later backend task imports `from core.config import settings`.

- [ ] **Step 1: Add backend dependencies**

Run from `apps/api`:

```bash
uv add sqlalchemy "psycopg[binary]" bcrypt pyjwt pydantic-settings alembic
```

- [ ] **Step 2: Write the root docker-compose.yml**

```yaml
services:
  db:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: astrojobs
      POSTGRES_PASSWORD: astrojobs
      POSTGRES_DB: astrojobs
    ports:
      - "5432:5432"
    volumes:
      - astrojobs_db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U astrojobs"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  astrojobs_db_data:
```

- [ ] **Step 3: Write `apps/api/.env.example`**

```
DATABASE_URL=postgresql+psycopg://astrojobs:astrojobs@localhost:5432/astrojobs
JWT_SECRET=change-me-in-production
JWT_EXPIRES_MINUTES=10080
COOKIE_SECURE=false
FRONTEND_ORIGIN=http://localhost:3000
ENVIRONMENT=development
```

- [ ] **Step 4: Copy it to a local `.env`**

```bash
cp apps/api/.env.example apps/api/.env
```

(`.env` is already gitignored in `apps/api/.gitignore` — do not commit it.)

- [ ] **Step 5: Write `apps/api/core/config.py`**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    jwt_secret: str
    jwt_expires_minutes: int = 60 * 24 * 7
    cookie_secure: bool = False
    frontend_origin: str = "http://localhost:3000"
    environment: str = "development"


settings = Settings()
```

- [ ] **Step 6: Verify**

```bash
cd apps/api
docker compose -f ../../docker-compose.yml up -d db
uv run python -c "from core.config import settings; print(settings.database_url, settings.jwt_expires_minutes)"
```

Expected: prints `postgresql+psycopg://astrojobs:astrojobs@localhost:5432/astrojobs 10080` with no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/api/pyproject.toml apps/api/uv.lock apps/api/.env.example apps/api/core/config.py docker-compose.yml
git commit -m "feat(api): add auth dependencies, config, and local Postgres"
```

---

## Task 2: Domain entities and SQLAlchemy models

**Files:**
- Create: `apps/api/infrastructure/db/base.py`
- Modify: `apps/api/domain/entities/user_entity.py`
- Create: `apps/api/domain/entities/password_reset_token_entity.py`
- Modify: `apps/api/infrastructure/models/user_model.py`
- Create: `apps/api/infrastructure/models/password_reset_token_model.py`

**Interfaces:**
- Consumes: `settings.database_url` from Task 1.
- Produces: `Base` (declarative base), `engine`, `SessionLocal` from `infrastructure.db.base`. `UserEntity(id, name, email, hashed_password, created_at)`. `PasswordResetTokenEntity(id, user_id, token_hash, expires_at, used_at)`. `UserModel` (table `users`), `PasswordResetTokenModel` (table `password_reset_tokens`) — both used by Task 3 (migrations) and Task 5 (repositories).

- [ ] **Step 1: Write `apps/api/infrastructure/db/base.py`**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
```

- [ ] **Step 2: Update `apps/api/domain/entities/user_entity.py`**

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class UserEntity:
    id: Optional[int]
    name: str
    email: str
    hashed_password: str
    created_at: datetime
```

- [ ] **Step 3: Write `apps/api/domain/entities/password_reset_token_entity.py`**

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class PasswordResetTokenEntity:
    id: Optional[int]
    user_id: int
    token_hash: str
    expires_at: datetime
    used_at: Optional[datetime]
```

- [ ] **Step 4: Update `apps/api/infrastructure/models/user_model.py`**

```python
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from infrastructure.db.base import Base


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )
```

- [ ] **Step 5: Write `apps/api/infrastructure/models/password_reset_token_model.py`**

```python
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from infrastructure.db.base import Base


class PasswordResetTokenModel(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
```

- [ ] **Step 6: Verify**

```bash
cd apps/api
uv run python -c "
from infrastructure.db.base import Base
from infrastructure.models.user_model import UserModel
from infrastructure.models.password_reset_token_model import PasswordResetTokenModel
print(sorted(Base.metadata.tables.keys()))
"
```

Expected: `['password_reset_tokens', 'users']` with no import errors (this also confirms the previously-undefined `Base` is fixed).

- [ ] **Step 7: Commit**

```bash
git add apps/api/infrastructure/db/base.py apps/api/domain/entities apps/api/infrastructure/models
git commit -m "feat(api): add auth domain entities and SQLAlchemy models"
```

---

## Task 3: Alembic migrations

**Files:**
- Create: `apps/api/alembic.ini` (via `alembic init`)
- Create: `apps/api/alembic/env.py` (generated, then replaced)
- Create: `apps/api/alembic/script.py.mako` (generated, unmodified)
- Create: `apps/api/alembic/versions/<generated>_create_users_and_password_reset_tokens_tables.py` (autogenerated)

**Interfaces:**
- Consumes: `Base`, `UserModel`, `PasswordResetTokenModel` from Task 2; `settings.database_url` from Task 1.
- Produces: `users` and `password_reset_tokens` tables in the running Postgres database, used by Task 5 onward.

- [ ] **Step 1: Initialize Alembic**

Run from `apps/api`:

```bash
uv run alembic init alembic
```

- [ ] **Step 2: Replace the generated `apps/api/alembic/env.py`**

```python
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from core.config import settings
from infrastructure.db.base import Base
import infrastructure.models.password_reset_token_model  # noqa: F401
import infrastructure.models.user_model  # noqa: F401

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 3: Generate the initial migration**

```bash
uv run alembic revision --autogenerate -m "create users and password_reset_tokens tables"
```

Open the generated file in `apps/api/alembic/versions/` and confirm `upgrade()` contains `op.create_table("users", ...)` and `op.create_table("password_reset_tokens", ...)` with the columns from Task 2. If either is missing, re-check that `env.py` imports both model modules before `target_metadata = Base.metadata` runs.

- [ ] **Step 4: Apply the migration**

```bash
uv run alembic upgrade head
```

- [ ] **Step 5: Verify**

```bash
docker compose exec db psql -U astrojobs -d astrojobs -c "\dt"
```

Expected: lists `users`, `password_reset_tokens`, and `alembic_version` tables.

- [ ] **Step 6: Commit**

```bash
git add apps/api/alembic.ini apps/api/alembic
git commit -m "feat(api): add Alembic migrations for users and password_reset_tokens"
```

---

## Task 4: Security utilities (hashing + JWT)

**Files:**
- Create: `apps/api/infrastructure/security/hashing.py`
- Create: `apps/api/infrastructure/security/jwt.py`

**Interfaces:**
- Consumes: `settings.jwt_secret`, `settings.jwt_expires_minutes` from Task 1.
- Produces: `hash_password(password: str) -> str`, `verify_password(password: str, hashed_password: str) -> bool`, `create_access_token(user_id: int) -> str`, `decode_access_token(token: str) -> int | None` — used by Task 6 (`AuthService`).

- [ ] **Step 1: Write `apps/api/infrastructure/security/hashing.py`**

```python
import bcrypt


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
```

- [ ] **Step 2: Write `apps/api/infrastructure/security/jwt.py`**

```python
from datetime import datetime, timedelta, timezone

import jwt

from core.config import settings


def create_access_token(user_id: int) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expires_minutes)
    payload = {"sub": str(user_id), "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    return int(payload["sub"])
```

- [ ] **Step 3: Verify**

```bash
cd apps/api
uv run python -c "
from infrastructure.security.hashing import hash_password, verify_password
from infrastructure.security.jwt import create_access_token, decode_access_token

h = hash_password('correct-horse-battery-staple')
assert verify_password('correct-horse-battery-staple', h)
assert not verify_password('wrong-password', h)

token = create_access_token(42)
assert decode_access_token(token) == 42
assert decode_access_token('garbage-token') is None
print('OK')
"
```

Expected: prints `OK` with no `AssertionError`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/infrastructure/security
git commit -m "feat(api): add password hashing and JWT utilities"
```

---

## Task 5: Repositories (protocols + SQLAlchemy implementations)

**Files:**
- Create: `apps/api/domain/repositories/user_repository.py`
- Create: `apps/api/domain/repositories/password_reset_token_repository.py`
- Create: `apps/api/infrastructure/repositories/sqlalchemy_user_repository.py`
- Create: `apps/api/infrastructure/repositories/sqlalchemy_password_reset_token_repository.py`

**Interfaces:**
- Consumes: `SessionLocal` from Task 2; `UserModel`, `PasswordResetTokenModel` from Task 2; `UserEntity`, `PasswordResetTokenEntity` from Task 2.
- Produces: `UserRepository` protocol (`get_by_email`, `get_by_id`, `create`, `update_password`) and `SqlAlchemyUserRepository(session)` implementing it. `PasswordResetTokenRepository` protocol (`create`, `get_valid_by_token_hash`, `mark_used`) and `SqlAlchemyPasswordResetTokenRepository(session)` implementing it. Both consumed by Task 6 (`AuthService`) and Task 7 (`get_auth_service` dependency).

- [ ] **Step 1: Write `apps/api/domain/repositories/user_repository.py`**

```python
from typing import Optional, Protocol

from domain.entities.user_entity import UserEntity


class UserRepository(Protocol):
    def get_by_email(self, email: str) -> Optional[UserEntity]: ...

    def get_by_id(self, user_id: int) -> Optional[UserEntity]: ...

    def create(self, name: str, email: str, hashed_password: str) -> UserEntity: ...

    def update_password(self, user_id: int, hashed_password: str) -> None: ...
```

- [ ] **Step 2: Write `apps/api/domain/repositories/password_reset_token_repository.py`**

```python
from datetime import datetime
from typing import Optional, Protocol

from domain.entities.password_reset_token_entity import PasswordResetTokenEntity


class PasswordResetTokenRepository(Protocol):
    def create(
        self, user_id: int, token_hash: str, expires_at: datetime
    ) -> PasswordResetTokenEntity: ...

    def get_valid_by_token_hash(self, token_hash: str) -> Optional[PasswordResetTokenEntity]: ...

    def mark_used(self, token_id: int) -> None: ...
```

- [ ] **Step 3: Write `apps/api/infrastructure/repositories/sqlalchemy_user_repository.py`**

```python
from typing import Optional

from sqlalchemy.orm import Session

from domain.entities.user_entity import UserEntity
from infrastructure.models.user_model import UserModel


class SqlAlchemyUserRepository:
    def __init__(self, session: Session):
        self._session = session

    def get_by_email(self, email: str) -> Optional[UserEntity]:
        model = self._session.query(UserModel).filter(UserModel.email == email).one_or_none()
        return self._to_entity(model) if model else None

    def get_by_id(self, user_id: int) -> Optional[UserEntity]:
        model = self._session.get(UserModel, user_id)
        return self._to_entity(model) if model else None

    def create(self, name: str, email: str, hashed_password: str) -> UserEntity:
        model = UserModel(name=name, email=email, hashed_password=hashed_password)
        self._session.add(model)
        self._session.commit()
        self._session.refresh(model)
        return self._to_entity(model)

    def update_password(self, user_id: int, hashed_password: str) -> None:
        model = self._session.get(UserModel, user_id)
        if model is None:
            return
        model.hashed_password = hashed_password
        self._session.commit()

    @staticmethod
    def _to_entity(model: UserModel) -> UserEntity:
        return UserEntity(
            id=model.id,
            name=model.name,
            email=model.email,
            hashed_password=model.hashed_password,
            created_at=model.created_at,
        )
```

- [ ] **Step 4: Write `apps/api/infrastructure/repositories/sqlalchemy_password_reset_token_repository.py`**

```python
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from domain.entities.password_reset_token_entity import PasswordResetTokenEntity
from infrastructure.models.password_reset_token_model import PasswordResetTokenModel


class SqlAlchemyPasswordResetTokenRepository:
    def __init__(self, session: Session):
        self._session = session

    def create(
        self, user_id: int, token_hash: str, expires_at: datetime
    ) -> PasswordResetTokenEntity:
        model = PasswordResetTokenModel(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
        self._session.add(model)
        self._session.commit()
        self._session.refresh(model)
        return self._to_entity(model)

    def get_valid_by_token_hash(self, token_hash: str) -> Optional[PasswordResetTokenEntity]:
        model = (
            self._session.query(PasswordResetTokenModel)
            .filter(
                PasswordResetTokenModel.token_hash == token_hash,
                PasswordResetTokenModel.used_at.is_(None),
                PasswordResetTokenModel.expires_at > datetime.utcnow(),
            )
            .one_or_none()
        )
        return self._to_entity(model) if model else None

    def mark_used(self, token_id: int) -> None:
        model = self._session.get(PasswordResetTokenModel, token_id)
        if model is None:
            return
        model.used_at = datetime.utcnow()
        self._session.commit()

    @staticmethod
    def _to_entity(model: PasswordResetTokenModel) -> PasswordResetTokenEntity:
        return PasswordResetTokenEntity(
            id=model.id,
            user_id=model.user_id,
            token_hash=model.token_hash,
            expires_at=model.expires_at,
            used_at=model.used_at,
        )
```

- [ ] **Step 5: Verify**

```bash
cd apps/api
uv run python -c "
from infrastructure.db.base import SessionLocal
from infrastructure.repositories.sqlalchemy_user_repository import SqlAlchemyUserRepository

session = SessionLocal()
repo = SqlAlchemyUserRepository(session)
user = repo.create('Repo Test', 'repo-test@example.com', 'not-a-real-hash')
assert repo.get_by_email('repo-test@example.com').id == user.id
assert repo.get_by_id(user.id).email == 'repo-test@example.com'
print('OK', user.id)
session.close()
"
```

Expected: prints `OK <id>` with no errors. (Leaves a throwaway row — fine for local dev; Task 7's verification will create/query real users too.)

- [ ] **Step 6: Commit**

```bash
git add apps/api/domain/repositories apps/api/infrastructure/repositories
git commit -m "feat(api): add user and password-reset-token repositories"
```

---

## Task 6: AuthService (application layer)

**Files:**
- Create: `apps/api/application/auth/errors.py`
- Create: `apps/api/application/auth/service.py`

**Interfaces:**
- Consumes: `UserRepository`, `PasswordResetTokenRepository` protocols and `UserEntity` from Task 5/B2; `hash_password`, `verify_password`, `create_access_token`, `decode_access_token` from Task 4; `settings.frontend_origin`, `settings.environment` from Task 1.
- Produces: `AuthService(user_repository, password_reset_token_repository)` with methods `signup(name, email, password) -> tuple[UserEntity, str]`, `login(email, password) -> tuple[UserEntity, str]`, `get_current_user(token: str) -> UserEntity | None`, `request_password_reset(email: str) -> None`, `reset_password(raw_token: str, new_password: str) -> None`. Exceptions `EmailAlreadyExistsError`, `InvalidCredentialsError`, `InvalidResetTokenError`. Consumed by Task 7's router.

- [ ] **Step 1: Write `apps/api/application/auth/errors.py`**

```python
class EmailAlreadyExistsError(Exception):
    def __init__(self, email: str):
        super().__init__(f"Email already in use: {email}")


class InvalidCredentialsError(Exception):
    def __init__(self):
        super().__init__("Invalid email or password")


class InvalidResetTokenError(Exception):
    def __init__(self):
        super().__init__("Invalid or expired reset token")
```

- [ ] **Step 2: Write `apps/api/application/auth/service.py`**

```python
import hashlib
import logging
import secrets
from datetime import datetime, timedelta

from application.auth.errors import (
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    InvalidResetTokenError,
)
from core.config import settings
from domain.entities.user_entity import UserEntity
from domain.repositories.password_reset_token_repository import PasswordResetTokenRepository
from domain.repositories.user_repository import UserRepository
from infrastructure.security.hashing import hash_password, verify_password
from infrastructure.security.jwt import create_access_token, decode_access_token

logger = logging.getLogger(__name__)

RESET_TOKEN_TTL = timedelta(hours=1)


class AuthService:
    def __init__(
        self,
        user_repository: UserRepository,
        password_reset_token_repository: PasswordResetTokenRepository,
    ):
        self._users = user_repository
        self._reset_tokens = password_reset_token_repository

    def signup(self, name: str, email: str, password: str) -> tuple[UserEntity, str]:
        if self._users.get_by_email(email) is not None:
            raise EmailAlreadyExistsError(email)
        user = self._users.create(name, email, hash_password(password))
        token = create_access_token(user.id)
        return user, token

    def login(self, email: str, password: str) -> tuple[UserEntity, str]:
        user = self._users.get_by_email(email)
        if user is None or not verify_password(password, user.hashed_password):
            raise InvalidCredentialsError()
        token = create_access_token(user.id)
        return user, token

    def get_current_user(self, token: str) -> UserEntity | None:
        user_id = decode_access_token(token)
        if user_id is None:
            return None
        return self._users.get_by_id(user_id)

    def request_password_reset(self, email: str) -> None:
        user = self._users.get_by_email(email)
        if user is None:
            return
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        expires_at = datetime.utcnow() + RESET_TOKEN_TTL
        self._reset_tokens.create(user.id, token_hash, expires_at)
        reset_link = f"{settings.frontend_origin}/reset-password?token={raw_token}"
        if settings.environment != "production":
            logger.info("Password reset link for %s: %s", email, reset_link)

    def reset_password(self, raw_token: str, new_password: str) -> None:
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        reset_token = self._reset_tokens.get_valid_by_token_hash(token_hash)
        if reset_token is None:
            raise InvalidResetTokenError()
        self._users.update_password(reset_token.user_id, hash_password(new_password))
        self._reset_tokens.mark_used(reset_token.id)
```

- [ ] **Step 3: Verify**

```bash
cd apps/api
uv run python -c "
from infrastructure.db.base import SessionLocal
from infrastructure.repositories.sqlalchemy_user_repository import SqlAlchemyUserRepository
from infrastructure.repositories.sqlalchemy_password_reset_token_repository import SqlAlchemyPasswordResetTokenRepository
from application.auth.service import AuthService
from application.auth.errors import EmailAlreadyExistsError, InvalidCredentialsError, InvalidResetTokenError

session = SessionLocal()
service = AuthService(SqlAlchemyUserRepository(session), SqlAlchemyPasswordResetTokenRepository(session))

user, token = service.signup('Service Test', 'service-test@example.com', 'password123')
assert service.get_current_user(token).email == 'service-test@example.com'

try:
    service.signup('Dup', 'service-test@example.com', 'password123')
    raise SystemExit('expected EmailAlreadyExistsError')
except EmailAlreadyExistsError:
    pass

try:
    service.login('service-test@example.com', 'wrong-password')
    raise SystemExit('expected InvalidCredentialsError')
except InvalidCredentialsError:
    pass

service.request_password_reset('service-test@example.com')

try:
    service.reset_password('not-a-real-token', 'newpassword123')
    raise SystemExit('expected InvalidResetTokenError')
except InvalidResetTokenError:
    pass

print('OK')
session.close()
"
```

Expected: an `INFO` log line with a `reset-password?token=...` link, then prints `OK`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/application
git commit -m "feat(api): add AuthService application layer"
```

---

## Task 7: API layer (schemas, dependencies, router) and end-to-end verification

**Files:**
- Create: `apps/api/interface/api/schemas.py`
- Create: `apps/api/interface/api/dependencies.py`
- Create: `apps/api/interface/api/auth_router.py`
- Modify: `apps/api/main.py`

**Interfaces:**
- Consumes: `AuthService` from Task 6; `SqlAlchemyUserRepository`, `SqlAlchemyPasswordResetTokenRepository`, `SessionLocal` from Task 5/B2; `settings` from Task 1.
- Produces: FastAPI routes `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/reset-password`, mounted on `app`. `get_current_user` FastAPI dependency (used by future protected endpoints). This is the last backend task — the full auth API is live after this.

- [ ] **Step 1: Write `apps/api/interface/api/schemas.py`**

```python
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=72)


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime
```

- [ ] **Step 2: Write `apps/api/interface/api/dependencies.py`**

```python
from typing import Generator

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from application.auth.service import AuthService
from domain.entities.user_entity import UserEntity
from infrastructure.db.base import SessionLocal
from infrastructure.repositories.sqlalchemy_password_reset_token_repository import (
    SqlAlchemyPasswordResetTokenRepository,
)
from infrastructure.repositories.sqlalchemy_user_repository import SqlAlchemyUserRepository

COOKIE_NAME = "jwt"


def get_db() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(
        SqlAlchemyUserRepository(db),
        SqlAlchemyPasswordResetTokenRepository(db),
    )


def get_current_user(
    token: str | None = Cookie(default=None, alias=COOKIE_NAME),
    auth_service: AuthService = Depends(get_auth_service),
) -> UserEntity:
    if token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user = auth_service.get_current_user(token)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user
```

- [ ] **Step 3: Write `apps/api/interface/api/auth_router.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, Response, status

from application.auth.errors import (
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    InvalidResetTokenError,
)
from application.auth.service import AuthService
from core.config import settings
from domain.entities.user_entity import UserEntity
from interface.api.dependencies import COOKIE_NAME, get_auth_service, get_current_user
from interface.api.schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    SignupRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_MAX_AGE_SECONDS = settings.jwt_expires_minutes * 60


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=COOKIE_MAX_AGE_SECONDS,
    )


def _to_user_response(user: UserEntity) -> UserResponse:
    return UserResponse(id=user.id, name=user.name, email=user.email, created_at=user.created_at)


@router.post("/signup", response_model=UserResponse)
def signup(
    body: SignupRequest,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    try:
        user, token = auth_service.signup(body.name, body.email, body.password)
    except EmailAlreadyExistsError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
    _set_auth_cookie(response, token)
    return _to_user_response(user)


@router.post("/login", response_model=UserResponse)
def login(
    body: LoginRequest,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    try:
        user, token = auth_service.login(body.email, body.password)
    except InvalidCredentialsError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    _set_auth_cookie(response, token)
    return _to_user_response(user)


@router.post("/logout")
def logout(response: Response) -> dict[str, bool]:
    response.delete_cookie(COOKIE_NAME)
    return {"ok": True}


@router.get("/me", response_model=UserResponse)
def me(user: UserEntity = Depends(get_current_user)) -> UserResponse:
    return _to_user_response(user)


@router.post("/forgot-password")
def forgot_password(
    body: ForgotPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> dict[str, bool]:
    auth_service.request_password_reset(body.email)
    return {"ok": True}


@router.post("/reset-password")
def reset_password(
    body: ResetPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> dict[str, bool]:
    try:
        auth_service.reset_password(body.token, body.new_password)
    except InvalidResetTokenError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    return {"ok": True}
```

- [ ] **Step 4: Update `apps/api/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from interface.api.auth_router import router as auth_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}
```

- [ ] **Step 5: Start the server**

```bash
cd apps/api
uv run fastapi dev main.py
```

- [ ] **Step 6: Verify the full endpoint matrix with curl**

In another terminal (the `-c`/`-b` flags persist the cookie jar across calls):

```bash
cd apps/api

# Signup sets the cookie and returns the user
curl -i -c cookies.txt -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Curl Test","email":"curl-test@example.com","password":"password123"}'
# Expected: 200, Set-Cookie: jwt=..., body has id/name/email/created_at

# Duplicate signup is rejected
curl -i -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Curl Test","email":"curl-test@example.com","password":"password123"}'
# Expected: 409

# /me works with the cookie
curl -i -b cookies.txt http://localhost:8000/auth/me
# Expected: 200, same user

# /me fails without the cookie
curl -i http://localhost:8000/auth/me
# Expected: 401

# Login with wrong password
curl -i -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"curl-test@example.com","password":"wrong"}'
# Expected: 401, generic "Invalid email or password"

# Login with correct password
curl -i -c cookies.txt -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"curl-test@example.com","password":"password123"}'
# Expected: 200

# Logout clears the cookie
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:8000/auth/logout
curl -i -b cookies.txt http://localhost:8000/auth/me
# Expected: second call is 401

# Forgot password always returns 200, and logs the reset link to the `fastapi dev` console
curl -i -X POST http://localhost:8000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"curl-test@example.com"}'
curl -i -X POST http://localhost:8000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"does-not-exist@example.com"}'
# Expected: both 200 with identical {"ok": true} body

# Copy the token from the "Password reset link for curl-test@example.com: .../reset-password?token=..."
# line printed in the `fastapi dev` terminal, then:
curl -i -X POST http://localhost:8000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"<paste-token-here>","new_password":"newpassword456"}'
# Expected: 200

# Reusing the same token fails
curl -i -X POST http://localhost:8000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"<same-token>","new_password":"anotherpassword"}'
# Expected: 400

# Login with the new password works
curl -i -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"curl-test@example.com","password":"newpassword456"}'
# Expected: 200
```

Delete `apps/api/cookies.txt` afterward (it's a scratch file, not part of the repo).

- [ ] **Step 7: Commit**

```bash
git add apps/api/interface apps/api/main.py
git commit -m "feat(api): wire auth API routes, cookie handling, and CORS"
```

---

## Task 8: Frontend foundation — env, API client, validation schemas

**Files:**
- Modify: `apps/web/package.json` (via `pnpm add`)
- Create: `apps/web/.env.example`
- Create: `apps/web/src/utils/api/client.ts`
- Create: `apps/web/src/utils/validation/authSchemas.ts`

**Interfaces:**
- Produces: `apiClient.get<T>(path)`, `apiClient.post<T>(path, body?)`, `ApiError` (with `status`, `message`, `fieldErrors?: Record<string, string>`) from `#/utils/api/client`. `emailSchema`, `passwordSchema`, `signupSchema`/`SignupFormValues`, `loginSchema`/`LoginFormValues`, `forgotPasswordSchema`/`ForgotPasswordFormValues`, `resetPasswordSchema`/`ResetPasswordFormValues` from `#/utils/validation/authSchemas`. Consumed by every task from F2 onward.

- [ ] **Step 1: Add the resolver package**

Run from `apps/web`:

```bash
pnpm add @hookform/resolvers
```

- [ ] **Step 2: Write `apps/web/.env.example`**

```
VITE_API_URL=http://localhost:8000
```

- [ ] **Step 3: Copy it to a local `.env`**

```bash
cp apps/web/.env.example apps/web/.env
```

(`.env` is already gitignored in `apps/web/.gitignore`.)

- [ ] **Step 4: Write `apps/web/src/utils/api/client.ts`**

```typescript
export class ApiError extends Error {
  status: number
  fieldErrors?: Record<string, string>

  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

const API_URL = import.meta.env.VITE_API_URL as string

type JsonBody = Record<string, unknown>

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(response.status, extractMessage(body), extractFieldErrors(body))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

function extractMessage(body: unknown): string {
  if (body && typeof body === 'object' && 'detail' in body && typeof (body as { detail: unknown }).detail === 'string') {
    return (body as { detail: string }).detail
  }
  return 'Something went wrong'
}

function extractFieldErrors(body: unknown): Record<string, string> | undefined {
  if (!body || typeof body !== 'object' || !('detail' in body)) return undefined
  const detail = (body as { detail: unknown }).detail
  if (!Array.isArray(detail)) return undefined

  const fieldErrors: Record<string, string> = {}
  for (const issue of detail) {
    if (issue && typeof issue === 'object' && 'loc' in issue && 'msg' in issue && Array.isArray(issue.loc)) {
      const field = issue.loc.at(-1)
      if (typeof field === 'string') {
        fieldErrors[field] = issue.msg
      }
    }
  }
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: JsonBody) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
}
```

- [ ] **Step 5: Write `apps/web/src/utils/validation/authSchemas.ts`**

```typescript
import { z } from 'zod'

export const emailSchema = z.string().min(1, 'Email is required').email('Enter a valid email')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')

export const signupSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(120),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type SignupFormValues = z.infer<typeof signupSchema>

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
```

- [ ] **Step 6: Verify**

```bash
cd apps/web
pnpm exec tsc --noEmit
pnpm lint
```

Expected: both succeed with no errors (there are no consumers yet, so this only checks the new files are syntactically and structurally sound).

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml apps/web/.env.example apps/web/src/utils
git commit -m "feat(web): add auth API client and validation schemas"
```

---

## Design amendment (2026-08-20, mid-execution)

After Task 9 was first implemented per the original spec below, the user supplied a reference design and two new requirements that supersede parts of Tasks 9 and 10 as written:

1. **Visual design**: a simple, monochrome, centered-card theme (not the split-screen/violet layout originally specified), driven by CSS custom properties (a design-token system) defined in `apps/web/src/styles.css` via Tailwind v4's `@theme`: `--color-background`, `--color-foreground`, `--color-card`/`--color-card-foreground`, `--color-muted`/`--color-muted-foreground`, `--color-border`, `--color-input`, `--color-ring`, `--color-primary`/`--color-primary-foreground`, `--color-destructive`/`--color-destructive-foreground`. Already added to `styles.css` (controller-applied, not part of a task dispatch). Reference layout: a single rounded card, centered on a near-black page, with a small logo mark above the title, labeled inputs with leading icons (person/mail/lock), a password field with a show/hide toggle, and a solid `bg-primary`/`text-primary-foreground` (white-on-black) submit button — no split-screen, no violet accent.
2. **Interaction model**: `/login` and `/signup` are no longer separate routes. A single `/login` route renders one `AuthPage`-style component that toggles between the sign-in and sign-up forms via local state (no navigation, no URL change) when the user clicks "Sign Up" / "Log in". `src/routes/signup.tsx` is NOT created. This supersedes the "Separate routes" decision from the original brainstorming Q&A.

**Consequences for the file/task structure below:**
- `AuthLayout` becomes a centered single-card layout (not split-screen), using the new design tokens, plus a new `src/components/Logo/index.tsx`.
- `Input` gains an optional leading-icon slot. New small icon components are added (`src/components/icons.tsx`: user/mail/lock/eye/eye-off) rather than a new icon library dependency.
- `Button` uses `bg-primary`/`text-primary-foreground` instead of a violet accent color.
- `SigninForm`/`SignupForm` take an `onSwitchToSignup`/`onSwitchToSignin` callback prop instead of a `<Link>` to `/signup`/`/login` for the mode switch (forgot-password/reset-password links are unaffected — those stay real navigations to their own routes).
- `src/routes/login.tsx` owns the toggle state and renders whichever form is active; `src/routes/signup.tsx` is dropped from the plan entirely — Task 10 below is retargeted to just build `SignupForm`/`useSignup` (no route file), consumed by `login.tsx`.
- Task 13's later `beforeLoad` "redirect to /dashboard if already authenticated" guard now only needs to apply to the single `/login` route, not two routes.
- Social icon buttons (Google/GitHub, non-functional) from the original design are kept — the reference image doesn't show them, but that was an explicit earlier requirement (see spec) and the image is a thematic reference, not a field-for-field spec. They're restyled to the new monochrome tokens.
- The "Full name" field keeps that name (not "Username") — the reference image's "Username" label is cosmetic; the actual data model (`name`, `email`, `password`) established in the backend (Task 7) is unchanged.

Tasks 9 and 10's original text below is kept for the record but is superseded by this amendment for the files it lists; the actual dispatch after this point follows the amendment, not the original code blocks.

---

## Task 9: Signin page

**Files:**
- Modify: `apps/web/src/components/Input/index.tsx`
- Create: `apps/web/src/components/PasswordInput/index.tsx`
- Create: `apps/web/src/components/Button/index.tsx`
- Create: `apps/web/src/components/SocialIconButton/index.tsx`
- Create: `apps/web/src/components/SocialIconButton/icons.tsx`
- Create: `apps/web/src/components/AuthLayout/index.tsx`
- Create: `apps/web/src/pages/signin/hooks/useSignin.ts`
- Create: `apps/web/src/pages/signin/components/SigninForm.tsx`
- Modify: `apps/web/src/routes/login.tsx`

**Interfaces:**
- Consumes: `apiClient`, `ApiError` from Task 8 (`#/utils/api/client`); `loginSchema`, `LoginFormValues` from Task 8 (`#/utils/validation/authSchemas`).
- Produces: `Input`, `PasswordInput`, `Button`, `SocialIconButton`, `AuthLayout` in `#/components/*` — reused by every later frontend task. `SigninForm` at `#/pages/signin/components/SigninForm`, rendered by `/login`.

- [ ] **Step 1: Update `apps/web/src/components/Input/index.tsx` to accept a ref (React 19 ref-as-prop) and shared styling**

```typescript
import type { InputHTMLAttributes, Ref } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  ref?: Ref<HTMLInputElement>
}

export const Input = ({ ref, className = '', ...props }: InputProps) => {
  return (
    <input
      ref={ref}
      className={`w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-neutral-100 placeholder-neutral-500 outline-none focus:border-violet-500 ${className}`}
      {...props}
    />
  )
}
```

- [ ] **Step 2: Write `apps/web/src/components/PasswordInput/index.tsx`**

```typescript
import { useState } from 'react'
import type { InputHTMLAttributes, Ref } from 'react'

import { Input } from '#/components/Input'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  ref?: Ref<HTMLInputElement>
}

export const PasswordInput = ({ ref, className = '', ...props }: PasswordInputProps) => {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input ref={ref} type={visible ? 'text' : 'password'} className={`pr-16 ${className}`} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400 hover:text-neutral-200"
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Write `apps/web/src/components/Button/index.tsx`**

```typescript
import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean
}

export const Button = ({ isLoading, disabled, children, className = '', ...props }: ButtonProps) => {
  return (
    <button
      disabled={disabled || isLoading}
      className={`w-full rounded-lg bg-violet-500 px-4 py-2.5 font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {isLoading ? 'Loading…' : children}
    </button>
  )
}
```

- [ ] **Step 4: Write `apps/web/src/components/SocialIconButton/icons.tsx`**

```typescript
export const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
    <path d="M21.35 11.1h-9.17v2.92h5.27c-.23 1.4-1.6 4.1-5.27 4.1-3.17 0-5.76-2.62-5.76-5.87s2.59-5.87 5.76-5.87c1.8 0 3.02.77 3.71 1.43l2.53-2.44C16.86 3.7 14.7 2.7 12.18 2.7 6.98 2.7 2.75 6.94 2.75 12.15s4.23 9.45 9.43 9.45c5.44 0 9.06-3.82 9.06-9.2 0-.62-.07-1.1-.16-1.6z" />
  </svg>
)

export const GithubIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
    <path d="M12 2C6.48 2 2 6.58 2 12.2c0 4.5 2.87 8.31 6.84 9.66.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.46-1.2-1.11-1.52-1.11-1.52-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.55 2.34 1.1 2.91.84.09-.66.35-1.1.63-1.35-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05a9.29 9.29 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.2C22 6.58 17.52 2 12 2z" />
  </svg>
)
```

- [ ] **Step 5: Write `apps/web/src/components/SocialIconButton/index.tsx`**

```typescript
import type { ReactNode } from 'react'

type SocialIconButtonProps = {
  label: string
  icon: ReactNode
}

export const SocialIconButton = ({ label, icon }: SocialIconButtonProps) => {
  return (
    <button
      type="button"
      aria-label={label}
      disabled
      title={`${label} (coming soon)`}
      className="flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-700 text-neutral-300 opacity-60"
    >
      {icon}
    </button>
  )
}
```

- [ ] **Step 6: Write `apps/web/src/components/AuthLayout/index.tsx`**

```typescript
import type { ReactNode } from 'react'

type AuthLayoutProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

export const AuthLayout = ({ title, subtitle, children }: AuthLayoutProps) => {
  return (
    <div className="grid min-h-screen bg-neutral-950 text-neutral-100 lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-neutral-400">{subtitle}</p> : null}
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <div className="hidden bg-gradient-to-br from-violet-700 via-indigo-800 to-neutral-950 lg:block" />
    </div>
  )
}
```

- [ ] **Step 7: Write `apps/web/src/pages/signin/hooks/useSignin.ts`**

```typescript
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type { UseFormSetError } from 'react-hook-form'

import { apiClient, ApiError } from '#/utils/api/client'
import type { LoginFormValues } from '#/utils/validation/authSchemas'

type User = { id: number; name: string; email: string; created_at: string }

export const useSignin = ({ setError }: { setError: UseFormSetError<LoginFormValues> }) => {
  const router = useRouter()

  return useMutation<User, ApiError, LoginFormValues>({
    mutationFn: (values) => apiClient.post<User>('/auth/login', values),
    onSuccess: () => {
      router.navigate({ to: '/dashboard' })
    },
    onError: (error) => {
      if (error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof LoginFormValues, { message })
        }
      }
    },
  })
}
```

- [ ] **Step 8: Write `apps/web/src/pages/signin/components/SigninForm.tsx`**

```typescript
import { Link } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '#/components/Button'
import { Input } from '#/components/Input'
import { PasswordInput } from '#/components/PasswordInput'
import { SocialIconButton } from '#/components/SocialIconButton'
import { GithubIcon, GoogleIcon } from '#/components/SocialIconButton/icons'
import { loginSchema, type LoginFormValues } from '#/utils/validation/authSchemas'
import { useSignin } from '../hooks/useSignin'

export const SigninForm = () => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const signin = useSignin({ setError })

  return (
    <form onSubmit={handleSubmit((values) => signin.mutate(values))} className="space-y-4">
      {signin.isError && !signin.error.fieldErrors ? (
        <p className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">{signin.error.message}</p>
      ) : null}

      <div>
        <Input placeholder="Email" type="email" {...register('email')} />
        {errors.email ? <p className="mt-1 text-sm text-red-400">{errors.email.message}</p> : null}
      </div>

      <div>
        <PasswordInput placeholder="Password" {...register('password')} />
        {errors.password ? <p className="mt-1 text-sm text-red-400">{errors.password.message}</p> : null}
      </div>

      <div className="text-right text-sm">
        <Link to="/forgot-password" className="text-violet-400 hover:text-violet-300">
          Forgot password?
        </Link>
      </div>

      <Button type="submit" isLoading={isSubmitting || signin.isPending}>
        Sign in
      </Button>

      <div className="flex items-center justify-center gap-3 pt-2">
        <SocialIconButton label="Sign in with Google" icon={<GoogleIcon />} />
        <SocialIconButton label="Sign in with GitHub" icon={<GithubIcon />} />
      </div>

      <p className="text-center text-sm text-neutral-400">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="text-violet-400 hover:text-violet-300">
          Sign up
        </Link>
      </p>
    </form>
  )
}
```

- [ ] **Step 9: Replace `apps/web/src/routes/login.tsx`**

```typescript
import { createFileRoute } from '@tanstack/react-router'

import { AuthLayout } from '#/components/AuthLayout'
import { SigninForm } from '#/pages/signin/components/SigninForm'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue to AstroJobs">
      <SigninForm />
    </AuthLayout>
  )
}
```

(The `/login` and `/signup` → `/dashboard` redirect-when-already-authenticated guard is added later, in Task 13, once `getCurrentUser` exists — don't add it here.)

- [ ] **Step 10: Verify in the browser**

```bash
# terminal 1
cd apps/api && uv run fastapi dev main.py
# terminal 2
cd apps/web && pnpm dev
```

Create a test user via curl (the `/signup` page doesn't exist until Task 10):

```bash
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Browser Test","email":"browser-test@example.com","password":"password123"}'
```

Open `http://localhost:3000/login`. Confirm: dark split-screen layout renders; submitting empty fields shows inline zod errors; submitting `wrong@example.com` / `wrongpass` shows the "Invalid email or password" banner; submitting `browser-test@example.com` / `password123` succeeds (Application → Cookies in devtools shows an httpOnly `jwt` cookie) — the page navigates to `/dashboard`, which doesn't exist yet, so it's fine to see a blank page there; that route is built in Task 13.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/components apps/web/src/pages/signin apps/web/src/routes/login.tsx
git commit -m "feat(web): add signin page and shared auth UI components"
```

---

## Task 10: Signup page

**Files:**
- Create: `apps/web/src/pages/signup/hooks/useSignup.ts`
- Create: `apps/web/src/pages/signup/components/SignupForm.tsx`
- Create: `apps/web/src/routes/signup.tsx`

**Interfaces:**
- Consumes: `apiClient`, `ApiError` from Task 8; `signupSchema`, `SignupFormValues` from Task 8; `Button`, `Input`, `PasswordInput`, `SocialIconButton`, `GoogleIcon`, `GithubIcon`, `AuthLayout` from Task 9.
- Produces: `SignupForm` at `#/pages/signup/components/SignupForm`, rendered by `/signup`.

- [ ] **Step 1: Write `apps/web/src/pages/signup/hooks/useSignup.ts`**

```typescript
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type { UseFormSetError } from 'react-hook-form'

import { apiClient, ApiError } from '#/utils/api/client'
import type { SignupFormValues } from '#/utils/validation/authSchemas'

type User = { id: number; name: string; email: string; created_at: string }

export const useSignup = ({ setError }: { setError: UseFormSetError<SignupFormValues> }) => {
  const router = useRouter()

  return useMutation<User, ApiError, SignupFormValues>({
    mutationFn: ({ confirmPassword: _confirmPassword, ...body }) =>
      apiClient.post<User>('/auth/signup', body),
    onSuccess: () => {
      router.navigate({ to: '/dashboard' })
    },
    onError: (error) => {
      if (error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof SignupFormValues, { message })
        }
      }
    },
  })
}
```

- [ ] **Step 2: Write `apps/web/src/pages/signup/components/SignupForm.tsx`**

```typescript
import { Link } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '#/components/Button'
import { Input } from '#/components/Input'
import { PasswordInput } from '#/components/PasswordInput'
import { SocialIconButton } from '#/components/SocialIconButton'
import { GithubIcon, GoogleIcon } from '#/components/SocialIconButton/icons'
import { signupSchema, type SignupFormValues } from '#/utils/validation/authSchemas'
import { useSignup } from '../hooks/useSignup'

export const SignupForm = () => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) })

  const signup = useSignup({ setError })

  return (
    <form onSubmit={handleSubmit((values) => signup.mutate(values))} className="space-y-4">
      {signup.isError && !signup.error.fieldErrors ? (
        <p className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">{signup.error.message}</p>
      ) : null}

      <div>
        <Input placeholder="Full name" {...register('name')} />
        {errors.name ? <p className="mt-1 text-sm text-red-400">{errors.name.message}</p> : null}
      </div>

      <div>
        <Input placeholder="Email" type="email" {...register('email')} />
        {errors.email ? <p className="mt-1 text-sm text-red-400">{errors.email.message}</p> : null}
      </div>

      <div>
        <PasswordInput placeholder="Password" {...register('password')} />
        {errors.password ? <p className="mt-1 text-sm text-red-400">{errors.password.message}</p> : null}
      </div>

      <div>
        <PasswordInput placeholder="Confirm password" {...register('confirmPassword')} />
        {errors.confirmPassword ? (
          <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      <Button type="submit" isLoading={isSubmitting || signup.isPending}>
        Create account
      </Button>

      <div className="flex items-center justify-center gap-3 pt-2">
        <SocialIconButton label="Sign up with Google" icon={<GoogleIcon />} />
        <SocialIconButton label="Sign up with GitHub" icon={<GithubIcon />} />
      </div>

      <p className="text-center text-sm text-neutral-400">
        Already have an account?{' '}
        <Link to="/login" className="text-violet-400 hover:text-violet-300">
          Sign in
        </Link>
      </p>
    </form>
  )
}
```

- [ ] **Step 3: Write `apps/web/src/routes/signup.tsx`**

```typescript
import { createFileRoute } from '@tanstack/react-router'

import { AuthLayout } from '#/components/AuthLayout'
import { SignupForm } from '#/pages/signup/components/SignupForm'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  return (
    <AuthLayout title="Create your account" subtitle="Start matching with jobs on AstroJobs">
      <SignupForm />
    </AuthLayout>
  )
}
```

- [ ] **Step 4: Regenerate the route tree**

```bash
cd apps/web
pnpm generate-routes
```

- [ ] **Step 5: Verify in the browser**

With both dev servers still running, open `http://localhost:3000/signup`. Confirm: submitting mismatched passwords shows "Passwords do not match" on the confirm field; submitting `curl-test@example.com` (created in Task 7) shows the 409 "Email already in use" banner; submitting a brand-new email/password succeeds, sets the `jwt` cookie, and navigates to `/dashboard` (still blank until Task 13).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/signup apps/web/src/routes/signup.tsx apps/web/src/routeTree.gen.ts
git commit -m "feat(web): add signup page"
```

---

## Task 11: Forgot-password page

**Files:**
- Create: `apps/web/src/pages/forgot-password/hooks/useForgotPassword.ts`
- Create: `apps/web/src/pages/forgot-password/components/ForgotPasswordForm.tsx`
- Create: `apps/web/src/routes/forgot-password.tsx`

**Interfaces:**
- Consumes: `apiClient` from Task 8; `forgotPasswordSchema`, `ForgotPasswordFormValues` from Task 8; `Button`, `Input`, `AuthLayout` from Task 9.
- Produces: `ForgotPasswordForm` at `#/pages/forgot-password/components/ForgotPasswordForm`, rendered by `/forgot-password` (already linked from `/login`, see Task 9 Step 8).

Note on scope: unlike `/`, `/dashboard`, `/login`, and `/signup` (guarded in Task 13), `/forgot-password` has no `beforeLoad` auth guard — an already-authenticated user can still open it. Only the four routes above were confirmed as needing session-based redirects; there's no harm in leaving a password-reset entry point reachable regardless of session state.

- [ ] **Step 1: Write `apps/web/src/pages/forgot-password/hooks/useForgotPassword.ts`**

```typescript
import { useMutation } from '@tanstack/react-query'

import { apiClient, ApiError } from '#/utils/api/client'
import type { ForgotPasswordFormValues } from '#/utils/validation/authSchemas'

export const useForgotPassword = () => {
  return useMutation<{ ok: boolean }, ApiError, ForgotPasswordFormValues>({
    mutationFn: (values) => apiClient.post<{ ok: boolean }>('/auth/forgot-password', values),
  })
}
```

- [ ] **Step 2: Write `apps/web/src/pages/forgot-password/components/ForgotPasswordForm.tsx`**

```typescript
import { Link } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '#/components/Button'
import { Input } from '#/components/Input'
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '#/utils/validation/authSchemas'
import { useForgotPassword } from '../hooks/useForgotPassword'

export const ForgotPasswordForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) })

  const forgotPassword = useForgotPassword()

  if (forgotPassword.isSuccess) {
    return (
      <p className="text-sm text-neutral-300">
        If that email is registered, we&apos;ve sent a link to reset your password.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit((values) => forgotPassword.mutate(values))} className="space-y-4">
      {forgotPassword.isError ? (
        <p className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">{forgotPassword.error.message}</p>
      ) : null}

      <div>
        <Input placeholder="Email" type="email" {...register('email')} />
        {errors.email ? <p className="mt-1 text-sm text-red-400">{errors.email.message}</p> : null}
      </div>

      <Button type="submit" isLoading={isSubmitting || forgotPassword.isPending}>
        Send reset link
      </Button>

      <p className="text-center text-sm text-neutral-400">
        <Link to="/login" className="text-violet-400 hover:text-violet-300">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
```

- [ ] **Step 3: Write `apps/web/src/routes/forgot-password.tsx`**

```typescript
import { createFileRoute } from '@tanstack/react-router'

import { AuthLayout } from '#/components/AuthLayout'
import { ForgotPasswordForm } from '#/pages/forgot-password/components/ForgotPasswordForm'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to get back in">
      <ForgotPasswordForm />
    </AuthLayout>
  )
}
```

- [ ] **Step 4: Regenerate the route tree**

```bash
cd apps/web
pnpm generate-routes
```

- [ ] **Step 5: Verify in the browser**

Open `http://localhost:3000/forgot-password`. Submit `browser-test@example.com` (created in Task 9) — confirm the generic "If that email is registered…" message replaces the form, and the `fastapi dev` terminal logs a `reset-password?token=...` link. Submit a nonexistent email — confirm the same generic message appears (no way to tell the difference). Keep the logged token link handy for Task 12.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/forgot-password apps/web/src/routes/forgot-password.tsx apps/web/src/routeTree.gen.ts
git commit -m "feat(web): add forgot-password page"
```

---

## Task 12: Reset-password page

**Files:**
- Create: `apps/web/src/pages/reset-password/hooks/useResetPassword.ts`
- Create: `apps/web/src/pages/reset-password/components/ResetPasswordForm.tsx`
- Create: `apps/web/src/routes/reset-password.tsx`

**Interfaces:**
- Consumes: `apiClient`, `ApiError` from Task 8; `resetPasswordSchema`, `ResetPasswordFormValues` from Task 8; `Button`, `PasswordInput`, `AuthLayout` from Task 9.
- Produces: `ResetPasswordForm` at `#/pages/reset-password/components/ResetPasswordForm`, rendered by `/reset-password?token=...`.

Note on scope: like `/forgot-password`, this route has no `beforeLoad` auth guard (see Task 11's note) — reachable regardless of session state.

- [ ] **Step 1: Write `apps/web/src/pages/reset-password/hooks/useResetPassword.ts`**

```typescript
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import { apiClient, ApiError } from '#/utils/api/client'
import type { ResetPasswordFormValues } from '#/utils/validation/authSchemas'

export const useResetPassword = (token: string) => {
  const router = useRouter()

  return useMutation<{ ok: boolean }, ApiError, ResetPasswordFormValues>({
    mutationFn: (values) => apiClient.post('/auth/reset-password', { token, new_password: values.password }),
    onSuccess: () => {
      router.navigate({ to: '/login' })
    },
  })
}
```

- [ ] **Step 2: Write `apps/web/src/pages/reset-password/components/ResetPasswordForm.tsx`**

```typescript
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '#/components/Button'
import { PasswordInput } from '#/components/PasswordInput'
import { resetPasswordSchema, type ResetPasswordFormValues } from '#/utils/validation/authSchemas'
import { useResetPassword } from '../hooks/useResetPassword'

export const ResetPasswordForm = ({ token }: { token: string }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) })

  const resetPassword = useResetPassword(token)

  return (
    <form onSubmit={handleSubmit((values) => resetPassword.mutate(values))} className="space-y-4">
      {resetPassword.isError ? (
        <p className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">{resetPassword.error.message}</p>
      ) : null}

      <div>
        <PasswordInput placeholder="New password" {...register('password')} />
        {errors.password ? <p className="mt-1 text-sm text-red-400">{errors.password.message}</p> : null}
      </div>

      <div>
        <PasswordInput placeholder="Confirm new password" {...register('confirmPassword')} />
        {errors.confirmPassword ? (
          <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      <Button type="submit" isLoading={isSubmitting || resetPassword.isPending}>
        Reset password
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Write `apps/web/src/routes/reset-password.tsx`**

```typescript
import { createFileRoute } from '@tanstack/react-router'

import { AuthLayout } from '#/components/AuthLayout'
import { ResetPasswordForm } from '#/pages/reset-password/components/ResetPasswordForm'

type ResetPasswordSearch = { token: string }

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()

  return (
    <AuthLayout title="Choose a new password" subtitle="Enter a new password for your account">
      <ResetPasswordForm token={token} />
    </AuthLayout>
  )
}
```

- [ ] **Step 4: Regenerate the route tree**

```bash
cd apps/web
pnpm generate-routes
```

- [ ] **Step 5: Verify in the browser**

Take the reset link logged in Task 11 (`FRONTEND_ORIGIN` is `http://localhost:3000` per `.env.example`, so the logged link already points at the frontend, e.g. `http://localhost:3000/reset-password?token=...`) and open it. Submit mismatched passwords — confirm "Passwords do not match". Submit a valid new password — confirm it redirects to `/login`. Log in with the new password — confirm it succeeds. Reopen the same reset link and submit again — confirm the "Invalid or expired reset token" banner appears (token is single-use).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/reset-password apps/web/src/routes/reset-password.tsx apps/web/src/routeTree.gen.ts
git commit -m "feat(web): add reset-password page"
```

---

## Task 13: Session routing guard (/ , /dashboard, and auth-page redirects)

**Files:**
- Create: `apps/web/src/utils/auth/getCurrentUser.server.ts`
- Create: `apps/web/src/components/LoadingScreen/index.tsx`
- Create: `apps/web/src/pages/dashboard/hooks/useLogout.ts`
- Create: `apps/web/src/pages/dashboard/components/DashboardStub.tsx`
- Create: `apps/web/src/routes/dashboard.tsx`
- Modify: `apps/web/src/routes/index.tsx`
- Modify: `apps/web/src/routes/login.tsx`
- Modify: `apps/web/src/routes/signup.tsx`

**Interfaces:**
- Consumes: `apiClient` from Task 8 (used by `useLogout.ts`; `getCurrentUser.server.ts` itself talks to the API directly via `fetch`, forwarding the raw cookie header, since it runs server-side before a browser `credentials: 'include'` fetch is possible); `Button` from Task 9; `AuthLayout`/`SigninForm`/`SignupForm` from Tasks F2–F3.
- Produces: `getCurrentUser(): Promise<{id,name,email,created_at} | null>` server function from `#/utils/auth/getCurrentUser.server`, used in `beforeLoad` on `/`, `/dashboard`, `/login`, `/signup`. `LoadingScreen` component from `#/components/LoadingScreen`, used as the `pendingComponent` on `/` and `/dashboard` while `getCurrentUser()` is in flight (e.g. on a client-side navigation, or a slow/unreachable API).

Note on scope: the earlier design sketch mentioned a client-side `useAuth` hook wrapping `GET /auth/me`. It's dropped here — `/dashboard`'s `beforeLoad` already fetches and SSR-verifies the user via `getCurrentUser`, and passing that through route context (`Route.useRouteContext()`) avoids a redundant second fetch from the browser with no other consumer in this task's scope.

- [ ] **Step 1: Write `apps/web/src/utils/auth/getCurrentUser.server.ts`**

```typescript
import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

const API_URL = import.meta.env.VITE_API_URL as string

type CurrentUser = { id: number; name: string; email: string; created_at: string }

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CurrentUser | null> => {
    const token = getCookie('jwt')
    if (!token) return null

    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { cookie: `jwt=${token}` },
      })
      if (!response.ok) return null
      return (await response.json()) as CurrentUser
    } catch {
      // API unreachable (e.g. not running, or DB not connected yet) — fail safe to "not logged in"
      return null
    }
  },
)
```

- [ ] **Step 2: Write `apps/web/src/components/LoadingScreen/index.tsx`**

```typescript
export const LoadingScreen = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-100">
      <div
        role="status"
        aria-label="Loading"
        className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-violet-500"
      />
    </div>
  )
}
```

- [ ] **Step 3: Write `apps/web/src/pages/dashboard/hooks/useLogout.ts`**

```typescript
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import { apiClient } from '#/utils/api/client'

export const useLogout = () => {
  const router = useRouter()

  return useMutation({
    mutationFn: () => apiClient.post<{ ok: boolean }>('/auth/logout'),
    onSuccess: () => {
      router.navigate({ to: '/login' })
    },
  })
}
```

- [ ] **Step 4: Write `apps/web/src/pages/dashboard/components/DashboardStub.tsx`**

```typescript
import { Button } from '#/components/Button'
import { useLogout } from '../hooks/useLogout'

export const DashboardStub = ({ name }: { name: string }) => {
  const logout = useLogout()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 text-neutral-100">
      <p className="text-xl">Welcome, {name}</p>
      <div className="w-48">
        <Button onClick={() => logout.mutate()} isLoading={logout.isPending}>
          Log out
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write `apps/web/src/routes/dashboard.tsx`**

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router'

import { DashboardStub } from '#/pages/dashboard/components/DashboardStub'
import { LoadingScreen } from '#/components/LoadingScreen'
import { getCurrentUser } from '#/utils/auth/getCurrentUser.server'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) {
      throw redirect({ to: '/login' })
    }
    return { user }
  },
  pendingComponent: LoadingScreen,
  pendingMs: 0,
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = Route.useRouteContext()
  return <DashboardStub name={user.name} />
}
```

`pendingMs: 0` shows `LoadingScreen` immediately once the navigation starts, instead of TanStack Router's default ~1s grace period before showing pending UI — appropriate here since there's nothing else to render on this route while `getCurrentUser()` resolves.

- [ ] **Step 6: Replace `apps/web/src/routes/index.tsx`**

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router'

import { LoadingScreen } from '#/components/LoadingScreen'
import { getCurrentUser } from '#/utils/auth/getCurrentUser.server'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    throw redirect({ to: user ? '/dashboard' : '/login' })
  },
  pendingComponent: LoadingScreen,
  pendingMs: 0,
})
```

- [ ] **Step 7: Update `apps/web/src/routes/login.tsx`** to redirect away when already authenticated

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router'

import { AuthLayout } from '#/components/AuthLayout'
import { SigninForm } from '#/pages/signin/components/SigninForm'
import { getCurrentUser } from '#/utils/auth/getCurrentUser.server'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (user) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue to AstroJobs">
      <SigninForm />
    </AuthLayout>
  )
}
```

- [ ] **Step 8: Update `apps/web/src/routes/signup.tsx`** the same way

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router'

import { AuthLayout } from '#/components/AuthLayout'
import { SignupForm } from '#/pages/signup/components/SignupForm'
import { getCurrentUser } from '#/utils/auth/getCurrentUser.server'

export const Route = createFileRoute('/signup')({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (user) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SignupPage,
})

function SignupPage() {
  return (
    <AuthLayout title="Create your account" subtitle="Start matching with jobs on AstroJobs">
      <SignupForm />
    </AuthLayout>
  )
}
```

- [ ] **Step 9: Regenerate the route tree**

```bash
cd apps/web
pnpm generate-routes
```

- [ ] **Step 10: Verify the full matrix in the browser**

With the frontend dev server running (`pnpm dev` in `apps/web`) — this step first checks the no-backend case, then the full authenticated matrix once the API from Task 7 is also running:

1. **Without the API running** (or before Task 1's Postgres container is up), clear the `jwt` cookie and visit `http://localhost:3000/`. Since there's no cookie yet, `getCurrentUser()` returns `null` without attempting a network call, so this redirects straight to `/login` — confirming the "no DB connected yet, falls through to signin" behavior is intentional, not a bug.
2. To see the `LoadingScreen` itself, throttle the network in devtools (Network tab → Slow 3G) and reload `/` — the spinner should appear briefly before the redirect to `/login` completes.
3. Now start the full stack (`docker compose up -d db`, `apps/api`'s `fastapi dev main.py`, and `apps/web`'s `pnpm dev`) and repeat the matrix: visit `http://localhost:3000/dashboard` directly → redirected to `/login`. Log in with `browser-test@example.com` / `password123` → redirected to `/dashboard`, shows "Welcome, Browser Test" and a Log out button. Visit `http://localhost:3000/` again → redirected to `/dashboard` (not `/login`, since you're authenticated). Visit `http://localhost:3000/login` → redirected to `/dashboard`. Visit `http://localhost:3000/signup` → redirected to `/dashboard`. Click "Log out" → redirected to `/login`; devtools shows the `jwt` cookie is gone. Visit `http://localhost:3000/dashboard` again → redirected to `/login` (confirms logout actually cleared the session, not just the local page state).
4. Stop the API (`Ctrl+C` the `fastapi dev` process) while still holding a valid `jwt` cookie, then visit `http://localhost:3000/`. Confirm it redirects to `/login` (not a crash/500) — this exercises the `try/catch` in `getCurrentUser.server.ts` for an unreachable API.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/utils/auth apps/web/src/components/LoadingScreen apps/web/src/pages/dashboard apps/web/src/routes/dashboard.tsx apps/web/src/routes/index.tsx apps/web/src/routes/login.tsx apps/web/src/routes/signup.tsx apps/web/src/routeTree.gen.ts
git commit -m "feat(web): add session routing guard for /, /dashboard, and auth pages"
```
