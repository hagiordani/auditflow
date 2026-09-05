"""Cifrado en reposo de documentos (SEC-05).

Los archivos subidos se guardan cifrados con Fernet (AES-128-CBC + HMAC).
La clave se toma de DOCUMENT_ENCRYPTION_KEY; si no está definida, se deriva
determinísticamente de SECRET_KEY (sha256) para que "funcione sin configuración"
en desarrollo, permitiendo una clave explícita en producción.

Compatibilidad: decrypt_bytes_or_raw intenta descifrar y, si el contenido no es
un token Fernet válido (archivos anteriores guardados en claro), devuelve los
bytes originales sin error.
"""

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings


def _fernet() -> Fernet:
    settings = get_settings()
    key_material = settings.DOCUMENT_ENCRYPTION_KEY or settings.SECRET_KEY
    # Fernet espera una clave de 32 bytes en urlsafe base64.
    key = base64.urlsafe_b64encode(hashlib.sha256(key_material.encode("utf-8")).digest())
    return Fernet(key)


def encrypt_bytes(data: bytes) -> bytes:
    """Cifra un bloque de bytes y devuelve el token Fernet."""
    return _fernet().encrypt(data)


def decrypt_bytes(data: bytes) -> bytes:
    """Descifra un token Fernet. Lanza InvalidToken si no es válido."""
    return _fernet().decrypt(data)


def decrypt_bytes_or_raw(data: bytes) -> bytes:
    """Descifra; si el contenido no es un token Fernet, lo devuelve tal cual.

    Permite leer documentos guardados antes de activar el cifrado sin migración.
    """
    try:
        return _fernet().decrypt(data)
    except InvalidToken:
        return data
