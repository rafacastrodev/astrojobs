from pathlib import Path

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_HERE = Path(__file__).resolve()
ROOT_DIR = _HERE.parents[5] if len(_HERE.parents) > 5 else _HERE.parents[-1]
ENV_FILE = ROOT_DIR / ".env"

_DEV_ENVIRONMENTS = {"development", "dev", "local"}
_DOCKER_POSTGRES_HOST = "db"
_LOCAL_POSTGRES_HOST = "localhost"
_POSTGRES_PORT = 5432


def _running_in_docker() -> bool:
    return Path("/.dockerenv").exists()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str | None = None
    postgres_host: str | None = None
    postgres_port: int | None = None
    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_db: str = "postgres"

    jwt_secret: str
    jwt_expires_minutes: int = 60 * 24 * 7
    cookie_secure: bool = False
    frontend_origin: str | None = None
    environment: str = "development"

    pinecone_api_key: str = ""
    pinecone_index_name: str = ""
    pinecone_namespace_resumes: str = "resumes"
    pinecone_namespace_jobs: str = "jobs"
    embedding_dimensions: int = 384

    @field_validator("database_url", "postgres_host", "frontend_origin", mode="before")
    @classmethod
    def _empty_str_to_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("postgres_port", mode="before")
    @classmethod
    def _empty_port_to_none(cls, value: object) -> object:
        if value == "" or value is None:
            return None
        return value

    @property
    def is_development(self) -> bool:
        return self.environment.strip().lower() in _DEV_ENVIRONMENTS

    @model_validator(mode="after")
    def _apply_environment_defaults(self) -> "Settings":
        in_docker = _running_in_docker()

        if in_docker and self.postgres_host in {None, _LOCAL_POSTGRES_HOST}:
            self.postgres_host = _DOCKER_POSTGRES_HOST
        elif self.postgres_host is None and self.is_development:
            self.postgres_host = _LOCAL_POSTGRES_HOST

        if self.postgres_port is None:
            self.postgres_port = _POSTGRES_PORT

        if self.frontend_origin is None and self.is_development:
            self.frontend_origin = (
                "http://localhost" if in_docker else "http://localhost:3000"
            )

        if not (self.database_url or "").strip():
            if self.postgres_host is None:
                raise ValueError(
                    "POSTGRES_HOST is required when ENVIRONMENT is not development"
                )
            self.database_url = (
                f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
                f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
            )
        elif in_docker:
            self.database_url = (
                f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
                f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
            )

        if self.frontend_origin is None:
            self.frontend_origin = "http://localhost"

        return self


settings = Settings()
