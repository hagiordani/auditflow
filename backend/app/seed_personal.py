"""Seed del catálogo de personal técnico desde 'Personal Técnico 2026.xlsx'.

Idempotente: no duplica si ya existe por nombre_completo.
"""

import re

import openpyxl

from app.database import SessionLocal
from app.models.personal import Area, Personal, PersonalArea, PersonalEmail, PersonalRole, Role

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


def seed_personal() -> int:
    wb = openpyxl.load_workbook(SRC, data_only=True)
    ws = wb["Plantilla"]
    rows = list(ws.iter_rows(values_only=True))

    # Catálogos
    role_cache = {r.nombre: r for r in SessionLocal().query(Role).all()}
    area_cache = {a.codigo: a for a in SessionLocal().query(Area).all()}
    db = SessionLocal()
    try:
        # Garantizar catálogo de roles
        for base in ROLE_BASES:
            if base not in role_cache:
                r = Role(nombre=base)
                db.add(r)
                role_cache[base] = r
        # Garantizar catálogo de áreas
        for code in AREA_NAMES:
            if code not in area_cache:
                a = Area(codigo=code, nombre=AREA_NAMES[code])
                db.add(a)
                area_cache[code] = a
        db.flush()

        count = 0
        existing_names = {p.nombre_completo for p in db.query(Personal).all()}
        for r in rows:
            if not r or not r[0]:
                continue
            nombre = str(r[0]).strip()
            if nombre.upper() == "NOMBRE" or not nombre:
                continue
            if nombre in existing_names:
                continue
            puesto = str(r[1]).strip() if r[1] else ""
            areas = []
            for idx, code in [(2, "SG"), (3, "NN"), (4, "CIFA"), (5, "SECTOR")]:
                val = r[idx] if idx < len(r) else None
                if val is not None and str(val).strip():
                    areas.append(code)
            emails = [e.strip() for e in str(r[6]).split("\n") if e.strip()] if r[6] else []
            celular = str(r[7]).strip() if len(r) > 7 and r[7] else None

            person = Personal(nombre_completo=nombre, celular=celular, activo=True)
            db.add(person)
            db.flush()
            for i, em in enumerate(emails):
                db.add(
                    PersonalEmail(
                        personal_id=person.id,
                        email=em.strip().lower(),
                        principal=i == 0,
                    )
                )
            for rol in split_roles(puesto):
                db.add(PersonalRole(personal_id=person.id, rol_id=role_cache[rol].id))
            for code in areas:
                db.add(PersonalArea(personal_id=person.id, area_id=area_cache[code].id))
            count += 1
        db.commit()
        db.refresh  # no-op
        return count
    finally:
        db.close()


if __name__ == "__main__":
    print("Registros insertados:", seed_personal())
