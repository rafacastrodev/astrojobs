from pathlib import Path
from urllib.parse import quote, urlsplit

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_HERE = Path(__file__).resolve()
ROOT_DIR = _HERE.parents[5] if len(_HERE.parents) > 5 else _HERE.parents[-1]
ENV_FILE = ROOT_DIR / ".env"

_DEV_ENVIRONMENTS = {"development", "dev", "local"}
_DOCKER_POSTGRES_HOST = "db"
_LOCAL_POSTGRES_HOST = "localhost"
_POSTGRES_PORT = 5432
_LOOPBACK_HOSTS = {"localhost", "127.0.0.1", "::1"}


def _running_in_docker() -> bool:
    return Path("/.dockerenv").exists()


def _points_at_loopback(url: str) -> bool:
    try:
        return (urlsplit(url).hostname or "") in _LOOPBACK_HOSTS
    except ValueError:
        # A malformed URL is not something to silently rewrite.
        return False


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

    # Cross-region inference profile id, e.g. "us.anthropic.claude-sonnet-4-6".
    # Verify the current id with: aws bedrock list-foundation-models --region <region>
    bedrock_model_id: str = ""

    aws_region: str = "us-east-1"
    aws_s3_bucket: str = ""
    # Empty means real AWS S3; set it to a LocalStack URL for dev and CI.
    aws_s3_endpoint_url: str = ""
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    max_upload_bytes: int = 5 * 1024 * 1024

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
            self.database_url = self._build_database_url()
        # pyrefly: ignore [bad-argument-type]
        elif in_docker and _points_at_loopback(self.database_url):
            # Rewrite a developer's localhost URL to the compose service name.
            # A URL aimed anywhere else — a managed database, for instance — is
            # left alone: rebuilding it here would silently drop its host and
            # any query parameters such as sslmode.
            self.database_url = self._build_database_url()

        if self.frontend_origin is None:
            self.frontend_origin = "http://localhost"

        return self

    def _build_database_url(self) -> str:
        """Assembles the URL from the POSTGRES_* parts.

        Credentials are percent-encoded: a generated password containing ``:``,
        ``?``, ``@`` or ``/`` — which managed services routinely produce —
        otherwise corrupts the URL, and the failure surfaces as an unrelated
        "port could not be cast to integer" error.
        """
        user = quote(self.postgres_user, safe="")
        password = quote(self.postgres_password, safe="")
        return (
            f"postgresql+psycopg://{user}:{password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


settings = Settings()
