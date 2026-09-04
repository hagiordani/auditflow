"""Seguridad: hash de contraseñas y tokens JWT."""

import secrets
import string
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import get_settings


def generate_temp_password(length: int = 10) -> str:
    """Genera una contraseña temporal segura (letras + números, cumple la política)."""
    letters = string.ascii_letters
    digits = string.digits
    pool = letters + digits
    chars = [secrets.choice(letters), secrets.choice(digits)]
    chars += [secrets.choice(pool) for _ in range(max(0, length - len(chars)))]
    secrets.SystemRandom().shuffle(chars)
    return "".join(chars)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: int) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire, "iat": datetime.now(timezone.utc)}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def decode_access_token(token: str) -> int | None:
    """Devuelve el id de usuario si el token es válido; None en caso contrario."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
