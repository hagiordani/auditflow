"""Validadores ligeros.

Se valida la SINTAXIS del correo (no su entregabilidad) para no bloquear
dominios corporativos internos o dominios sin MX temporalmente.
"""

import re
from typing import Annotated

from pydantic import AfterValidator

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")


def normalize_email(value: str) -> str:
    value = value.strip().lower()
    if not EMAIL_RE.fullmatch(value) or len(value) > 255:
        raise ValueError("Correo electrónico inválido")
    return value


Email = Annotated[str, AfterValidator(normalize_email)]


def validate_password_strength(value: str) -> str:
    """Política: mínimo 8 caracteres, con letras y números."""
    if len(value) < 8:
        raise ValueError("La contraseña debe tener al menos 8 caracteres")
    if not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
        raise ValueError("La contraseña debe incluir letras y números")
    return value


Password = Annotated[str, AfterValidator(validate_password_strength)]
