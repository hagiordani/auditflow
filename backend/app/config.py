"""Configuración central de la aplicación (variables de entorno)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "AuditFlow API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # development | staging | production
    ENVIRONMENT: str = "development"

    SECRET_KEY: str = "cambiar-en-produccion-por-clave-larga-y-aleatoria"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # sqlite:///./auditflow.db (dev sin Docker)
    # postgresql+psycopg://user:pass@host:5432/dbname (Docker / producción)
    DATABASE_URL: str = "sqlite:///./auditflow.db"

    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:8080"]

    # URL pública del frontend (para los enlaces en correos, p. ej. contraseña temporal)
    FRONTEND_URL: str = "https://auditflow.hcar.cloud"

    # Límite general de peticiones de API por IP (por minuto)
    RATE_LIMIT_PER_MINUTE: int = 300

    # Almacenamiento local de documentos (en producción usar volumen privado)
    UPLOAD_DIR: str = "./uploads"

    # (SEC-05) Cifrado en reposo de documentos. Clave Fernet (32 bytes urlsafe-b64).
    # Si está vacía, se deriva de SECRET_KEY (sha256). En producción conviene
    # definir una clave explícita e independiente y rotarla sin perder los archivos.
    DOCUMENT_ENCRYPTION_KEY: str | None = None

    ADMIN_EMAIL: str = "admin@auditflow.local"
    ADMIN_PASSWORD: str = "Admin123!"
    ADMIN_NAME: str = "Administrador"

    # --- Correo (SMTP) para envío de contraseñas temporales / notificaciones ---
    # Si SMTP_HOST está vacío, el mailer registra el contenido en logs (dev).
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM: str = "AuditFlow <no-reply@auditflow.local>"
    SMTP_STARTTLS: bool = True
    SMTP_USE_SSL: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
