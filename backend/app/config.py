from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/eddit_ai"
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080
    upload_dir: str = "uploads"
    cors_origins: str = "http://localhost:5173"
    cors_allow_railway: bool = True
    cors_allow_vercel: bool = True

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    frontend_url: str = "http://localhost:5173"

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: object) -> str:
        if not isinstance(value, str):
            raise ValueError("DATABASE_URL must be a string")

        url = value.strip()
        if not url:
            raise ValueError("DATABASE_URL is empty")

        # Common manual typo on Railway: postgresql+pyscopg://
        url = url.replace("postgresql+pyscopg://", "postgresql+psycopg://", 1)

        if url.startswith("postgresql+psycopg://"):
            return url

        if url.startswith("postgres://"):
            url = "postgresql+psycopg://" + url[len("postgres://") :]
        elif url.startswith("postgresql+psycopg2://"):
            url = "postgresql+psycopg://" + url[len("postgresql+psycopg2://") :]
        elif url.startswith("postgresql://"):
            url = "postgresql+psycopg://" + url[len("postgresql://") :]

        if not url.startswith("postgresql+"):
            raise ValueError(
                "DATABASE_URL must be a full PostgreSQL connection string "
                "(e.g. postgresql+psycopg://user:pass@host:5432/db). "
                "On Railway, use Variables → Reference → Postgres → DATABASE_URL. "
                "Do not paste only a hostname."
            )

        return url


settings = Settings()
