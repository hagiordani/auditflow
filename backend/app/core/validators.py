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
