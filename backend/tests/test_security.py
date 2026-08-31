"""Pruebas de seguridad del Sprint 8: contraseñas, rate limit y headers."""

from .utils import auth_headers


def test_weak_password_rejected(client):
    headers = auth_headers(client)
    # Sin números
    r = client.post(
        "/api/users",
        json={
            "email": "weak@test.local",
            "full_name": "Contraseña Débil",
            "password": "solamenteletras",
            "role": "auditor",
        },
        headers=headers,
    )
    assert r.status_code == 422

    # Sin letras
    r = client.post(
        "/api/users",
        json={
            "email": "weak@test.local",
            "full_name": "Contraseña Débil",
            "password": "1234567890",
            "role": "auditor",
        },
        headers=headers,
    )
    assert r.status_code == 422


def test_password_change_requires_strong_password(client):
    headers = auth_headers(client)
    r = client.post(
        "/api/auth/change-password",
        json={"current_password": "TestAdmin123!", "new_password": "sinumeros"},
        headers=headers,
    )
    assert r.status_code == 422


def test_login_rate_limit_after_failures(client):
    for _ in range(10):
        r = client.post(
            "/api/auth/login",
            json={"email": "admin@test.local", "password": "clave-incorrecta"},
        )
        assert r.status_code == 401
    # El undécimo intento (fallido) ya está bloqueado por rate limit
    r = client.post(
        "/api/auth/login",
        json={"email": "admin@test.local", "password": "clave-incorrecta"},
    )
    assert r.status_code == 429


def test_security_headers_present(client):
    r = client.get("/api/health")
    assert r.headers.get("x-content-type-options") == "nosniff"
    assert r.headers.get("x-frame-options") == "DENY"
    assert r.headers.get("referrer-policy") == "no-referrer"
