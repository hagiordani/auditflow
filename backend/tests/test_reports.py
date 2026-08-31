"""Pruebas del Sprint 7: reportes e indicadores."""

from .utils import auth_headers, login


def create_competency(client, headers, name):
    r = client.post("/api/competencies", json={"name": name}, headers=headers)
    if r.status_code == 201:
        return r.json()
    catalog = client.get("/api/competencies", headers=headers).json()
    return next(c for c in catalog if c["name"] == name)


def create_auditor(client, headers, email, comp_id):
    r = client.post(
        "/api/auditors",
        json={
            "email": email,
            "full_name": f"Auditor {email.split('@')[0]}",
            "password": "AuditorSecret123!",
            "city": "Puebla",
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    auditor = r.json()
    r = client.post(
        f"/api/auditors/{auditor['id']}/competencies",
        json={
            "competency_id": comp_id,
            "level": "Auditor",
            "valid_from": "2025-01-01",
            "valid_until": "2030-01-01",
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return auditor


def test_summary_endpoint(client):
    headers = auth_headers(client)
    r = client.get("/api/reports/summary", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert "total_opportunities" in data
    assert "opportunities_by_status" in data
    assert "active_auditors" in data
    assert "confirmed_cost_total" in data
    assert "invoices_pending" in data
    assert data["opportunities_by_status"]["cancelled"] >= 0


def test_by_client_and_usage(client):
    headers = auth_headers(client)
    r = client.get("/api/reports/by-client", headers=headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)

    r = client.get("/api/reports/auditors-usage", headers=headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_expiring_certifications(client):
    headers = auth_headers(client)
    r = client.get("/api/reports/expiring-certifications?days=60", headers=headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_export_csv(client):
    headers = auth_headers(client)
    r = client.get("/api/reports/export.csv", headers=headers)
    assert r.status_code == 200
    assert "text/csv" in r.headers["content-type"]
    assert "Folio" in r.text
    assert "oportunidades_auditflow.csv" in r.headers["content-disposition"]


def test_auditor_summary(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 9001")["id"]
    create_auditor(client, headers, "auditor.sum7@test.local", comp)

    token = login(client, "auditor.sum7@test.local", "AuditorSecret123!").json()["access_token"]
    r = client.get("/api/reports/auditor-summary", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert "available_opportunities" in data
    assert "upcoming_assignments" in data
    assert "occupied_days" in data
    assert "expiring_my_certifications_90d" in data


def test_auditor_summary_forbidden_for_staff(client):
    headers = auth_headers(client)
    r = client.get("/api/reports/auditor-summary", headers=headers)
    assert r.status_code == 403  # admin no tiene perfil de auditor


def test_supervisor_can_read_reports(client):
    headers = auth_headers(client)
    r = client.post(
        "/api/users",
        json={
            "email": "supervisor.rep@test.local",
            "full_name": "Supervisor Reportes",
            "password": "SuperSecret123!",
            "role": "supervisor",
        },
        headers=headers,
    )
    if r.status_code == 201:
        pass  # creado; si 409 ya existía
    token = login(client, "supervisor.rep@test.local", "SuperSecret123!").json()["access_token"]
    sh = {"Authorization": f"Bearer {token}"}
    r = client.get("/api/reports/summary", headers=sh)
    assert r.status_code == 200
