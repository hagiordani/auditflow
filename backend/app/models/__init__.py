"""Modelos de datos (SQLAlchemy). Importar aquí para que Alembic los detecte."""

from app.models.user import User, UserRole

__all__ = ["User", "UserRole"]
