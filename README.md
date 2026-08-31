# AuditFlow

Plataforma privada de asignación de servicios de auditoría. Operaciones publica oportunidades; el sistema las muestra únicamente a auditores externos compatibles (competencia vigente, fechas libres); los auditores postulan ("Me interesa") y Operaciones elige y asigna al definitivo.

> 📋 El plan completo del proyecto está en [`PLAN.md`](PLAN.md).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + TypeScript (SPA) |
| Backend | FastAPI (Python 3.13) + SQLAlchemy 2 + Alembic + JWT |
| Base de datos | PostgreSQL 16 (local fallback: SQLite para desarrollo sin Docker) |
| Infraestructura | Docker Compose (dev) · Dokploy + Nginx (producción) |

## Estructura

```
auditflow/
├── backend/            # API FastAPI
├── frontend/           # SPA React + Vite
├── docker-compose.yml  # db + api + web
├── .env.example        # Variables de entorno
├── PLAN.md             # Plan de construcción
└── docs/               # Documentación (se irá agregando)
```

## Puesta en marcha con Docker

```bash
cp .env.example .env          # ajustar contraseñas y SECRET_KEY
docker compose up --build -d
```

- Web: http://localhost:8080
- API: http://localhost:8000/api/health
- Swagger: http://localhost:8000/docs

Al iniciar, la API ejecuta las migraciones y crea el primer administrador:

| Usuario | Contraseña |
|---|---|
| `admin@auditflow.local` (por defecto, configurable) | `Admin123!` (configurable) |

## Desarrollo local sin Docker (Windows)

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\alembic upgrade head
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

Por defecto usa `sqlite:///./auditflow.db` (sirve para desarrollo). Para usar PostgreSQL local, define `DATABASE_URL` en `backend/.env`.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

- Web: http://localhost:5173 (Vite redirige `/api` hacia `http://localhost:8000`)

### Tests

```powershell
cd backend
.venv\Scripts\python -m pytest -q
```

## Roles

| Rol | Alcance |
|---|---|
| `admin` | Acceso total: usuarios, catálogos, configuración |
| `operations` | Publica oportunidades, revisa interesados, asigna auditores |
| `auditor` | Ve oportunidades compatibles, postula, gestiona sus servicios |
| `supervisor` | Consulta servicios, indicadores y costos (solo lectura) |

## Estado del proyecto

- [x] **Sprint 0** — Scaffolding, Docker, auth JWT, primer admin, login de punta a punta
- [ ] Sprint 1 — Usuarios y accesos
- [ ] Sprint 2 — Auditores y competencias
- [ ] Sprint 3 — Clientes y oportunidades
- [ ] Sprint 4 — Portal del auditor
- [ ] Sprint 5 — Selección y asignación
- [ ] Sprint 6 — Calendario y documentos
- [ ] Sprint 7 — Dashboard y reportes
- [ ] Sprint 8 — Seguridad y despliegue
