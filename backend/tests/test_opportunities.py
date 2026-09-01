"""Pruebas del ciclo de vida de oportunidades (Sprint 3)."""

import re

from .utils import auth_headers, login


def create_client(client, headers, name="Cliente Oportunidades"):
    r = client.post("/api/clients", json={"business_name": name}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def create_competency(client, headers, name):
    r = client.post("/api/competencies", json={"name": name}, headers=headers)
    if r.status_code == 201:
        return r.json()
    # Ya existe (tests anteriores): recuperarla del catálogo.
    catalog = client.get("/api/competencies", headers=headers).json()
    return next(c for c in catalog if c["name"] == name)


def opportunity_payload(client_id, competency_id, **overrides):
    payload = {
        "client_id": client_id,
        "title": "Auditoría de certificación en planta",
        "description": "Auditoría de certificación ISO 9001",
        "audit_type": "Certificación",
        "city": "Puebla",
        "state": "Puebla",
        "start_date": "2026-09-12",
        "end_date": "2026-09-15",
        "number_of_days": 3,
        "payment_amount": 12000.0,
        "travel_expenses": "included",
        "lodging": "not_included",
        "transportation": "included",
        "application_deadline": "2026-09-05",
        "auditors_required": 1,
        "competencies": [{"competency_id": competency_id, "required_level": "Auditor líder"}],
    }
    payload.update(overrides)
    return payload


def test_create_opportunity_generates_folio(client):
    headers = auth_headers(client)
    cli = create_client(client, headers, "Planta Puebla")
    comp = create_competency(client, headers, "ISO 9001")
    r = client.post(
        "/api/opportunities", json=opportunity_payload(cli["id"], comp["id"]), headers=headers
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert re.match(r"^AUD-\d{4}-\d{5}$", data["folio"]), data["folio"]
    assert data["status"] == "draft"
    assert len(data["competencies"]) == 1
    assert data["competencies"][0]["required_level"] == "Auditor líder"


def test_folio_sequence_increments(client):
    headers = auth_headers(client)
    cli = create_client(client, headers, "Cliente Folio")
    comp = create_competency(client, headers, "ISO 9001")
    folios = []
    for _ in range(2):
        r = client.post(
            "/api/opportunities",
            json=opportunity_payload(cli["id"], comp["id"], title=f"Servicio {len(folios)}"),
            headers=headers,
        )
        assert r.status_code == 201, r.text
        folios.append(r.json()["folio"])
    assert folios[0] != folios[1]
    assert int(folios[1].rsplit("-", 1)[-1]) == int(folios[0].rsplit("-", 1)[-1]) + 1


def test_cannot_publish_without_competencies(client):
    headers = auth_headers(client)
    cli = create_client(client, headers, "Cliente Sin Competencia")
    r = client.post(
        "/api/opportunities",
        json=opportunity_payload(cli["id"], 999999, competencies=[]),
        headers=headers,
    )
    assert r.status_code == 201, r.text
    opp_id = r.json()["id"]
    r = client.post(f"/api/opportunities/{opp_id}/publish", headers=headers)
    assert r.status_code == 422


def test_cannot_publish_without_dates(client):
    headers = auth_headers(client)
    cli = create_client(client, headers, "Cliente Sin Fechas")
    comp = create_competency(client, headers, "ISO 9001")
    r = client.post(
        "/api/opportunities",
        json=opportunity_payload(cli["id"], comp["id"], start_date=None, end_date=None),
        headers=headers,
    )
    assert r.status_code == 201, r.text
    r = client.post(f"/api/opportunities/{r.json()['id']}/publish", headers=headers)
    assert r.status_code == 422


def test_invalid_date_range_rejected(client):
    headers = auth_headers(client)
    cli = create_client(client, headers, "Cliente Fechas Mal")
    comp = create_competency(client, headers, "ISO 9001")
    r = client.post(
        "/api/opportunities",
        json=opportunity_payload(cli["id"], comp["id"], end_date="2026-09-01"),
        headers=headers,
    )
    assert r.status_code == 422


def test_publish_full_flow(client):
    headers = auth_headers(client)
    cli = create_client(client, headers, "Cliente Publicar")
    comp = create_competency(client, headers, "ISO 9001")
    r = client.post(
        "/api/opportunities", json=opportunity_payload(cli["id"], comp["id"]), headers=headers
    )
    assert r.status_code == 201, r.text
    opp_id = r.json()["id"]

    r = client.post(f"/api/opportunities/{opp_id}/publish", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "published"

    # Ya no se puede publicar de nuevo
    r = client.post(f"/api/opportunities/{opp_id}/publish", headers=headers)
    assert r.status_code == 409

    # Publicada ya no es editable
    r = client.patch(
        f"/api/opportunities/{opp_id}", json={"payment_amount": 9999}, headers=headers
    )
    assert r.status_code == 409


def test_update_draft_ok(client):
    headers = auth_headers(client)
    cli = create_client(client, headers, "Cliente Edición Draft")
    comp = create_competency(client, headers, "ISO 9001")
    r = client.post(
        "/api/opportunities", json=opportunity_payload(cli["id"], comp["id"]), headers=headers
    )
    opp_id = r.json()["id"]
    r = client.patch(
        f"/api/opportunities/{opp_id}",
        json={"payment_amount": 15000.0, "city": "Querétaro"},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["payment_amount"] == 15000.0
    assert data["city"] == "Querétaro"


def test_transitions_and_invalid_transition(client):
    headers = auth_headers(client)
    cli = create_client(client, headers, "Cliente Transiciones")
    comp = create_competency(client, headers, "ISO 9001")
    r = client.post(
        "/api/opportunities", json=opportunity_payload(cli["id"], comp["id"]), headers=headers
    )
    opp_id = r.json()["id"]

    # draft -> paid no permitido
    r = client.post(
        f"/api/opportunities/{opp_id}/transition",
        json={"to_status": "paid"},
        headers=headers,
    )
    assert r.status_code == 400

    # draft -> published permitido
    r = client.post(
        f"/api/opportunities/{opp_id}/transition",
        json={"to_status": "published"},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "published"

    # published -> under_review permitido
    r = client.post(
        f"/api/opportunities/{opp_id}/transition",
        json={"to_status": "under_review"},
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "under_review"

    # mismo estado -> 400
    r = client.post(
        f"/api/opportunities/{opp_id}/transition",
        json={"to_status": "under_review"},
        headers=headers,
    )
    assert r.status_code == 400


def test_cancel_flow(client):
    headers = auth_headers(client)
    cli = create_client(client, headers, "Cliente Cancelación")
    comp = create_competency(client, headers, "ISO 9001")
    r = client.post(
        "/api/opportunities", json=opportunity_payload(cli["id"], comp["id"]), headers=headers
    )
    opp_id = r.json()["id"]

    r = client.post(
        f"/api/opportunities/{opp_id}/cancel",
        json={"reason": "El cliente pospuso la auditoría"},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "cancelled"
    assert data["cancel_reason"] == "El cliente pospuso la auditoría"

    # cancelar dos veces -> 400
    r = client.post(
        f"/api/opportunities/{opp_id}/cancel",
        json={"reason": "otra vez"},
        headers=headers,
    )
    assert r.status_code == 400


def test_history_records_actions(client):
    headers = auth_headers(client)
    cli = create_client(client, headers, "Cliente Historial")
    comp = create_competency(client, headers, "ISO 9001")
    r = client.post(
        "/api/opportunities", json=opportunity_payload(cli["id"], comp["id"]), headers=headers
    )
    opp_id = r.json()["id"]
    client.post(f"/api/opportunities/{opp_id}/publish", headers=headers)
    client.patch(f"/api/opportunities/{opp_id}", json={}, headers=headers)  # no-op, sigue draft? no: publicado -> 409

    # El historial debe incluir create y publish
    r = client.get(f"/api/opportunities/{opp_id}/history", headers=headers)
    assert r.status_code == 200
    actions = [e["action"] for e in r.json()]
    assert "create" in actions
    assert "publish" in actions


def test_auditor_cannot_see_opportunities(client):
    admin_headers = auth_headers(client)
    r = client.post(
        "/api/users",
        json={
            "email": "auditor.s3@test.local",
            "full_name": "Auditor S3",
            "password": "AuditorSecret123!",
            "role": "auditor",
        },
        headers=admin_headers,
    )
    assert r.status_code == 201
    token = login(client, "auditor.s3@test.local", "AuditorSecret123!").json()["access_token"]
    r = client.get("/api/opportunities", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


def test_admin_can_read_opportunities(client):
    headers = auth_headers(client)
    r = client.get("/api/opportunities", headers=headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
