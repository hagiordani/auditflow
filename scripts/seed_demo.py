"""Seed de datos de DEMOSTRACIÓN para AuditFlow (vía API, sin mocks).

Crea competencias, auditores con certificaciones, clientes y oportunidades en
distintos estados del flujo (publicada, con interesados, asignada, confirmada,
en ejecución, finalizada) para revisar visualmente el Centro de operaciones.

Uso (desde la raíz del repo):
    backend\\.venv\\Scripts\\python.exe scripts\\seed_demo.py
"""

from __future__ import annotations

import os
from datetime import date, timedelta

import httpx

# Configurables por entorno (para apuntar a local o a producción)
BASE = os.environ.get("AUDITFLOW_BASE", "http://localhost:8001")
ADMIN_EMAIL = os.environ.get("AUDITFLOW_EMAIL", "admin@auditflow.local")
ADMIN_PASSWORD = os.environ.get("AUDITFLOW_PASSWORD", "Admin123!")

STATUS = {
    "published": "published",
    "has_interested": "has_interested",
    "under_review": "under_review",
    "assigned": "assigned",
    "confirmed": "confirmed",
    "in_progress": "in_progress",
    "completed": "completed",
    "invoice_received": "invoice_received",
    "paid": "paid",
}

TODAY = date.today()


def d(days: int) -> str:
    return (TODAY + timedelta(days=days)).isoformat()


class Seed:
    def __init__(self) -> None:
        self.client = httpx.Client(base_url=BASE, timeout=30)
        self.admin = self.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        self.auditor_tokens: dict[str, str] = {}
        self.competencies: dict[str, int] = {}

    def login(self, email: str, password: str) -> dict:
        r = self.client.post(
            "/api/auth/login", json={"email": email, "password": password}
        )
        r.raise_for_status()
        return r.json()

    def admin_headers(self) -> dict:
        return {"Authorization": f"Bearer {self.admin['access_token']}"}

    def auditor_headers(self, email: str) -> dict:
        token = self.auditor_tokens.get(email)
        if not token:
            token = self.login(email, "Auditor123!")["access_token"]
            self.auditor_tokens[email] = token
        return {"Authorization": f"Bearer {token}"}

    def get_competency(self, name: str) -> int:
        if name in self.competencies:
            return self.competencies[name]
        r = self.client.get("/api/competencies", headers=self.admin_headers())
        r.raise_for_status()
        existing = next((c for c in r.json() if c["name"] == name), None)
        if existing:
            self.competencies[name] = existing["id"]
            return existing["id"]
        r = self.client.post(
            "/api/competencies",
            json={"name": name, "description": f"Norma {name}"},
            headers=self.admin_headers(),
        )
        if r.status_code == 409:
            return self.get_competency(name)
        r.raise_for_status()
        self.competencies[name] = r.json()["id"]
        return r.json()["id"]

    def create_client(self, business_name: str, city: str, state: str) -> int:
        r = self.client.post(
            "/api/clients",
            json={
                "business_name": business_name,
                "commercial_name": business_name,
                "tax_id": f"TAX-{hash(business_name) % 100000}",
                "city": city,
                "state": state,
                "contact_name": "Contacto",
                "contact_email": "contacto@example.com",
            },
            headers=self.admin_headers(),
        )
        r.raise_for_status()
        return r.json()["id"]

    def create_auditor(
        self, email: str, name: str, city: str, state: str, rate: float, phone: str = ""
    ) -> int:
        r = self.client.post(
            "/api/auditors",
            json={
                "email": email,
                "full_name": name,
                "password": "Auditor123!",
                "city": city,
                "state": state,
                "daily_rate": rate,
                "phone": phone or None,
                "availability_status": "available",
            },
            headers=self.admin_headers(),
        )
        if r.status_code == 409:
            raise SystemExit(f"Auditor duplicado: {email}")
        r.raise_for_status()
        self.auditor_tokens[email] = self.login(email, "Auditor123!")["access_token"]
        return r.json()["id"]

    def add_competency(self, auditor_id: int, competency_id: int, level: str) -> None:
        r = self.client.post(
            f"/api/auditors/{auditor_id}/competencies",
            json={
                "competency_id": competency_id,
                "level": level,
                "certificate_number": f"CERT-{auditor_id}-{competency_id}",
                "valid_from": d(-365),
                "valid_until": d(365),
            },
            headers=self.admin_headers(),
        )
        r.raise_for_status()

    def create_opportunity(
        self,
        client_id: int,
        title: str,
        city: str,
        state: str,
        start: str,
        end: str,
        days: int,
        payment: float,
        comp: list[tuple[str, str]],
    ) -> int:
        r = self.client.post(
            "/api/opportunities",
            json={
                "client_id": client_id,
                "title": title,
                "audit_type": "Auditoría",
                "city": city,
                "state": state,
                "start_date": start,
                "end_date": end,
                "number_of_days": days,
                "payment_amount": payment,
                "travel_expenses": "included",
                "lodging": "included",
                "transportation": "included",
                "application_deadline": start,
                "auditors_required": 1,
                "competencies": [
                    {"competency_id": self.get_competency(c), "required_level": lvl}
                    for c, lvl in comp
                ],
            },
            headers=self.admin_headers(),
        )
        r.raise_for_status()
        return r.json()["id"]

    def publish(self, opp_id: int) -> None:
        self.client.post(f"/api/opportunities/{opp_id}/publish", headers=self.admin_headers()).raise_for_status()

    def apply(self, opp_id: int, auditor_email: str, decision: str = "interested") -> None:
        r = self.client.post(
            f"/api/opportunities/{opp_id}/apply",
            json={"decision": decision, "comments": "Disponible"},
            headers=self.auditor_headers(auditor_email),
        )
        r.raise_for_status()

    def assign(self, opp_id: int, auditor_id: int, payment: float) -> int:
        r = self.client.post(
            f"/api/opportunities/{opp_id}/assign",
            json={"auditor_id": auditor_id, "payment_amount": payment},
            headers=self.admin_headers(),
        )
        r.raise_for_status()
        return r.json()["id"]

    def confirm(self, assignment_id: int, auditor_email: str) -> None:
        self.client.post(
            f"/api/assignments/{assignment_id}/confirm",
            headers=self.auditor_headers(auditor_email),
        ).raise_for_status()

    def transition(self, opp_id: int, to_status: str) -> None:
        self.client.post(
            f"/api/opportunities/{opp_id}/transition",
            json={"to_status": to_status},
            headers=self.admin_headers(),
        ).raise_for_status()


