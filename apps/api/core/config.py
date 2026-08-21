from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[3]
ENV_FILE = ROOT_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str
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


settings = Settings()
