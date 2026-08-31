"""Pruebas de asignaciones: selección, confirmación y reglas de negocio (Sprint 5)."""

from datetime import date, timedelta

from .utils import auth_headers, login


def create_competency(client, headers, name):
    r = client.post("/api/competencies", json={"name": name}, headers=headers)
    if r.status_code == 201:
        return r.json()
    catalog = client.get("/api/competencies", headers=headers).json()
    return next(c for c in catalog if c["name"] == name)


def create_client(client, headers, name):
    r = client.post("/api/clients", json={"business_name": name}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def create_auditor(client, headers, email, comp_id):
    r = client.post(
        "/api/auditors",
        json={
            "email": email,
            "full_name": f"Auditor {email.split('@')[0]}",
            "password": "AuditorSecret123!",
            "city": "Puebla",
            "state": "Puebla",
            "daily_rate": 4500.0,
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


def create_published_opportunity(client, headers, title, comp_id, start_offset=60, end_offset=63):
    today = date.today()
    cli = create_client(client, headers, f"Cliente {title}")
    r = client.post(
        "/api/opportunities",
        json={
            "client_id": cli["id"],
            "title": title,
            "city": "Puebla",
            "start_date": (today + timedelta(days=start_offset)).isoformat(),
            "end_date": (today + timedelta(days=end_offset)).isoformat(),
            "number_of_days": 3,
            "payment_amount": 12000.0,
            "travel_expenses": "included",
            "application_deadline": (today + timedelta(days=30)).isoformat(),
            "competencies": [{"competency_id": comp_id, "required_level": "Auditor"}],
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    opp_id = r.json()["id"]
    assert client.post(f"/api/opportunities/{opp_id}/publish", headers=headers).status_code == 200
    return opp_id


def apply(client, opp_id, auditor_email, decision="interested"):
    token = login(client, auditor_email, "AuditorSecret123!").json()["access_token"]
    r = client.post(
        f"/api/opportunities/{opp_id}/apply",
        json={"decision": decision},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text


def auditor_token(client, email, password="AuditorSecret123!"):
    return login(client, email, password).json()["access_token"]


def test_assign_freezes_payment_and_confirms_flow(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 9001")["id"]
    auditor = create_auditor(client, headers, "auditor.asign@test.local", comp)
    opp_id = create_published_opportunity(client, headers, "Servicio asignable", comp)
    apply(client, opp_id, "auditor.asign@test.local")

    # Asignar con un pago distinto al de la oportunidad (congelado)
    r = client.post(
        f"/api/opportunities/{opp_id}/assign",
        json={"auditor_id": auditor["id"], "payment_amount": 13500.0},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    assignment = r.json()
    assert assignment["payment_amount"] == 13500.0
    assert assignment["travel_expenses"] == "included"  # heredado de la oportunidad
    assert assignment["status"] == "pending"

    # La oportunidad pasa a assigned
    r = client.get(f"/api/opportunities/{opp_id}", headers=headers)
    assert r.json()["status"] == "assigned"

    # El auditor la ve en sus asignaciones y puede confirmar
    token = auditor_token(client, "auditor.asign@test.local")
    r = client.get("/api/auditors/me/assignments", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    mine = r.json()
    assert len(mine) == 1
    assert mine[0]["payment_amount"] == 13500.0
    assert mine[0]["client"]["business_name"].startswith("Cliente")

    r = client.post(
        f"/api/assignments/{mine[0]['id']}/confirm",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "confirmed"

    r = client.get(f"/api/opportunities/{opp_id}", headers=headers)
    assert r.json()["status"] == "confirmed"


def test_assign_requires_interested_application(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 9001")["id"]
    auditor = create_auditor(client, headers, "auditor.sinpost@test.local", comp)
    opp_id = create_published_opportunity(client, headers, "Servicio sin postulacion", comp)

    r = client.post(
        f"/api/opportunities/{opp_id}/assign",
        json={"auditor_id": auditor["id"]},
        headers=headers,
    )
    assert r.status_code == 409
    assert "interés" in r.json()["detail"]


def test_overlap_prevention(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 9001")["id"]
    auditor = create_auditor(client, headers, "auditor.traslape@test.local", comp)

    opp_a = create_published_opportunity(client, headers, "Servicio A traslape", comp, 60, 63)
    opp_b = create_published_opportunity(client, headers, "Servicio B traslape", comp, 62, 66)
    apply(client, opp_a, "auditor.traslape@test.local")
    apply(client, opp_b, "auditor.traslape@test.local")

    r = client.post(
        f"/api/opportunities/{opp_a}/assign",
        json={"auditor_id": auditor["id"]},
        headers=headers,
    )
    assert r.status_code == 201, r.text

    # B se cruza con A -> bloqueado
    r = client.post(
        f"/api/opportunities/{opp_b}/assign",
        json={"auditor_id": auditor["id"]},
        headers=headers,
    )
    assert r.status_code == 409
    assert "fechas incompatibles" in r.json()["detail"]


def test_no_overlap_allowed_for_adjacent_dates(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 9001")["id"]
    auditor = create_auditor(client, headers, "auditor.contiguo@test.local", comp)

    opp_a = create_published_opportunity(client, headers, "Servicio contiguo A", comp, 60, 62)
    opp_b = create_published_opportunity(client, headers, "Servicio contiguo B", comp, 63, 65)
    apply(client, opp_a, "auditor.contiguo@test.local")
    apply(client, opp_b, "auditor.contiguo@test.local")

    assert (
        client.post(
            f"/api/opportunities/{opp_a}/assign",
            json={"auditor_id": auditor["id"]},
            headers=headers,
        ).status_code
        == 201
    )
    # Fechas contiguas (62 -> 63) no se cruzan: permitido
    r = client.post(
        f"/api/opportunities/{opp_b}/assign",
        json={"auditor_id": auditor["id"]},
        headers=headers,
    )
    assert r.status_code == 201, r.text


def test_reject_demotes_opportunity(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 9001")["id"]
    auditor = create_auditor(client, headers, "auditor.rechaza@test.local", comp)
    opp_id = create_published_opportunity(client, headers, "Servicio rechazo", comp)
    apply(client, opp_id, "auditor.rechaza@test.local")

    r = client.post(
        f"/api/opportunities/{opp_id}/assign",
        json={"auditor_id": auditor["id"]},
        headers=headers,
    )
    assignment_id = r.json()["id"]

    token = auditor_token(client, "auditor.rechaza@test.local")
    r = client.post(
        f"/api/assignments/{assignment_id}/reject",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"

    # La oportunidad vuelve (hay 1 interesado -> under_review)
    r = client.get(f"/api/opportunities/{opp_id}", headers=headers)
    assert r.json()["status"] == "under_review"


def test_cancel_assignment_by_staff(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 9001")["id"]
    auditor = create_auditor(client, headers, "auditor.cancela@test.local", comp)
    opp_id = create_published_opportunity(client, headers, "Servicio cancelado staff", comp)
    apply(client, opp_id, "auditor.cancela@test.local")

    r = client.post(
        f"/api/opportunities/{opp_id}/assign",
        json={"auditor_id": auditor["id"]},
        headers=headers,
    )
    assignment_id = r.json()["id"]

    r = client.post(f"/api/assignments/{assignment_id}/cancel", headers=headers)
    assert r.status_code == 200
    assert r.json()["status"] == "cancelled"
    r = client.get(f"/api/opportunities/{opp_id}", headers=headers)
    assert r.json()["status"] == "under_review"


def test_auditor_cannot_confirm_other_assignment(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 9001")["id"]
    auditor_a = create_auditor(client, headers, "auditor.ajeno1@test.local", comp)
    auditor_b = create_auditor(client, headers, "auditor.ajeno2@test.local", comp)
    opp_id = create_published_opportunity(client, headers, "Servicio ajeno", comp)
    apply(client, opp_id, "auditor.ajeno1@test.local")
    apply(client, opp_id, "auditor.ajeno2@test.local")

    r = client.post(
        f"/api/opportunities/{opp_id}/assign",
        json={"auditor_id": auditor_a["id"]},
        headers=headers,
    )
    assignment_id = r.json()["id"]

    token_b = auditor_token(client, "auditor.ajeno2@test.local")
    r = client.post(
        f"/api/assignments/{assignment_id}/confirm",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert r.status_code == 403


def test_staff_cannot_confirm_assignment(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 9001")["id"]
    auditor = create_auditor(client, headers, "auditor.staffconfirm@test.local", comp)
    opp_id = create_published_opportunity(client, headers, "Servicio staff confirm", comp)
    apply(client, opp_id, "auditor.staffconfirm@test.local")

    r = client.post(
        f"/api/opportunities/{opp_id}/assign",
        json={"auditor_id": auditor["id"]},
        headers=headers,
    )
    assignment_id = r.json()["id"]

    r = client.post(f"/api/assignments/{assignment_id}/confirm", headers=headers)
    assert r.status_code == 403


def test_duplicate_assignment_blocked(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 9001")["id"]
    auditor = create_auditor(client, headers, "auditor.duplicado5@test.local", comp)
    opp_id = create_published_opportunity(client, headers, "Servicio duplicado", comp)
    apply(client, opp_id, "auditor.duplicado5@test.local")

    payload = {"auditor_id": auditor["id"]}
    assert (
        client.post(
            f"/api/opportunities/{opp_id}/assign", json=payload, headers=headers
        ).status_code
        == 201
    )
    r = client.post(f"/api/opportunities/{opp_id}/assign", json=payload, headers=headers)
    assert r.status_code == 409