def main() -> None:
    seed = Seed()

    # Competencias
    iso9001 = seed.get_competency("ISO 9001")
    iso14001 = seed.get_competency("ISO 14001")
    iso45001 = seed.get_competency("ISO 45001")
    iso27001 = seed.get_competency("ISO 27001")

    # Auditores
    roberto = seed.create_auditor("roberto@demo.local", "Roberto García", "Puebla", "Puebla", 4500, "+52 222 123 4567")
    ana = seed.create_auditor("ana@demo.local", "Ana López", "Ciudad de México", "CDMX", 4800, "+52 55 1234 5678")
    luis = seed.create_auditor("luis@demo.local", "Luis Martínez", "Monterrey", "Nuevo León", 4200, "+52 81 2345 6789")
    sofia = seed.create_auditor("sofia@demo.local", "Sofía Hernández", "Guadalajara", "Jalisco", 4600, "+52 33 3456 7890")
    carlos = seed.create_auditor("carlos@demo.local", "Carlos Torres", "Querétaro", "Querétaro", 4000, "+52 442 456 7890")

    seed.add_competency(roberto, iso9001, "Auditor líder")
    seed.add_competency(roberto, iso14001, "Auditor")
    seed.add_competency(ana, iso9001, "Auditor líder")
    seed.add_competency(ana, iso45001, "Auditor líder")
    seed.add_competency(luis, iso45001, "Auditor líder")
    seed.add_competency(luis, iso9001, "Auditor")
    seed.add_competency(sofia, iso27001, "Especialista")
    seed.add_competency(carlos, iso9001, "Auditor")
    seed.add_competency(carlos, iso27001, "Auditor")

    # Clientes
    abc = seed.create_client("Empresa ABC S.A. de C.V.", "Puebla", "Puebla")
    xyz = seed.create_client("Empresa XYZ S.A. de C.V.", "Ciudad de México", "CDMX")
    delta = seed.create_client("Grupo Delta", "Monterrey", "Nuevo León")

    # 1) En ejecución (activa): Roberto audita a Empresa ABC
    o1 = seed.create_opportunity(
        abc, "Auditoría al Gerente de Calidad", "Puebla", "Puebla",
        d(0), d(2), 3, 60000, [("ISO 9001", "Auditor líder")],
    )
    seed.publish(o1)
    seed.apply(o1, "roberto@demo.local")
    a1 = seed.assign(o1, roberto, 60000)
    seed.confirm(a1, "roberto@demo.local")
    seed.transition(o1, "in_progress")

    # 2) Confirmada, próxima: Ana audita a Empresa XYZ
    o2 = seed.create_opportunity(
        xyz, "Auditoría al Jefe de Producción", "Ciudad de México", "CDMX",
        d(3), d(5), 3, 55000, [("ISO 9001", "Auditor líder")],
    )
    seed.publish(o2)
    seed.apply(o2, "ana@demo.local")
    a2 = seed.assign(o2, ana, 55000)
    seed.confirm(a2, "ana@demo.local")

    # 3) Confirmada, próxima: Luis audita a Empresa ABC (ISO 45001)
    o3 = seed.create_opportunity(
        abc, "Auditoría de Seguridad y Salud (ISO 45001)", "Puebla", "Puebla",
        d(10), d(12), 3, 65000, [("ISO 45001", "Auditor líder")],
    )
    seed.publish(o3)
    seed.apply(o3, "luis@demo.local")
    a3 = seed.assign(o3, luis, 65000)
    seed.confirm(a3, "luis@demo.local")

    # 4) Publicada, sin postulantes (pendiente de asignación)
    o4 = seed.create_opportunity(
        delta, "Auditoría de Seguridad de la Información (ISO 27001)", "Monterrey", "Nuevo León",
        d(20), d(23), 4, 78000, [("ISO 27001", "Especialista")],
    )
    seed.publish(o4)

    # 5) Con interesados, sin asignar (pendiente de asignación)
    o5 = seed.create_opportunity(
        xyz, "Auditoría de Procesos (ISO 9001)", "Ciudad de México", "CDMX",
        d(15), d(17), 3, 52000, [("ISO 9001", "Auditor")],
    )
    seed.publish(o5)
    seed.apply(o5, "carlos@demo.local")

    # 6) Asignada, esperando confirmación (por confirmar)
    o6 = seed.create_opportunity(
        abc, "Auditoría de Cumplimiento (ISO 14001)", "Puebla", "Puebla",
        d(6), d(8), 3, 58000, [("ISO 9001", "Auditor")],
    )
    seed.publish(o6)
    seed.apply(o6, "carlos@demo.local")
    seed.assign(o6, carlos, 58000)

    # 7) Finalizada (pagada): Luis terminó una auditoría
    o7 = seed.create_opportunity(
        delta, "Auditoría al Gerente de Operaciones", "Monterrey", "Nuevo León",
        d(4), d(6), 3, 64000, [("ISO 9001", "Auditor")],
    )
    seed.publish(o7)
    seed.apply(o7, "luis@demo.local")
    a7 = seed.assign(o7, luis, 64000)
    seed.confirm(a7, "luis@demo.local")
    seed.transition(o7, "in_progress")
    seed.transition(o7, "completed")
    seed.transition(o7, "invoice_received")
    seed.transition(o7, "paid")

    print("Seed de demostración completado correctamente.")


if __name__ == "__main__":
    main()
