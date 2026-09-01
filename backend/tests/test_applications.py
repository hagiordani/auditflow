"""Pruebas del portal del auditor: compatibilidad y postulaciones (Sprint 4)."""

from datetime import date, timedelta

from .utils import auth_headers, login


def create_competency(client, headers, name):
    r = client.post("/api/competencies", json={"name": name}, headers=headers)
    if r.status_code == 201:
        return r.json()
    catalog = client.get("/api/competencies", headers=headers).json()
    return next(c for c in catalog if c["name"] == name)


def create_client(client, headers, name="Cliente Sprint 4"):
    r = client.post("/api/clients", json={"business_name": name}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def create_auditor(client, headers, email, competencies=None):
    r = client.post(
        "/api/auditors",
        json={
            "email": email,
            "full_name": f"Auditor {email.split('@')[0]}",
            "password": "AuditorSecret123!",
            "city": "Puebla",
            "state": "Puebla",
            "daily_rate": 4000.0,
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    auditor = r.json()
    for comp_id, level, until in competencies or []:
        r = client.post(
            f"/api/auditors/{auditor['id']}/competencies",
            json={
                "competency_id": comp_id,
                "level": level,
                "valid_from": "2025-01-01",
                "valid_until": until,
            },
            headers=headers,
        )
        assert r.status_code == 201, r.text
    return auditor


def create_opportunity(client, headers, title, comp_id, deadline_days=30):
    today = date.today()
    cli = create_client(client, headers)
    r = client.post(
        "/api/opportunities",
        json={
            "client_id": cli["id"],
            "title": title,
            "city": "Puebla",
            "state": "Puebla",
            "start_date": (today + timedelta(days=60)).isoformat(),
            "end_date": (today + timedelta(days=63)).isoformat(),
            "number_of_days": 3,
            "payment_amount": 12000.0,
            "application_deadline": (today + timedelta(days=deadline_days)).isoformat(),
            "auditors_required": 1,
            "competencies": [{"competency_id": comp_id, "required_level": "Auditor"}],
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    opp = r.json()
    r = client.post(f"/api/opportunities/{opp['id']}/publish", headers=headers)
    assert r.status_code == 200, r.text
    return opp["id"]


def auditor_headers(client, email, password="AuditorSecret123!"):
    token = login(client, email, password).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_auditor_sees_only_compatible_opportunities(client):
    headers = auth_headers(client)
    iso9 = create_competency(client, headers, "ISO 9001")["id"]
    iso45 = create_competency(client, headers, "ISO 45001")["id"]

    auditor = create_auditor(
        client, headers, "auditor.compat@test.local",
        competencies=[(iso9, "Auditor", "2030-01-01")],
    )
    opp_iso9 = create_opportunity(client, headers, "Servicio ISO 9001", iso9)
    create_opportunity(client, headers, "Servicio ISO 45001", iso45)

    ah = auditor_headers(client, "auditor.compat@test.local")
    r = client.get("/api/auditors/me/opportunities", headers=ah)
    assert r.status_code == 200
    visible_ids = [o["id"] for o in r.json()]
    assert opp_iso9 in visible_ids
    # La de ISO 45001 no debe aparecer
    assert len(visible_ids) == 1


def test_expired_competency_blocks_visibility(client):
    headers = auth_headers(client)
    iso9 = create_competency(client, headers, "ISO 9001")["id"]

    auditor = create_auditor(
        client, headers, "auditor.vencido4@test.local",
        competencies=[(iso9, "Auditor", "2021-01-01")],  # vencida
    )
    create_opportunity(client, headers, "Servicio ISO 9001 vencido", iso9)

    ah = auditor_headers(client, "auditor.vencido4@test.local")
    r = client.get("/api/auditors/me/opportunities", headers=ah)
    assert r.status_code == 200
    assert r.json() == []


def test_apply_interested_and_status_change(client):
    headers = auth_headers(client)
    iso9 = create_competency(client, headers, "ISO 9001")["id"]
    auditor = create_auditor(
        client, headers, "auditor.apply@test.local",
        competencies=[(iso9, "Auditor", "2030-01-01")],
    )
    opp_id = create_opportunity(client, headers, "Servicio para postular", iso9)

    ah = auditor_headers(client, "auditor.apply@test.local")
    r = client.post(
        f"/api/opportunities/{opp_id}/apply",
        json={"decision": "interested", "comments": "Disponible en esas fechas"},
        headers=ah,
    )
    assert r.status_code == 200, r.text

    # La oportunidad debe pasar de published a has_interested
    r = client.get(f"/api/opportunities/{opp_id}", headers=headers)
    assert r.json()["status"] == "has_interested"

    # En mi lista de oportunidades debe aparecer con mi postulación
    r = client.get("/api/auditors/me/opportunities", headers=ah)
    mine = next(o for o in r.json() if o["id"] == opp_id)
    assert mine["my_application"]["decision"] == "interested"

    # El staff ve la postulación
    r = client.get(f"/api/opportunities/{opp_id}/applications", headers=headers)
    assert r.status_code == 200
    apps = r.json()
    assert len(apps) == 1
    assert apps[0]["auditor"]["email"] == "auditor.apply@test.local"
    assert apps[0]["decision"] == "interested"
    assert apps[0]["comments"] == "Disponible en esas fechas"


def test_not_available_does_not_change_status(client):
    headers = auth_headers(client)
    iso9 = create_competency(client, headers, "ISO 9001")["id"]
    auditor = create_auditor(
        client, headers, "auditor.no@test.local",
        competencies=[(iso9, "Auditor", "2030-01-01")],
    )
    opp_id = create_opportunity(client, headers, "Servicio para rechazar", iso9)

    ah = auditor_headers(client, "auditor.no@test.local")
    r = client.post(
        f"/api/opportunities/{opp_id}/apply",
        json={"decision": "not_available"},
        headers=ah,
    )
    assert r.status_code == 200

    r = client.get(f"/api/opportunities/{opp_id}", headers=headers)
    assert r.json()["status"] == "published"  # sigue publicada


def test_apply_updates_decision(client):
    headers = auth_headers(client)
    iso9 = create_competency(client, headers, "ISO 9001")["id"]
    auditor = create_auditor(
        client, headers, "auditor.change@test.local",
        competencies=[(iso9, "Auditor", "2030-01-01")],
    )
    opp_id = create_opportunity(client, headers, "Servicio cambio decision", iso9)
    ah = auditor_headers(client, "auditor.change@test.local")

    r = client.post(f"/api/opportunities/{opp_id}/apply", json={"decision": "not_available"}, headers=ah)
    assert r.status_code == 200
    r = client.post(f"/api/opportunities/{opp_id}/apply", json={"decision": "interested"}, headers=ah)
    assert r.status_code == 200

    r = client.get(f"/api/opportunities/{opp_id}/applications", headers=headers)
    apps = r.json()
    assert len(apps) == 1  # una sola postulación, actualizada
    assert apps[0]["decision"] == "interested"


def test_apply_without_required_competency_blocked(client):
    headers = auth_headers(client)
    iso9 = create_competency(client, headers, "ISO 9001")["id"]
    iso45 = create_competency(client, headers, "ISO 45001")["id"]
    auditor = create_auditor(
        client, headers, "auditor.nocomp@test.local",
        competencies=[(iso9, "Auditor", "2030-01-01")],
    )
    opp_id = create_opportunity(client, headers, "Servicio 45001 bloqueado", iso45)
    ah = auditor_headers(client, "auditor.nocomp@test.local")

    r = client.post(
        f"/api/opportunities/{opp_id}/apply",
        json={"decision": "interested"},
        headers=ah,
    )
    assert r.status_code == 403
    assert "competencia" in r.json()["detail"].lower()


def test_apply_after_deadline_blocked(client):
    headers = auth_headers(client)
    iso9 = create_competency(client, headers, "ISO 9001")["id"]
    auditor = create_auditor(
        client, headers, "auditor.deadline@test.local",
        competencies=[(iso9, "Auditor", "2030-01-01")],
    )
    # Fecha límite en el pasado (-10 días): create la permite, publish la permite
    today = date.today()
    cli = create_client(client, headers)
    r = client.post(
        "/api/opportunities",
        json={
            "client_id": cli["id"],
            "title": "Servicio vencido",
            "start_date": (today + timedelta(days=30)).isoformat(),
            "end_date": (today + timedelta(days=33)).isoformat(),
            "number_of_days": 3,
            "application_deadline": (today - timedelta(days=10)).isoformat(),
            "competencies": [{"competency_id": iso9, "required_level": "Auditor"}],
        },
        headers=headers,
    )
    assert r.status_code == 201
    opp_id = r.json()["id"]
    assert client.post(f"/api/opportunities/{opp_id}/publish", headers=headers).status_code == 200

    ah = auditor_headers(client, "auditor.deadline@test.local")
    r = client.post(
        f"/api/opportunities/{opp_id}/apply",
        json={"decision": "interested"},
        headers=ah,
    )
    assert r.status_code == 403
    assert "límite" in r.json()["detail"]


def test_apply_to_assigned_opportunity_blocked(client):
    headers = auth_headers(client)
    iso9 = create_competency(client, headers, "ISO 9001")["id"]
    auditor = create_auditor(
        client, headers, "auditor.assigned4@test.local",
        competencies=[(iso9, "Auditor", "2030-01-01")],
    )
    opp_id = create_opportunity(client, headers, "Servicio asignado bloqueo", iso9)
    # Avanzar a assigned (transición permitida published -> assigned)
    r = client.post(
        f"/api/opportunities/{opp_id}/transition",
        json={"to_status": "assigned"},
        headers=headers,
    )
    assert r.status_code == 200

    ah = auditor_headers(client, "auditor.assigned4@test.local")
    r = client.post(
        f"/api/opportunities/{opp_id}/apply",
        json={"decision": "interested"},
        headers=ah,
    )
    assert r.status_code == 403


def test_staff_only_application_list(client):
    headers = auth_headers(client)
    iso9 = create_competency(client, headers, "ISO 9001")["id"]
    auditor = create_auditor(
        client, headers, "auditor.guard4@test.local",
        competencies=[(iso9, "Auditor", "2030-01-01")],
    )
    opp_id = create_opportunity(client, headers, "Servicio guard", iso9)

    # El auditor NO puede ver la lista de postulaciones
    ah = auditor_headers(client, "auditor.guard4@test.local")
    r = client.get(f"/api/opportunities/{opp_id}/applications", headers=ah)
    assert r.status_code == 403

    # El administrador sí ve la lista
    r = client.get(f"/api/opportunities/{opp_id}/applications", headers=headers)
    assert r.status_code == 200


def test_user_without_auditor_profile_blocked(client):
    headers = auth_headers(client)
    r = client.post(
        "/api/users",
        json={
            "email": "sinperfil4@test.local",
            "full_name": "Sin Perfil",
            "password": "UserSecret123!",
            "role": "auditor",
        },
        headers=headers,
    )
    assert r.status_code == 201
    ah = auditor_headers(client, "sinperfil4@test.local", "UserSecret123!")
    r = client.get("/api/auditors/me/opportunities", headers=ah)
    assert r.status_code == 404
