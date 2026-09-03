"""Siembra el catálogo de personal técnico en PRODUCCIÓN vía API.

Lee 'Personal Técnico 2026.xlsx' y crea roles, áreas y personas a través de la
API pública (endpoints /api/roles, /api/areas, /api/personal). Idempotente.

Uso:
    $env:AUDITFLOW_BASE="https://auditflow.hcar.cloud"
    $env:AUDITFLOW_EMAIL="cesar.hugo@gmail.com"
    $env:AUDITFLOW_PASSWORD="..."
    python scripts/seed_personal_prod.py
"""

import os
import re

import httpx
import openpyxl

BASE = os.environ.get("AUDITFLOW_BASE", "https://auditflow.hcar.cloud")
EMAIL = os.environ.get("AUDITFLOW_EMAIL", "cesar.hugo@gmail.com")
PASSWORD = os.environ.get("AUDITFLOW_PASSWORD", "")
SRC = r"C:\Deepseek\Test-1\Personal Técnico 2026.xlsx"
ROLE_BASES = ("EVALUADOR", "INSTRUCTOR", "INSPECTOR", "EXAMINADOR")
AREA_NAMES = {"SG": "Sistema de Gestión", "NN": "Norma Nacional", "CIFA": "CIFA", "SECTOR": "Sector"}


def norm_role(token: str) -> str:
    t = token.strip().upper()
    for base in ROLE_BASES:
        if t.startswith(base):
            return base
    return t


def split_roles(puesto: str) -> list:
    parts = re.split(r"\s*(?:,|/|\by\b|\be\b)\s*", puesto)
    seen, out = set(), []
    for p in parts:
        r = norm_role(p)
        if p.strip() and r not in seen:
            seen.add(r)
            out.append(r)
    return out


def main() -> None:
    client = httpx.Client(base_url=BASE, timeout=40)
    r = client.post("/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    r.raise_for_status()
    token = r.json()["access_token"]
    H = {"Authorization": f"Bearer {token}"}
    print("login OK:", EMAIL, "role=", r.json()["user"]["role"])

    # roles
    roles = {x["nombre"]: x["id"] for x in client.get("/api/roles", headers=H).json()}
    for b in ROLE_BASES:
        if b not in roles:
            roles[b] = client.post("/api/roles", json={"nombre": b}, headers=H).json()["id"]
    print("roles:", sorted(roles))

    # areas
    areas = {a["codigo"]: a["id"] for a in client.get("/api/areas", headers=H).json()}
    for code, nombre in AREA_NAMES.items():
        if code not in areas:
            areas[code] = client.post("/api/areas", json={"codigo": code, "nombre": nombre}, headers=H).json()["id"]
    print("areas:", sorted(areas))

    wb = openpyxl.load_workbook(SRC, data_only=True)
    ws = wb["Plantilla"]
    rows = list(ws.iter_rows(values_only=True))

    existing = {p["nombre_completo"].strip().lower() for p in client.get("/api/personal", headers=H).json()}
    print("existentes:", len(existing))

    inserted = 0
    for r in rows:
        if not r or not r[0]:
            continue
        nombre = str(r[0]).strip()
        if nombre.upper() == "NOMBRE" or not nombre:
            continue
        if nombre.lower() in existing:
            continue
        puesto = str(r[1]).strip() if r[1] else ""
        area_codes = []
        for idx, code in [(2, "SG"), (3, "NN"), (4, "CIFA"), (5, "SECTOR")]:
            val = r[idx] if idx < len(r) else None
            if val is not None and str(val).strip():
                area_codes.append(code)
        emails = [e.strip() for e in str(r[6]).split("\n") if e.strip()] if len(r) > 6 and r[6] else []
        celular = str(r[7]).strip() if len(r) > 7 and r[7] else None
        rol_ids = [roles[rr] for rr in split_roles(puesto)]
        area_ids = [areas[c] for c in area_codes]
        email_payload = [{"email": e.lower(), "principal": i == 0} for i, e in enumerate(emails)]
        payload = {
            "nombre_completo": nombre,
            "celular": celular,
            "rol_ids": rol_ids,
            "area_ids": area_ids,
            "emails": email_payload,
        }
        resp = client.post("/api/personal", json=payload, headers=H)
        if resp.status_code in (200, 201):
            inserted += 1
        else:
            print("FAIL", nombre, resp.status_code, resp.text[:160])
    print("Insertados en produccion:", inserted)


if __name__ == "__main__":
    main()
