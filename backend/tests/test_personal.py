"""Pruebas del catálogo de personal técnico (módulo nuevo)."""

from .utils import auth_headers, login


def create_role(client, headers, nombre="EVALUADOR"):
    r = client.post("/api/roles", json={"nombre": nombre}, headers=headers)
    if r.status_code == 201:
        return r.json()
    return next(x for x in client.get("/api/roles", headers=headers).json() if x["nombre"] == nombre)


def create_area(client, headers, codigo="SG"):
    r = client.post("/api/areas", json={"codigo": codigo, "nombre": "Sistema de Gestión"}, headers=headers)
    if r.status_code == 201:
        return r.json()
    return next(x for x in client.get("/api/areas", headers=headers).json() if x["codigo"] == codigo)


def test_admin_creates_personal_with_relations(client):
    headers = auth_headers(client)
    rol = create_role(client, headers, "INSTRUCTOR")
    area = create_area(client, headers, "CIFA")
    r = client.post(
        "/api/personal",
        json={
            "nombre_completo": "PRUEBA PERSONA",
            "celular": "55 1234 5678",
            "rol_ids": [rol["id"]],
            "area_ids": [area["id"]],
            "emails": [{"email": "prueba.persona@gmail.com", "principal": True}],
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["nombre_completo"] == "PRUEBA PERSONA"
    assert data["roles"][0]["nombre"] == "INSTRUCTOR"
    assert data["areas"][0]["codigo"] == "CIFA"
    assert data["emails"][0]["email"] == "prueba.persona@gmail.com"
    assert data["emails"][0]["principal"] is True


def test_personal_list_and_detail(client):
    headers = auth_headers(client)
    rol = create_role(client, headers, "EXAMINADOR")
    create_area(client, headers, "NN")
    created = client.post(
        "/api/personal",
        json={
            "nombre_completo": "SEGUNDA PERSONA",
            "rol_ids": [rol["id"]],
            "emails": [{"email": "segunda.persona@gmail.com"}],
        },
        headers=headers,
    ).json()

    r = client.get("/api/personal", headers=headers)
    assert r.status_code == 200
    assert any(p["id"] == created["id"] for p in r.json())

    r = client.get(f"/api/personal/{created['id']}", headers=headers)
    assert r.status_code == 200
    assert r.json()["emails"][0]["email"] == "segunda.persona@gmail.com"


def test_duplicate_email_rejected(client):
    headers = auth_headers(client)
    payload = {
        "nombre_completo": "Persona Uno",
        "emails": [{"email": "dup.personal@gmail.com"}],
    }
    assert client.post("/api/personal", json=payload, headers=headers).status_code == 201
    r = client.post(
        "/api/personal",
        json={"nombre_completo": "Persona Dos", "emails": [{"email": "dup.personal@gmail.com"}]},
        headers=headers,
    )
    assert r.status_code == 409


def test_update_personal_relations(client):
    headers = auth_headers(client)
    rol_a = create_role(client, headers, "INSTRUCTOR")
    rol_b = create_role(client, headers, "INSPECTOR")
    created = client.post(
        "/api/personal",
        json={"nombre_completo": "Editable", "rol_ids": [rol_a["id"]]},
        headers=headers,
    ).json()

    r = client.patch(
        f"/api/personal/{created['id']}",
        json={"rol_ids": [rol_b["id"]], "activo": False},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["activo"] is False
    assert [x["nombre"] for x in data["roles"]] == ["INSPECTOR"]


def test_auditor_cannot_access_personal(client):
    headers = auth_headers(client)
    r = client.post(
        "/api/users",
        json={
            "email": "auditor.personal@test.local",
            "full_name": "Auditor Personal",
            "password": "AuditorSecret123!",
            "role": "auditor",
        },
        headers=headers,
    )
    assert r.status_code == 201
    token = login(client, "auditor.personal@test.local", "AuditorSecret123!").json()["access_token"]
    r = client.get("/api/personal", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403
