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
