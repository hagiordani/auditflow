"""Pruebas de cierre del Sprint 1: activación/desactivación y cambio de contraseña."""

from .utils import auth_headers, login


def test_admin_can_deactivate_and_reactivate_user(client):
    headers = auth_headers(client)
    r = client.post(
        "/api/users",
        json={
            "email": "temp.user@test.local",
            "full_name": "Usuario Temporal",
            "password": "TempSecret123!",
            "role": "auditor",
        },
        headers=headers,
    )
    assert r.status_code == 201
    user_id = r.json()["id"]

    # Desactivar
    r = client.patch(f"/api/users/{user_id}", json={"is_active": False}, headers=headers)
    assert r.status_code == 200
    assert r.json()["is_active"] is False

    # El usuario desactivado ya no puede iniciar sesión
    r = login(client, "temp.user@test.local", "TempSecret123!")
    assert r.status_code == 403

    # Reactivar
    r = client.patch(f"/api/users/{user_id}", json={"is_active": True}, headers=headers)
    assert r.status_code == 200
    assert r.json()["is_active"] is True
    assert login(client, "temp.user@test.local", "TempSecret123!").status_code == 200


def test_change_own_password(client):
    headers = auth_headers(client)
    r = client.post(
        "/api/auth/change-password",
        json={"current_password": "clave-incorrecta", "new_password": "NuevaClave123!"},
        headers=headers,
    )
    assert r.status_code == 400  # contraseña actual incorrecta

    r = client.post(
        "/api/auth/change-password",
        json={"current_password": "TestAdmin123!", "new_password": "NuevaClave123!"},
        headers=headers,
    )
    assert r.status_code == 200

    # La contraseña anterior ya no funciona; la nueva sí.
    assert login(client, "admin@test.local", "TestAdmin123!").status_code == 401
    r = login(client, "admin@test.local", "NuevaClave123!")
    assert r.status_code == 200

    # Restaurar la contraseña original para no afectar a otros tests
    r = client.post(
        "/api/auth/change-password",
        json={"current_password": "NuevaClave123!", "new_password": "TestAdmin123!"},
        headers=headers,
    )
    assert r.status_code == 200


def test_admin_can_change_role_and_creates_auditor_profile(client):
    headers = auth_headers(client)
    r = client.post(
        "/api/users",
        json={
            "email": "cambiar.rol@test.local",
            "full_name": "Cambia Rol",
            "password": "CambiaRol123!",
            "role": "auditor",
        },
        headers=headers,
    )
    assert r.status_code == 201
    user_id = r.json()["id"]

    # a administrador
    r = client.patch(f"/api/users/{user_id}", json={"role": "admin"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["role"] == "admin"

    # de vuelta a auditor: debe crearse el perfil de auditor automáticamente
    r = client.patch(f"/api/users/{user_id}", json={"role": "auditor"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["role"] == "auditor"

    r = client.get("/api/auditors", headers=headers)
    assert r.status_code == 200
    assert any(a["email"] == "cambiar.rol@test.local" for a in r.json())
