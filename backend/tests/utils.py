"""Helpers compartidos de los tests."""

import os

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]


def login(client, email=ADMIN_EMAIL, password=ADMIN_PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def auth_headers(client, email=ADMIN_EMAIL, password=ADMIN_PASSWORD):
    token = login(client, email, password).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
