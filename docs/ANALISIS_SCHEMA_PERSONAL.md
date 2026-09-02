# Análisis — Esquema de base de datos `personal_técnico`

Evaluación de la propuesta de estructura normalizada para el catálogo de personal
(evaluadores, instructores, inspectores, examinadores) y su integración con **AuditFlow**.

---

## Veredicto general

✅ **La propuesta es correcta y es buena práctica.** Normalizar `roles` y `areas` como
relaciones **N:M** evita el error clásico de "agregar una columna por cada rol/área".
La separación de correos también es correcta. **Debes migrar a esta estructura.**

Aun así, hay **mejoras concretas** que aplicarías para que la base sea robusta.

---

## Puntos fuertes

- **N:M** correcta (`personal_roles`, `personal_areas`) con claves primarias compuestas.
- **Correos separados** (`personal_emails`) — resuelve los 16 casos con 2 direcciones.
- **Roles sin género** (`EVALUADOR`, no `EVALUADORA`) — totalmente de acuerdo.
- `GENERATED ALWAYS AS IDENTITY` y claves foráneas bien declaradas.

---

## Mejoras que yo aplicaría

### 1. Unicidad y normalización del correo
`email` debe ser **único globalmente** y guardarse **en minúsculas** (los correos son
insensibles a mayúsculas). Propongo:

```sql
email VARCHAR(255) NOT NULL UNIQUE,
CHECK (email = lower(email)),
```

### 2. Un solo correo "principal" por persona
Para garantizar que nadie tenga dos correos marcados como principales:

```sql
CREATE UNIQUE INDEX uq_personal_emails_principal
  ON personal_emails (personal_id) WHERE principal = TRUE;
```

### 3. Índices para las uniones
Las columnas de FK de las tablas N:M deben estar indexadas (aunque el PK compuesto
cubra el primer campo, no cubre el segundo):

```sql
CREATE INDEX ix_personal_roles_rol ON personal_roles (rol_id);
CREATE INDEX ix_personal_areas_area ON personal_areas (area_id);
CREATE INDEX ix_personal_emails_email ON personal_emails (email);
CREATE INDEX ix_personal_celular ON personal (celular);
```

### 4. Comportamiento ON DELETE explícito
- Si **borras una persona** → deben borrarse en cascada sus roles, áreas y correos.
- Si **borras un rol o área** referenciado → se debe impedir (RESTRICT), no borrar en silencio.

### 5. Timestamps con zona horaria
El resto de AuditFlow usa `timestamptz` (con timezone). Usa el mismo criterio:

```sql
created_at TIMESTAMPTZ DEFAULT now(),
updated_at TIMESTAMPTZ DEFAULT now(),
```

> PostgreSQL **no actualiza `updated_at` solo**: hay que hacerlo en la app (o con un trigger).

### 6. Nombres de las áreas
Dejaste solo códigos (`SG`, `NN`, `CIFA`, `SECTOR`). Te recomiendo capturar el
**nombre** al menos de las que ya usas (p. ej. `SG = "Sistemas de Gestión"`) para que
los reportes sean legibles. El campo ya existe (`nombre`), solo hay que llenarlo.

> `SECTOR` no tiene registros marcados: déjalo como catálogo (no estorba) y bórralo
> cuando confirmes que no se usará.

### 7. Celular
Para 47 registros un solo campo `celular` es suficiente. Si a futuro una persona tiene
más de un teléfono, conviene otra tabla N:M igual que correos.

---

## Cómo encaja con AuditFlow (importante)

AuditFlow hoy tiene estas tablas relacionadas con personas:
`users` (acceso), `auditors` (perfil del auditor externo), `auditor_competencies`
(competencias con vigencia), `applications`, `assignments`, etc.

Esta hoja es el **catálogo de personal técnico** (evaluadores/instructores…). Hay dos caminos:

| Opción | Cuándo |
|---|---|
| **A. Módulo separado** `personal/roles/areas/emails` | Si el personal interno y los auditores externos son grupos distintos |
| **B. Unificar**: `personal` = base de personas, y `auditors` la extiende | Si los mismos evaluadores/instructores son quienes ejecutan las auditorías |

**Mi recomendación:** como estás en un organismo de certificación, los "evaluadores" y
"auditores" probablemente son la misma gente → **Opción B**: `personal` se convierte en la
tabla base, y se enlaza a `auditor_competencies` (especialidad/competencia/vigencia),
`applications`, `assignments`, etc. Así tienes **una sola fuente de verdad** para la persona.

> Esto es una **decisión de modelo de negocio**. La migración propuesta es un excelente
> primer paso; la integración con AuditFlow sería el siguiente.

---

## SQL mejorado (PostgreSQL)

```sql
-- 1. Catálogo de roles
CREATE TABLE roles (
    id   BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

-- 2. Áreas
CREATE TABLE areas (
    id     BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(150)
);

-- 3. Personas
CREATE TABLE personal (
    id             BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nombre_completo VARCHAR(200) NOT NULL,
    celular        VARCHAR(30),
    activo         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ix_personal_celular ON personal (celular);

-- 4. Correos (único, minúsculas, cascada)
CREATE TABLE personal_emails (
    id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    personal_id BIGINT NOT NULL REFERENCES personal(id) ON DELETE CASCADE,
    email       VARCHAR(255) NOT NULL UNIQUE CHECK (email = lower(email)),
    principal   BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX uq_personal_emails_principal
  ON personal_emails (personal_id) WHERE principal = TRUE;

-- 5. Persona <-> Rol (N:M)
CREATE TABLE personal_roles (
    personal_id BIGINT NOT NULL REFERENCES personal(id) ON DELETE CASCADE,
    rol_id      BIGINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    PRIMARY KEY (personal_id, rol_id)
);
CREATE INDEX ix_personal_roles_rol ON personal_roles (rol_id);

-- 6. Persona <-> Área (N:M)
CREATE TABLE personal_areas (
    personal_id BIGINT NOT NULL REFERENCES personal(id) ON DELETE CASCADE,
    area_id     BIGINT NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
    PRIMARY KEY (personal_id, area_id)
);
CREATE INDEX ix_personal_areas_area ON personal_areas (area_id);
```

---

## Conclusión

1. **Migra** a esta estructura: es la correcta.
2. **Aplica las mejoras** de arriba (unicidad de correo, índice de "principal", códigos
   ON DELETE, `timestamptz`, nombres de áreas).
3. Decide **A o B** para la integración con AuditFlow (si es la misma gente, unifica).

¿Quieres que en el siguiente paso **genere el SQL completo con los 47 registros** + los
`INSERT` (con los ajustes de arriba), o que **integre ya `personal` dentro del modelo de
AuditFlow** (FastAPI/SQLAlchemy) para que el catálogo se vea en la app?
