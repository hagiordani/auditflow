"""Pruebas unitarias del cifrado en reposo de documentos (SEC-05)."""

import base64
import hashlib

import pytest
from cryptography.fernet import Fernet, InvalidToken

from app.core.crypto import decrypt_bytes, decrypt_bytes_or_raw, encrypt_bytes
from app.config import get_settings


def _other_fernet() -> Fernet:
    # Una clave distinta, para comprobar que un token ajeno no se descifra.
    seed = get_settings().SECRET_KEY + "-distinta"
    key = base64.urlsafe_b64encode(hashlib.sha256(seed.encode()).digest())
    return Fernet(key)


def test_round_trip_encrypt_decrypt():
    original = b"contenido de auditoria privado \x00\x01\x02"
    ciphertext = encrypt_bytes(original)
    assert ciphertext != original
    assert original not in ciphertext
    assert decrypt_bytes(ciphertext) == original


def test_backward_compat_plaintext_read():
    # Un archivo guardado antes de activar el cifrado (en claro) debe leerse sin error.
    raw = b"documento legado sin cifrar"
    assert decrypt_bytes_or_raw(raw) == raw


def test_wrong_key_raises_invalid_token():
    ciphertext = encrypt_bytes(b"secret")
    with pytest.raises(InvalidToken):
        _other_fernet().decrypt(ciphertext)


def test_or_raw_does_not_return_cleartext_for_corrupt_token():
    # Si el token está corrupto, decrypt_bytes_or_raw NO debe devolver el
    # contenido original (devuelve los bytes corruptos tal cual: fail-safe).
    ciphertext = encrypt_bytes(b"cuidado")
    modified = ciphertext[:-4] + b"\x00\x00\x00\x00"
    result = decrypt_bytes_or_raw(modified)
    assert result == modified
