"""Configuración central de la aplicación (variables de entorno)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "AuditFlow API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    SECRET_KEY: str = "cambiar-en-produccion-por-clave-larga-y-aleatoria"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # sqlite:///./auditflow.db (dev sin Docker)
    # postgresql+psycopg://user:pass@host:5432/dbname (Docker / producción)
    DATABASE_URL: str = "sqlite:///./auditflow.db"

    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:8080"]

    ADMIN_EMAIL: str = "admin@auditflow.local"
    ADMIN_PASSWORD: str = "Admin123!"
    ADMIN_NAME: str = "Administrador"


@lru_cache
def get_settings() -> Settings:
    return Settings()
