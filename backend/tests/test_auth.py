"""Pruebas de autenticación y control de acceso (Sprint 0)."""

from .utils import ADMIN_EMAIL, ADMIN_PASSWORD, auth_headers, login


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_login_admin_ok(client):
    r = login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    assert r.status_code == 200
    data = r.json()
    assert data["access_token"]
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == ADMIN_EMAIL
    assert data["user"]["role"] == "admin"


def test_login_wrong_password(client):
    r = login(client, ADMIN_EMAIL, "clave-incorrecta")
    assert r.status_code == 401


def test_login_unknown_user(client):
    r = login(client, "nadie@test.local", "Clave12345")
    assert r.status_code == 401


def test_me_with_token(client):
    headers = auth_headers(client)
    r = client.get("/api/auth/me", headers=headers)
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL


def test_me_without_token(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_me_with_invalid_token(client):
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer token-invalido"})
    assert r.status_code == 401


def test_admin_creates_user_and_role_guard(client):
    headers = auth_headers(client)
    r = client.post(
        "/api/users",
        json={
            "email": "auditor1@test.local",
            "full_name": "Auditor Uno",
            "password": "Secret123!",
            "role": "auditor",
        },
        headers=headers,
    )
    assert r.status_code == 201
    assert r.json()["role"] == "auditor"

    # El auditor puede iniciar sesión...
    r_login = login(client, "auditor1@test.local", "Secret123!")
    assert r_login.status_code == 200
    auditor_headers = {"Authorization": f"Bearer {r_login.json()['access_token']}"}

    # ...pero NO puede listar usuarios (solo admin).
    r_users = client.get("/api/users", headers=auditor_headers)
    assert r_users.status_code == 403


def test_admin_cannot_create_duplicate_email(client):
    headers = auth_headers(client)
    payload = {
        "email": "dup@test.local",
        "full_name": "Duplicado",
        "password": "Secret123!",
        "role": "auditor",
    }
    assert client.post("/api/users", json=payload, headers=headers).status_code == 201
    r = client.post("/api/users", json=payload, headers=headers)
    assert r.status_code == 409


def test_admin_can_list_users(client):
    headers = auth_headers(client)
    r = client.get("/api/users", headers=headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert len(r.json()) >= 1
