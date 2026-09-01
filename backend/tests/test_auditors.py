"""Pruebas de auditores, competencias y matriz de competencias (Sprint 2)."""

from .utils import ADMIN_EMAIL, ADMIN_PASSWORD, auth_headers, login


def create_competency(client, headers, name="ISO 9001"):
    r = client.post(
        "/api/competencies",
        json={"name": name, "description": "Norma de calidad"},
        headers=headers,
    )
    if r.status_code == 201:
        return r.json()
    # Ya existe (creada por otro archivo de tests): recuperarla del catálogo.
    catalog = client.get("/api/competencies", headers=headers).json()
    return next(c for c in catalog if c["name"] == name)


def create_auditor(client, headers, email="auditor.s2@test.local", city="Puebla"):
    r = client.post(
        "/api/auditors",
        json={
            "email": email,
            "full_name": "Auditor Sprint 2",
            "password": "AuditorSecret123!",
            "city": city,
            "state": "Puebla",
            "daily_rate": 4500.0,
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_admin_creates_competency_and_lists(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers)
    assert comp["name"] == "ISO 9001"
    assert comp["is_active"] is True

    r = client.get("/api/competencies", headers=headers)
    assert r.status_code == 200
    assert any(c["id"] == comp["id"] for c in r.json())


def test_duplicate_competency_rejected(client):
    headers = auth_headers(client)
    create_competency(client, headers, "ISO 45001")
    r = client.post(
        "/api/competencies", json={"name": "ISO 45001"}, headers=headers
    )
    assert r.status_code == 409


def test_auditor_cannot_create_competency(client):
    headers = auth_headers(client)
    r = client.post(
        "/api/users",
        json={
            "email": "auditor.competencia@test.local",
            "full_name": "Auditor Competencia",
            "password": "AuditorSecret123!",
            "role": "auditor",
        },
        headers=headers,
    )
    assert r.status_code == 201
    token = login(client, "auditor.competencia@test.local", "AuditorSecret123!").json()["access_token"]
    r = client.post(
        "/api/competencies",
        json={"name": "ISO 14001"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403


def test_admin_can_deactivate_competency(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 27001")
    r = client.patch(
        f"/api/competencies/{comp['id']}", json={"is_active": False}, headers=headers
    )
    assert r.status_code == 200
    assert r.json()["is_active"] is False


def test_create_auditor_and_login(client):
    headers = auth_headers(client)
    auditor = create_auditor(client, headers)
    assert auditor["email"] == "auditor.s2@test.local"
    assert auditor["full_name"] == "Auditor Sprint 2"
    assert auditor["daily_rate"] == 4500.0
    assert auditor["competencies"] == []

    # El auditor puede iniciar sesión con la cuenta creada
    r = login(client, "auditor.s2@test.local", "AuditorSecret123!")
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "auditor"


def test_duplicate_auditor_email_rejected(client):
    headers = auth_headers(client)
    create_auditor(client, headers, "auditor.dup@test.local")
    r = client.post(
        "/api/auditors",
        json={
            "email": "auditor.dup@test.local",
            "full_name": "Otro",
            "password": "AuditorSecret123!",
        },
        headers=headers,
    )
    assert r.status_code == 409


def test_auditor_cannot_list_auditors(client):
    headers = auth_headers(client)
    auditor = create_auditor(client, headers, "auditor.guard@test.local")
    token = login(client, "auditor.guard@test.local", "AuditorSecret123!").json()["access_token"]
    r = client.get("/api/auditors", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


def test_auditor_can_see_own_profile(client):
    headers = auth_headers(client)
    auditor = create_auditor(client, headers, "auditor.own@test.local")
    token = login(client, "auditor.own@test.local", "AuditorSecret123!").json()["access_token"]
    r = client.get("/api/auditors/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["id"] == auditor["id"]


def test_assign_competency_with_validity(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 50001")
    auditor = create_auditor(client, headers, "auditor.matriz@test.local")

    r = client.post(
        f"/api/auditors/{auditor['id']}/competencies",
        json={
            "competency_id": comp["id"],
            "level": "Auditor líder",
            "certificate_number": "CERT-001",
            "valid_from": "2025-01-01",
            "valid_until": "2030-01-01",
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    assignments = r.json()["competencies"]
    assert len(assignments) == 1
    assert assignments[0]["competency"]["name"] == "ISO 50001"
    assert assignments[0]["is_valid"] is True


def test_duplicate_assignment_rejected(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 22000")
    auditor = create_auditor(client, headers, "auditor.dupmatriz@test.local")
    payload = {"competency_id": comp["id"], "level": "Auditor"}
    assert (
        client.post(
            f"/api/auditors/{auditor['id']}/competencies", json=payload, headers=headers
        ).status_code
        == 201
    )
    r = client.post(
        f"/api/auditors/{auditor['id']}/competencies", json=payload, headers=headers
    )
    assert r.status_code == 409


def test_expired_competency_is_not_valid(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 13485")
    auditor = create_auditor(client, headers, "auditor.vencido@test.local")

    r = client.post(
        f"/api/auditors/{auditor['id']}/competencies",
        json={
            "competency_id": comp["id"],
            "level": "Auditor",
            "valid_from": "2020-01-01",
            "valid_until": "2021-01-01",  # vencida
        },
        headers=headers,
    )
    assert r.status_code == 201
    assignments = r.json()["competencies"]
    assert assignments[0]["is_valid"] is False


def test_remove_competency_assignment(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "IATF 16949")
    auditor = create_auditor(client, headers, "auditor.remove@test.local")
    r = client.post(
        f"/api/auditors/{auditor['id']}/competencies",
        json={"competency_id": comp["id"], "level": "Auditor"},
        headers=headers,
    )
    assignment_id = r.json()["competencies"][0]["id"]

    r = client.delete(
        f"/api/auditors/{auditor['id']}/competencies/{assignment_id}", headers=headers
    )
    assert r.status_code == 200
    assert r.json()["competencies"] == []


def test_auditor_cannot_assign_own_competency(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 14064")
    auditor = create_auditor(client, headers, "auditor.selfassign@test.local")
    token = login(client, "auditor.selfassign@test.local", "AuditorSecret123!").json()["access_token"]
    r = client.post(
        f"/api/auditors/{auditor['id']}/competencies",
        json={"competency_id": comp["id"], "level": "Auditor"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403


def test_link_existing_auditor_user_without_password(client):
    """Una cuenta con rol auditor creada en /users se vincula al crear el perfil."""
    headers = auth_headers(client)
    # 1. Crear la cuenta (rol auditor) sin perfil
    r = client.post(
        "/api/users",
        json={
            "email": "auditor.vincular@test.local",
            "full_name": "Auditor a Vincular",
            "password": "CuentaInicial123!",
            "role": "auditor",
        },
        headers=headers,
    )
    assert r.status_code == 201

    # 2. Crear el perfil SIN contraseña (la cuenta ya existe)
    r = client.post(
        "/api/auditors",
        json={
            "email": "auditor.vincular@test.local",
            "full_name": "Auditor a Vincular",
            "password": None,
            "city": "Puebla",
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    auditor = r.json()
    assert auditor["city"] == "Puebla"
    assert auditor["full_name"] == "Auditor a Vincular"

    # 3. La contraseña original sigue funcionando
    r = login(client, "auditor.vincular@test.local", "CuentaInicial123!")
    assert r.status_code == 200

    # 4. Crear de nuevo el perfil -> 409 (ya existe)
    r = client.post(
        "/api/auditors",
        json={"email": "auditor.vincular@test.local", "full_name": "Auditor Duplicado", "password": None},
        headers=headers,
    )
    assert r.status_code == 409


def test_create_auditor_without_password_requires_existing_account(client):
    headers = auth_headers(client)
    r = client.post(
        "/api/auditors",
        json={
            "email": "auditor.nueva.sinpass@test.local",
            "full_name": "Sin Cuenta",
            "password": None,
        },
        headers=headers,
    )
    assert r.status_code == 422
    assert "contraseña" in r.json()["detail"].lower()
