"""Pruebas de clientes (Sprint 3)."""

from .utils import auth_headers


def test_create_and_list_client(client):
    headers = auth_headers(client)
    r = client.post(
        "/api/clients",
        json={
            "business_name": "Industrias del Bajío S.A. de C.V.",
            "commercial_name": "Bajío Industries",
            "tax_id": "IBA-900101-AB1",
            "city": "Puebla",
            "state": "Puebla",
            "contact_name": "Laura Ruiz",
            "contact_email": "laura@bajio.example",
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    created = r.json()
    assert created["business_name"] == "Industrias del Bajío S.A. de C.V."
    assert created["contact_email"] == "laura@bajio.example"

    r = client.get("/api/clients", headers=headers)
    assert r.status_code == 200
    assert any(c["id"] == created["id"] for c in r.json())


def test_update_client(client):
    headers = auth_headers(client)
    r = client.post(
        "/api/clients",
        json={"business_name": "Cliente Editable"},
        headers=headers,
    )
    assert r.status_code == 201
    client_id = r.json()["id"]

    r = client.patch(
        f"/api/clients/{client_id}",
        json={"city": "Querétaro", "notes": "Observación interna"},
        headers=headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["city"] == "Querétaro"
    assert data["notes"] == "Observación interna"


def test_supervisor_can_read_but_not_create(client):
    admin_headers = auth_headers(client)
    r = client.post(
        "/api/users",
        json={
            "email": "supervisor.s3@test.local",
            "full_name": "Supervisor S3",
            "password": "SuperSecret123!",
            "role": "supervisor",
        },
        headers=admin_headers,
    )
    assert r.status_code == 201

    from .utils import login

    token = login(client, "supervisor.s3@test.local", "SuperSecret123!").json()["access_token"]
    sup_headers = {"Authorization": f"Bearer {token}"}

    assert client.get("/api/clients", headers=sup_headers).status_code == 200
    r = client.post(
        "/api/clients", json={"business_name": "No Permitido"}, headers=sup_headers
    )
    assert r.status_code == 403
