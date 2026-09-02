"""Migra 'Personal Técnico 2026.xlsx' a la estructura normalizada y genera SQL PostgreSQL."""

import re
from collections import OrderedDict

import openpyxl

SRC = r"C:\Deepseek\Test-1\Personal Técnico 2026.xlsx"
OUT_SQL = r"C:\Deepseek\Test-1\docs\personal_tecnico_2026_postgresql.sql"

ROLE_BASES = ("EVALUADOR", "INSTRUCTOR", "INSPECTOR", "EXAMINADOR")
AREA_CODES = ["SG", "NN", "CIFA", "SECTOR"]
AREA_NAMES = {"SG": "Sistema de Gestión", "NN": "Norma Nacional", "CIFA": "CIFA", "SECTOR": "Sector"}


def norm_role(token: str) -> str:
    t = token.strip().upper()
    for base in ROLE_BASES:
        if t.startswith(base):
            return base
    return t


def split_roles(puesto: str) -> list:
    parts = re.split(r"\s*(?:,|/|\by\b|\be\b)\s*", puesto)
    roles = [norm_role(p) for p in parts if p.strip()]
    # deduplicar manteniendo orden
    seen, out = set(), []
    for r in roles:
        if r not in seen:
            seen.add(r)
            out.append(r)
    return out


wb = openpyxl.load_workbook(SRC, data_only=True)
ws = wb["Plantilla"]
rows = list(ws.iter_rows(values_only=True))

data = []
for r in rows:
    if not r or not r[0]:
        continue
    nombre = str(r[0]).strip()
    if nombre.upper() == "NOMBRE":
        continue
    puesto = str(r[1]).strip() if r[1] else ""
    areas = []
    for idx, code in [(2, "SG"), (3, "NN"), (4, "CIFA"), (5, "SECTOR")]:
        val = r[idx] if idx < len(r) else None
        if val is not None and str(val).strip():
            areas.append(code)
    emails = [e.strip() for e in str(r[6]).split("\n") if e.strip()] if r[6] else []
    celular = str(r[7]).strip() if len(r) > 7 and r[7] else None
    data.append(
        {"nombre": nombre, "roles": split_roles(puesto), "areas": areas, "emails": emails, "celular": celular}
    )

# Validaciones
names = [d["nombre"] for d in data]
dups = [n for n in set(names) if names.count(n) > 1]
if dups:
    print("⚠️ Nombres duplicados:", dups)

# Recolección de catálogos
roles = OrderedDict()
areas = OrderedDict()
for d in data:
    for r in d["roles"]:
        roles[r] = roles.get(r, 0) + 1
    for a in d["areas"]:
        areas[a] = areas.get(a, 0) + 1

total_emails = sum(len(d["emails"]) for d in data)
total_role_rel = sum(len(d["roles"]) for d in data)
total_area_rel = sum(len(d["areas"]) for d in data)

print(f"Personas: {len(data)} | Roles: {list(roles)} | Áreas: {list(areas)}")
print(f"Correos: {total_emails} | relaciones persona-rol: {total_role_rel} | persona-área: {total_area_rel}")

