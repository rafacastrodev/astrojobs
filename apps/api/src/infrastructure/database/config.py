import os
from pathlib import Path
from urllib.parse import quote, urlsplit

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_HERE = Path(__file__).resolve()
ROOT_DIR = _HERE.parents[5] if len(_HERE.parents) > 5 else _HERE.parents[-1]
ENV_FILE = ROOT_DIR / ".env"

_DEV_ENVIRONMENTS = {"development", "dev", "local"}
_DOCKER_POSTGRES_HOST = "postgres"
_DOCKER_POSTGRES_ALIASES = {"db", "postgres"}
_LOCAL_POSTGRES_HOST = "localhost"
_DOCKER_S3_HOST = "localstack"
_DEV_S3_BUCKET = "astrojobs-resumes"
_LOCAL_S3_ENDPOINT = "http://localhost:4566"
_POSTGRES_PORT = 5432
_LOOPBACK_HOSTS = {"localhost", "127.0.0.1", "::1"}
_DUMMY_AWS_ACCESS_KEYS = {"test", "localstack"}
_GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
_PRODUCTION_FRONTEND_ORIGIN = "https://astrojobs.rafacastro.dev"
_LIBPQ_ENV_KEYS = ("PGSSLMODE", "PGSSLROOTCERT")


def _drop_empty_libpq_env() -> None:
    for key in _LIBPQ_ENV_KEYS:
        value = os.environ.get(key)
        if value is not None and not value.strip():
            del os.environ[key]


def _running_in_docker() -> bool:
    return Path("/.dockerenv").exists()


def _hostname(url: str) -> str:
    try:
        return urlsplit(url).hostname or ""
    except ValueError:
        return ""


def _points_at_loopback(url: str) -> bool:
    return _hostname(url) in _LOOPBACK_HOSTS


