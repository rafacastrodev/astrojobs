from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Both apps read from the single repo-root .env (apps/web does the same via
# vite.config.ts's envDir). Locally that's 5 levels up from this file
# (config.py -> database -> infrastructure -> src -> api -> apps -> <root>).
# Inside the Docker image only `src/` is copied in (no repo-root ancestor
# exists there at all) — in that case this just falls back to the shallowest
# parent available, ENV_FILE won't exist, and config comes purely from real
# environment variables (which is exactly what docker-compose provides).
_HERE = Path(__file__).resolve()
ROOT_DIR = _HERE.parents[5] if len(_HERE.parents) > 5 else _HERE.parents[-1]
ENV_FILE = ROOT_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # DATABASE_URL, if set, is used as-is (e.g. a full non-Postgres connection
    # string for local dev). Otherwise it's built from the POSTGRES_* parts
    # below — this is what lets docker-compose point at a different host/port
    # (e.g. POSTGRES_HOST=db) without hardcoding a full URL anywhere.
    database_url: str | None = None
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_db: str = "postgres"

    jwt_secret: str
    jwt_expires_minutes: int = 60 * 24 * 7
    cookie_secure: bool = False
    frontend_origin: str = "http://localhost:3000"
    environment: str = "development"

    pinecone_api_key: str = ""
    pinecone_index_name: str = ""
    pinecone_namespace_resumes: str = "resumes"
    pinecone_namespace_jobs: str = "jobs"
    embedding_dimensions: int = 384

    @model_validator(mode="after")
    def _build_database_url(self) -> "Settings":
        if not self.database_url:
            self.database_url = (
                f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
                f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
            )
        return self


settings = Settings()
