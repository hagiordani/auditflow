"""Pruebas end-to-end de integración ADMIN <-> AUDITOR (contra el backend real).

Uso (desde la raíz del repo):
    backend\\.venv\\Scripts\\python.exe scripts\\e2e_integration.py

Requiere el backend corriendo en :8001 con datos demo (5 auditores, 7 oportunidades,
competencias ISO 9001/14001/45001/27001, clientes).
"""

from __future__ import annotations

import sys
from datetime import date, timedelta

import httpx

BASE = "http://localhost:8001"
ADMIN = ("admin@auditflow.local", "Admin123!")
AUDITOR = ("roberto@demo.local", "Auditor123!")

PASS = 0
FAIL = 0


def check(label: str, cond: bool, detail: str = "") -> None:
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  OK   {label}")
    else:
        FAIL += 1
        print(f"  FAIL {label}  {detail}")


def login(c: httpx.Client, email: str, pw: str) -> str:
    r = c.post("/api/auth/login", json={"email": email, "password": pw})
    r.raise_for_status()
    return r.json()["access_token"]


def main() -> int:
    c = httpx.Client(base_url=BASE, timeout=30)
    admin_token = login(c, *ADMIN)
    aud_token = login(c, *AUDITOR)
    ah = {"Authorization": f"Bearer {admin_token}"}
    au = {"Authorization": f"Bearer {aud_token}"}

    # ---- Kit de datos: cliente + competencias ----
    clients = c.get("/api/clients", headers=ah).json()
    if not clients:
        print("No hay clientes; primero corre scripts/seed_demo.py"); return 1
    client_id = clients[0]["id"]
    comps = c.get("/api/competencies", headers=ah).json()
    iso9001 = next((x for x in comps if x["name"] == "ISO 9001"), None)
    if not iso9001:
        print("Falta competencia ISO 9001; corre el seed"); return 1
    competency_id = iso9001["id"]

    print("\n== E2E 1: ADMIN crea oportunidad y AUDITOR la ve en marketplace ==")
    today = date.today()
    # Ventana futura lejana y única para no chocar con asignaciones del seed ni de corridas previas.
    base = today + timedelta(days=400)
    start = base.isoformat()
    end = (base + timedelta(days=2)).isoformat()
    deadline = (base - timedelta(days=1)).isoformat()
    payload = {
        "client_id": client_id,
        "title": f"E2E Auditoria ISO 9001 {today.isoformat()}",
        "audit_type": "certificacion",
        "city": "Puebla",
        "state": "Puebla",
        "start_date": start,
        "end_date": end,
        "number_of_days": 3,
        "payment_amount": 52500,
        "travel_expenses": "included",
        "lodging": "included",
        "transportation": "included",
        "application_deadline": deadline,
        "auditors_required": 1,
        "competencies": [{"competency_id": competency_id, "required_level": "Auditor"}],
    }
    created = c.post("/api/opportunities", json=payload, headers=ah)
    created.raise_for_status()
    opp = created.json()
    opp_id = opp["id"]
    check("Oportunidad creada en BD (estado draft)", opp["status"] == "draft", opp["status"])

    # Publicar
    c.post(f"/api/opportunities/{opp_id}/publish", headers=ah).raise_for_status()
    opp_admin = c.get(f"/api/opportunities/{opp_id}", headers=ah).json()
    check("Publicada (admin) -> status published", opp_admin["status"] == "published", opp_admin["status"])
    check("Oferta económica en admin", float(opp_admin["payment_amount"]) == 52500, str(opp_admin["payment_amount"]))
    check("Fechas admin", opp_admin["start_date"] == start and opp_admin["end_date"] == end)
    check("Duración admin", opp_admin["number_of_days"] == 3)
    check("Ubicación admin", opp_admin["city"] == "Puebla" and opp_admin["state"] == "Puebla")
    check("Competencias admin", opp_admin["competencies"][0]["competency"]["name"] == "ISO 9001")

    # Marketplace auditor: el auditor está en Puebla y tiene ISO 9001 vigente
    market = c.get("/api/auditors/me/opportunities", headers=au).json()
    found = next((o for o in market if o["id"] == opp_id), None)
    check("AUDITOR ve la oportunidad en marketplace", found is not None,
          f"visible ids={[o['id'] for o in market]}")
    if found:
        check("Marketplace: sin cliente (privacidad)", "client" not in found)
        check("Marketplace: oferta correcta", float(found["payment_amount"]) == 52500)
        check("Marketplace: fechas/dur.", found["start_date"] == start and found["end_date"] == end and found["number_of_days"] == 3)
        check("Marketplace: competencias", found["competencies"][0]["competency"]["name"] == "ISO 9001")

    print("\n== E2E 2: AUDITOR postula -> persiste -> ADMIN la ve ==")
    c.post(f"/api/opportunities/{opp_id}/apply", json={"decision": "interested", "comments": "Disponible"}, headers=au).raise_for_status()
    # Cambia a "has_interested"
    opp_after = c.get(f"/api/opportunities/{opp_id}", headers=ah).json()
    check("Admin ve oportunidad en 'has_interested'", opp_after["status"] == "has_interested", opp_after["status"])
    apps = c.get(f"/api/opportunities/{opp_id}/applications", headers=ah).json()
    check("Admin ve 1 postulación interesada", len([a for a in apps if a["decision"] == "interested"]) == 1,
          str([(a["auditor"]["full_name"], a["decision"]) for a in apps]))
    myapps = c.get("/api/auditors/me/applications", headers=au).json()
    check("AUDITOR ve su postulación en Mis postulaciones", any(a["opportunity"]["id"] == opp_id for a in myapps))

    print("\n== E2E 3: ADMIN asigna -> AUDITOR ve asignación / calendario / dashboard ==")
    auditor_id = c.get("/api/auditors", headers=ah).json()[0]["id"]
    c.post(f"/api/opportunities/{opp_id}/assign", json={"auditor_id": auditor_id, "payment_amount": 52500}, headers=ah).raise_for_status()
    opp_assign = c.get(f"/api/opportunities/{opp_id}", headers=ah).json()
    check("Admin: oportunidad 'assigned'", opp_assign["status"] == "assigned", opp_assign["status"])

    my_assignments = c.get("/api/auditors/me/assignments", headers=au).json()
    my_asg = next((a for a in my_assignments if a["opportunity"]["id"] == opp_id), None)
    check("AUDITOR ve la asignación en Mis auditorías", my_asg is not None)
    if my_asg:
        check("Asignación: oferta congelada", float(my_asg["payment_amount"]) == 52500)
        check("Asignación: cliente visible para asignado", bool(my_asg.get("client")))

    cal = c.get("/api/auditors/me/calendar", headers=au).json()
    check("Calendario AUDITOR deriva la asignación", any(e["type"] == "assignment" and e["folio"] == opp["folio"] for e in cal))

    summary = c.get("/api/reports/auditor-summary", headers=au).json()
    check("Dashboard AUDITOR: upcoming_assignments >= 1", summary["upcoming_assignments"] >= 1, str(summary["upcoming_assignments"]))
    check("Dashboard AUDITOR: occupied_days >= 3", summary["occupied_days"] >= 3, str(summary["occupied_days"]))

    print("\n== E2E 4: AUDITOR confirma -> ADMIN ve 'confirmed' ==")
    asg_id = my_asg["id"] if my_asg else None
    if asg_id:
        c.post(f"/api/assignments/{asg_id}/confirm", headers=au).raise_for_status()
        opp_conf = c.get(f"/api/opportunities/{opp_id}", headers=ah).json()
        check("Admin: oportunidad 'confirmed'", opp_conf["status"] == "confirmed", opp_conf["status"])
        check("Auditor ve su auditoría en Mis auditorías", any(a["status"] == "confirmed" for a in c.get("/api/auditors/me/assignments", headers=au).json()))

    print("\n== E2E 5: ADMIN edita oferta (borrador) refleja en marketplace (nueva #) ==")
    # Editar solo aplica en draft. Creamos una segunda draft para validar reflejo.
    start2 = (today + timedelta(days=60)).isoformat()
    end2 = (today + timedelta(days=62)).isoformat()
    o2 = c.post("/api/opportunities", json={
        "client_id": client_id, "title": "E2E Esquema B (borrador)", "city": "Puebla", "state": "Puebla",
        "start_date": start2, "end_date": end2, "number_of_days": 3, "payment_amount": 40000,
        "application_deadline": (today + timedelta(days=59)).isoformat(),
        "competencies": [{"competency_id": competency_id, "required_level": "Auditor"}],
    }, headers=ah).json()
    # Editar oferta en borrador
    upd = c.patch(f"/api/opportunities/{o2['id']}", json={"payment_amount": 48000}, headers=ah)
    check("ADMIN edita oferta en borrador", upd.status_code == 200 and float(upd.json()["payment_amount"]) == 48000)
    check("Editada read-back admin", float(c.get(f"/api/opportunities/{o2['id']}", headers=ah).json()["payment_amount"]) == 48000)

    print("\n== E2E 6: Perfil del auditor + compatibilidad ==")
    me = c.get("/api/auditors/me", headers=au).json()
    check("Perfil AUDITOR viene de BD", "roles" in me and "competencies" in me)
    check("Auditor tiene competencias cargadas", len(me["competencies"]) > 0)

    print("\n== E2E 7: Privilegios (auditor no ve datos administrativos) ==")
    r = c.get("/api/opportunities", headers=au)
    check("AUDITOR no puede listar oportunidades (403)", r.status_code == 403, str(r.status_code))

    print(f"\n===== RESULTADO: {PASS} OK / {FAIL} FAIL =====")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