def _rewrite_url_host(url: str, host: str) -> str:
    endpoint = urlsplit(url)
    port = f":{endpoint.port}" if endpoint.port else ""
    return f"{endpoint.scheme}://{host}{port}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
        env_ignore_empty=True,
        populate_by_name=True,
    )

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
    pinecone_embed_model: str = "multilingual-e5-large"
    embedding_dimensions: int = 1024
    embedding_provider: str = "auto"

    openai_api_key: str = ""
    openai_model: str = "gpt-5.4-nano"
    openai_moderation_model: str = "omni-moderation-latest"
    openai_embedding_model: str = "text-embedding-3-small"
    openai_timeout_seconds: float = 20.0
    openai_max_retries: int = 0

    llm_api_key: str = ""
    llm_model: str = ""
    llm_base_url: str = ""

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"
    gemini_embedding_model: str = "gemini-embedding-001"

    aws_bedrock_token: str = ""
    aws_bedrock_kb_name: str = ""
    aws_bedrock_data_source: str = ""
    aws_bedrock_gateway: str = ""
    aws_bedrock_gateway_target: str = ""
    agentcore_gateway_url: str = ""
    agentcore_retrieve_tool: str = ""
    bedrock_knowledge_base_id: str = ""

    aws_region: str = "us-east-1"
    aws_s3_bucket: str = ""
    # Empty means real AWS S3; set it to a LocalStack URL for dev and CI.
    aws_s3_endpoint_url: str = ""
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_session_token: str = ""
    max_upload_bytes: int = 5 * 1024 * 1024
    max_pdf_pages: int = 30
    max_extracted_chars: int = 200_000
    max_llm_input_chars: int = 50_000
    liveblocks_private_key: str = ""

    @field_validator("postgres_host", "frontend_origin", mode="before")
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

    @field_validator("embedding_provider")
    @classmethod
    def _validate_embedding_provider(cls, value: str) -> str:
        provider = value.strip().lower()
        if provider not in {"auto", "gemini", "openai", "local"}:
            raise ValueError("EMBEDDING_PROVIDER must be auto, gemini, openai or local")
        return provider

    @property
    def is_development(self) -> bool:
        return self.environment.strip().lower() in _DEV_ENVIRONMENTS

    @property
    def cors_allow_origins(self) -> list[str]:
        if self.is_development:
            origins = {
                (self.frontend_origin or "http://localhost:3000").rstrip("/"),
                "http://localhost",
                "http://localhost:3000",
                "http://127.0.0.1",
                "http://127.0.0.1:3000",
            }
            return sorted(origins)
        origin = (self.frontend_origin or _PRODUCTION_FRONTEND_ORIGIN).rstrip("/")
        return sorted({origin, _PRODUCTION_FRONTEND_ORIGIN})

    @property
    def uses_pgvector(self) -> bool:
        return self.is_development

    @property
    def uses_gemini(self) -> bool:
        return self.llm_model.strip().lower().startswith("gemini")

    @property
    def llm_configured(self) -> bool:
        return bool(self.llm_api_key.strip() and self.llm_model.strip())

    @property
    def uses_agentcore_gateway(self) -> bool:
        return bool(self.agentcore_gateway_url.strip())

    @property
    def uses_bedrock_kb(self) -> bool:
        return bool(self.bedrock_knowledge_base_id.strip())

    @property
    def llm_is_openai(self) -> bool:
        if not self.llm_base_url.strip():
            return True
        host = (_hostname(self.llm_base_url) or "").lower()
        return host == "api.openai.com" or host.endswith(".openai.com")

    @property
    def database_url(self) -> str:
        return self._build_database_url()

    @model_validator(mode="after")
    def _apply_environment_defaults(self) -> "Settings":
        in_docker = _running_in_docker()

        if in_docker and self.postgres_host in {
            None,
            _LOCAL_POSTGRES_HOST,
            *_DOCKER_POSTGRES_ALIASES,
        }:
            self.postgres_host = _DOCKER_POSTGRES_HOST
        elif (not in_docker and self.postgres_host in _DOCKER_POSTGRES_ALIASES) or (
            self.postgres_host is None and self.is_development
        ):
            self.postgres_host = _LOCAL_POSTGRES_HOST

        if self.postgres_port is None:
            self.postgres_port = _POSTGRES_PORT

        if self.frontend_origin is None and self.is_development:
            self.frontend_origin = (
                "http://localhost" if in_docker else "http://localhost:3000"
            )

        endpoint = self.aws_s3_endpoint_url.strip()
        if endpoint.startswith(("http://", "https://")):
            self.aws_s3_endpoint_url = endpoint
        else:
            self.aws_s3_endpoint_url = ""

        if self.is_development:
            local_s3 = not self.aws_s3_bucket.strip() and not self.aws_s3_endpoint_url
            if not self.aws_s3_bucket.strip():
                self.aws_s3_bucket = _DEV_S3_BUCKET
            if local_s3:
                self.aws_s3_endpoint_url = _LOCAL_S3_ENDPOINT

        if in_docker and _points_at_loopback(self.aws_s3_endpoint_url):
            self.aws_s3_endpoint_url = _rewrite_url_host(
                self.aws_s3_endpoint_url, _DOCKER_S3_HOST
            )
        elif not in_docker and _hostname(self.aws_s3_endpoint_url) == _DOCKER_S3_HOST:
            self.aws_s3_endpoint_url = _rewrite_url_host(
                self.aws_s3_endpoint_url, _LOCAL_POSTGRES_HOST
            )

        if self.postgres_host is None:
            raise ValueError(
                "POSTGRES_HOST is required when ENVIRONMENT is not development"
            )

        if not self.is_development:
            if not self.pinecone_api_key.strip() or not self.pinecone_index_name.strip():
                raise ValueError(
                    "PINECONE_API_KEY and PINECONE_INDEX_NAME are required "
                    "when ENVIRONMENT is not development"
                )
            self.cookie_secure = True

        if self.frontend_origin is None:
            self.frontend_origin = (
                ("http://localhost" if in_docker else "http://localhost:3000")
                if self.is_development
                else _PRODUCTION_FRONTEND_ORIGIN
            )

        self._resolve_llm()
        self._resolve_bedrock()
        return self

    def _resolve_llm(self) -> None:
        model = self.llm_model.strip()
        if not model:
            if self.gemini_api_key.strip():
                model = self.gemini_model.strip()
            else:
                model = self.openai_model.strip()
        self.llm_model = model

        key = self.llm_api_key.strip()
        if not key:
            if model.lower().startswith("gemini"):
                key = self.gemini_api_key.strip() or self.openai_api_key.strip()
            else:
                key = self.openai_api_key.strip() or self.gemini_api_key.strip()
        self.llm_api_key = key

        base_url = self.llm_base_url.strip()
        if not base_url and model.lower().startswith("gemini"):
            base_url = _GEMINI_OPENAI_BASE_URL
        self.llm_base_url = base_url.rstrip("/") + "/" if base_url else ""

    def _resolve_bedrock(self) -> None:
        target = self.aws_bedrock_gateway_target.strip() or "astrojobs-target"
        if not self.agentcore_retrieve_tool.strip():
            self.agentcore_retrieve_tool = f"{target}___Retrieve"

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

    def aws_client_credentials(self) -> dict[str, str | None]:
        key = (self.aws_access_key_id or "").strip()
        secret = (self.aws_secret_access_key or "").strip()
        if not key or not secret or key.lower() in _DUMMY_AWS_ACCESS_KEYS:
            return {}
        return {
            "aws_access_key_id": key,
            "aws_secret_access_key": secret,
            "aws_session_token": self.aws_session_token or None,
        }


_drop_empty_libpq_env()
settings = Settings()