# ---------- Generar SQL ----------
lines = []
A = lines.append
A("-- ========================================================")
A("-- Personal Técnico 2026 · estructura normalizada")
A("-- Generado automáticamente desde Personal Técnico 2026.xlsx")
A("-- ========================================================")
A("SET client_encoding = 'UTF8';")
A("")
A("-- 1. Roles")
A("CREATE TABLE IF NOT EXISTS roles (")
A("    id   BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,")
A("    nombre VARCHAR(50) NOT NULL UNIQUE")
A(");")
A("")
A("-- 2. Áreas")
A("CREATE TABLE IF NOT EXISTS areas (")
A("    id     BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,")
A("    codigo VARCHAR(30) NOT NULL UNIQUE,")
A("    nombre VARCHAR(150)")
A(");")
A("")
A("-- 3. Personas")
A("CREATE TABLE IF NOT EXISTS personal (")
A("    id              BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,")
A("    nombre_completo VARCHAR(200) NOT NULL,")
A("    celular         VARCHAR(30),")
A("    activo          BOOLEAN NOT NULL DEFAULT TRUE,")
A("    created_at      TIMESTAMPTZ DEFAULT now(),")
A("    updated_at      TIMESTAMPTZ DEFAULT now()")
A(");")
A("CREATE INDEX IF NOT EXISTS ix_personal_celular ON personal (celular);")
A("")
A("-- 4. Correos")
A("CREATE TABLE IF NOT EXISTS personal_emails (")
A("    id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,")
A("    personal_id BIGINT NOT NULL REFERENCES personal(id) ON DELETE CASCADE,")
A("    email       VARCHAR(255) NOT NULL UNIQUE CHECK (email = lower(email)),")
A("    principal   BOOLEAN NOT NULL DEFAULT FALSE")
A(");")
A("CREATE UNIQUE INDEX IF NOT EXISTS uq_personal_emails_principal")
A("  ON personal_emails (personal_id) WHERE principal = TRUE;")
A("")
A("-- 5. Persona <-> Rol")
A("CREATE TABLE IF NOT EXISTS personal_roles (")
A("    personal_id BIGINT NOT NULL REFERENCES personal(id) ON DELETE CASCADE,")
A("    rol_id      BIGINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,")
A("    PRIMARY KEY (personal_id, rol_id)")
A(");")
A("CREATE INDEX IF NOT EXISTS ix_personal_roles_rol ON personal_roles (rol_id);")
A("")
A("-- 6. Persona <-> Área")
A("CREATE TABLE IF NOT EXISTS personal_areas (")
A("    personal_id BIGINT NOT NULL REFERENCES personal(id) ON DELETE CASCADE,")
A("    area_id     BIGINT NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,")
A("    PRIMARY KEY (personal_id, area_id)")
A(");")
A("CREATE INDEX IF NOT EXISTS ix_personal_areas_area ON personal_areas (area_id);")
A("")
A("-- Datos: roles")
for r in roles:
    A(f"INSERT INTO roles (nombre) VALUES ('{r}');")
A("")
A("-- Datos: áreas")
for code in AREA_CODES:
    name = AREA_NAMES.get(code, code)
    A(f"INSERT INTO areas (codigo, nombre) VALUES ('{code}', '{name}');")
A("")
A("-- Datos: personas")
for d in data:
    cel = f", '{d['celular']}'" if d["celular"] else ", NULL"
    A(f"INSERT INTO personal (nombre_completo, celular) VALUES ('{d['nombre']}'{cel});")
A("")
A("-- Datos: correos (principal = primer correo)")
for d in data:
    for i, em in enumerate(d["emails"]):
        principal = "TRUE" if i == 0 else "FALSE"
        A("INSERT INTO personal_emails (personal_id, email, principal)")
        A(f"  SELECT p.id, '{em.lower()}', {principal} FROM personal p WHERE p.nombre_completo = '{d['nombre']}';")
A("")
A("-- Datos: persona <-> rol")
for d in data:
    for rol in d["roles"]:
        A("INSERT INTO personal_roles (personal_id, rol_id)")
        A(f"  SELECT p.id, r.id FROM personal p CROSS JOIN roles r")
        A(f"  WHERE p.nombre_completo = '{d['nombre']}' AND r.nombre = '{rol}';")
A("")
A("-- Datos: persona <-> área")
for d in data:
    for area in d["areas"]:
        A("INSERT INTO personal_areas (personal_id, area_id)")
        A(f"  SELECT p.id, a.id FROM personal p CROSS JOIN areas a")
        A(f"  WHERE p.nombre_completo = '{d['nombre']}' AND a.codigo = '{area}';")

sql = "\n".join(lines) + "\n"
with open(OUT_SQL, "w", encoding="utf-8") as f:
    f.write(sql)
print(f"\nSQL escrito en {OUT_SQL} ({len(sql.splitlines())} líneas)")
