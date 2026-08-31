"""Pruebas de auditores, competencias y matriz de competencias (Sprint 2)."""

from .utils import ADMIN_EMAIL, ADMIN_PASSWORD, auth_headers, login


def create_staff(client, email, role):
    """Crea un usuario de staff (operations) via admin y devuelve sus headers."""
    admin_headers = auth_headers(client)
    r = client.post(
        "/api/users",
        json={
            "email": email,
            "full_name": f"Staff {role}",
            "password": "StaffSecret123!",
            "role": role,
        },
        headers=admin_headers,
    )
    assert r.status_code == 201
    token = login(client, email, "StaffSecret123!").json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


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


def test_operations_cannot_create_competency(client):
    ops_headers = create_staff(client, "operaciones.s2@test.local", "operations")
    r = client.post("/api/competencies", json={"name": "ISO 14001"}, headers=ops_headers)
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
