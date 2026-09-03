"""Backfill de teléfonos en los auditores de demo (una sola vez).

Los auditores demo ya existen en la BD, así que el seed duplicaría. Este script
actualiza por email el teléfono de cada auditor de demostración vía la API.

Uso (desde la raíz del repo):
    backend\\.venv\\Scripts\\python.exe scripts\\backfill_phones.py
"""

from __future__ import annotations

import httpx

BASE = "http://localhost:8001"
ADMIN_EMAIL = "admin@auditflow.local"
ADMIN_PASSWORD = "Admin123!"

PHONES = {
    "roberto@demo.local": "+52 222 123 4567",
    "ana@demo.local": "+52 55 1234 5678",
    "luis@demo.local": "+52 81 2345 6789",
    "sofia@demo.local": "+52 33 3456 7890",
    "carlos@demo.local": "+52 442 456 7890",
}


def main() -> None:
    client = httpx.Client(base_url=BASE, timeout=30)
    r = client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    r.raise_for_status()
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    auditors = client.get("/api/auditors", headers=headers).json()
    by_email = {a["email"]: a["id"] for a in auditors}
    updated = 0
    for email, phone in PHONES.items():
        aid = by_email.get(email)
        if not aid:
            print(f"  ! no existe {email}")
            continue
        p = client.patch(f"/api/auditors/{aid}", json={"phone": phone}, headers=headers)
        p.raise_for_status()
        updated += 1
        print(f"  OK {email} -> {phone}")

    print(f"Teléfonos aplicados: {updated}")


if __name__ == "__main__":
    main()
