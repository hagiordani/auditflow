"""Seed inicial: crea el primer administrador si no existe."""

from app.auth.security import hash_password
from app.config import get_settings
from app.database import SessionLocal
from app.models.user import User, UserRole


def seed_admin() -> None:
    settings = get_settings()
    db = SessionLocal()
    try:
        email = settings.ADMIN_EMAIL.lower().strip()
        existing = db.query(User).filter(User.email == email).first()
        if existing is None:
            db.add(
                User(
                    email=email,
                    full_name=settings.ADMIN_NAME,
                    password_hash=hash_password(settings.ADMIN_PASSWORD),
                    role=UserRole.admin,
                    is_active=True,
                )
            )
            db.commit()
    finally:
        db.close()
