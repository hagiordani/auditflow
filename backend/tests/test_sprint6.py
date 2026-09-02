"""Pruebas del Sprint 6: disponibilidad, documentos, notificaciones y calendario."""

import io
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


def create_published(client, headers, title, comp_id, start, end, responsible=None):
    cli = create_client(client, headers, f"Cliente {title}")
    r = client.post(
        "/api/opportunities",
        json={
            "client_id": cli["id"],
            "title": title,
            "start_date": start,
            "end_date": end,
            "number_of_days": 3,
            "payment_amount": 10000.0,
            "application_deadline": (date.today() + timedelta(days=30)).isoformat(),
            "responsible_user_id": responsible,
            "competencies": [{"competency_id": comp_id, "required_level": "Auditor"}],
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    opp_id = r.json()["id"]
    assert client.post(f"/api/opportunities/{opp_id}/publish", headers=headers).status_code == 200
    return opp_id


def auditor_headers(client, email, password="AuditorSecret123!"):
    token = login(client, email, password).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def apply(client, opp_id, email):
    r = client.post(
        f"/api/opportunities/{opp_id}/apply",
        json={"decision": "interested"},
        headers=auditor_headers(client, email),
    )
    assert r.status_code == 200, r.text


# ---------- Disponibilidad ----------


def test_availability_crud_and_block(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 9001")["id"]
    auditor = create_auditor(client, headers, "auditor.disp6@test.local", comp)
    ah = auditor_headers(client, "auditor.disp6@test.local")

    # Crear bloque
    r = client.post(
        "/api/auditors/me/availability",
        json={
            "start_date": "2026-10-01",
            "end_date": "2026-10-10",
            "availability_type": "vacations",
            "notes": "Vacaciones",
        },
        headers=ah,
    )
    assert r.status_code == 201, r.text
    block_id = r.json()["id"]

    # Aparece en su lista
    r = client.get("/api/auditors/me/availability", headers=ah)
    assert len(r.json()) == 1

    # Bloquea postulación: oportunidad con fechas que cruzan el bloque
    opp_id = create_published(client, headers, "Servicio bloqueado", comp, "2026-10-05", "2026-10-07")
    r = client.post(
        f"/api/opportunities/{opp_id}/apply",
        json={"decision": "interested"},
        headers=ah,
    )
    assert r.status_code == 403
    assert "bloqueo" in r.json()["detail"].lower()

    # Eliminar bloque
    r = client.delete(f"/api/auditors/me/availability/{block_id}", headers=ah)
    assert r.status_code == 200
    assert client.get("/api/auditors/me/availability", headers=ah).json() == []


def test_availability_blocks_assignment(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 9001")["id"]
    auditor = create_auditor(client, headers, "auditor.dispasig@test.local", comp)
    opp_id = create_published(client, headers, "Servicio con bloque", comp, "2026-11-01", "2026-11-03")
    apply(client, opp_id, "auditor.dispasig@test.local")

    # El staff bloquea esas fechas
    r = client.post(
        f"/api/auditors/{auditor['id']}/availability",
        json={"start_date": "2026-11-02", "end_date": "2026-11-02"},
        headers=headers,
    )
    assert r.status_code == 201, r.text

    r = client.post(
        f"/api/opportunities/{opp_id}/assign",
        json={"auditor_id": auditor["id"]},
        headers=headers,
    )
    assert r.status_code == 409
    assert "bloqueo" in r.json()["detail"].lower()


# ---------- Documentos ----------


def test_upload_and_download_document(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 9001")["id"]
    auditor = create_auditor(client, headers, "auditor.docs6@test.local", comp)
    opp_id = create_published(client, headers, "Servicio con documentos", comp, "2026-12-01", "2026-12-03")

    r = client.post(
        "/api/documents",
        data={"entity_type": "opportunity", "entity_id": str(opp_id), "document_type": "service_order"},
        files={"file": ("orden.pdf", io.BytesIO(b"%PDF-1.4 orden de servicio"), "application/pdf")},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    doc = r.json()
    assert doc["document_type"] == "service_order"
    assert doc["file_name"] == "orden.pdf"

    r = client.get(
        "/api/documents", params={"entity_type": "opportunity", "entity_id": opp_id}, headers=headers
    )
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = client.get(f"/api/documents/{doc['id']}/download", headers=headers)
    assert r.status_code == 200
    assert b"orden de servicio" in r.content


def test_auditor_can_upload_own_documents(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 9001")["id"]
    auditor = create_auditor(client, headers, "auditor.docprop@test.local", comp)
    ah = auditor_headers(client, "auditor.docprop@test.local")

    r = client.post(
        "/api/documents",
        data={"entity_type": "auditor", "entity_id": str(auditor["id"]), "document_type": "invoice"},
        files={"file": ("factura.pdf", io.BytesIO(b"factura"), "application/pdf")},
        headers=ah,
    )
    assert r.status_code == 201, r.text

    # Otro auditor no puede ver documentos ajenos
    other = create_auditor(client, headers, "auditor.ajeno6@test.local", comp)
    oh = auditor_headers(client, "auditor.ajeno6@test.local")
    r = client.get(
        "/api/documents", params={"entity_type": "auditor", "entity_id": auditor["id"]}, headers=oh
    )
    assert r.status_code == 200
    assert r.json() == []


# ---------- Notificaciones ----------


def test_notifications_on_assign_and_confirm(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 9001")["id"]
    auditor = create_auditor(client, headers, "auditor.notif6@test.local", comp)
    # Responsable = el admin (id 1)
    opp_id = create_published(
        client, headers, "Servicio con notificaciones", comp, "2027-01-10", "2027-01-12", responsible=1
    )
    apply(client, opp_id, "auditor.notif6@test.local")

    r = client.post(
        f"/api/opportunities/{opp_id}/assign",
        json={"auditor_id": auditor["id"]},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    assignment_id = r.json()["id"]

    # El auditor tiene notificación de asignación
    ah = auditor_headers(client, "auditor.notif6@test.local")
    r = client.get("/api/notifications", headers=ah)
    assert len(r.json()) == 1
    assert r.json()[0]["notification_type"] == "assignment"
    assert r.json()[0]["is_read"] is False

    r = client.get("/api/notifications/unread-count", headers=ah)
    assert r.json()["unread"] == 1

    # Marcar leída
    nid = client.get("/api/notifications", headers=ah).json()[0]["id"]
    r = client.post(f"/api/notifications/{nid}/read", headers=ah)
    assert r.json()["is_read"] is True

    # Confirmar: el responsable (admin) recibe notificación
    r = client.post(f"/api/assignments/{assignment_id}/confirm", headers=ah)
    assert r.status_code == 200
    r = client.get("/api/notifications", headers=headers)
    assert any(n["notification_type"] == "assignment" for n in r.json())


def test_notifications_read_all(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 9001")["id"]
    auditor = create_auditor(client, headers, "auditor.readall6@test.local", comp)
    opp_id = create_published(client, headers, "Servicio readall", comp, "2027-02-01", "2027-02-03")
    apply(client, opp_id, "auditor.readall6@test.local")

    r = client.post(
        f"/api/opportunities/{opp_id}/assign",
        json={"auditor_id": auditor["id"]},
        headers=headers,
    )
    assert r.status_code == 201

    ah = auditor_headers(client, "auditor.readall6@test.local")
    r = client.post("/api/notifications/read-all", headers=ah)
    assert r.status_code == 200
    r = client.get("/api/notifications/unread-count", headers=ah)
    assert r.json()["unread"] == 0


# ---------- Calendario ----------


def test_auditor_calendar_events(client):
    headers = auth_headers(client)
    comp = create_competency(client, headers, "ISO 9001")["id"]
    auditor = create_auditor(client, headers, "auditor.cal6@test.local", comp)
    opp_id = create_published(client, headers, "Servicio calendario", comp, "2027-03-01", "2027-03-03")
    apply(client, opp_id, "auditor.cal6@test.local")
    r = client.post(
        f"/api/opportunities/{opp_id}/assign",
        json={"auditor_id": auditor["id"]},
        headers=headers,
    )
    assert r.status_code == 201

    ah = auditor_headers(client, "auditor.cal6@test.local")
    # Bloque propio
    client.post(
        "/api/auditors/me/availability",
        json={"start_date": "2027-04-01", "end_date": "2027-04-05"},
        headers=ah,
    )

    r = client.get("/api/auditors/me/calendar", headers=ah)
    events = r.json()
    types = sorted(e["type"] for e in events)
    assert types == ["assignment", "unavailability"]


def test_staff_calendar(client):
    headers = auth_headers(client)
    r = client.get("/api/calendar", headers=headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
