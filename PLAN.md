# AuditFlow — Plan de Construcción (MVP)

Plataforma privada de asignación de servicios de auditoría para auditores externos validados.

---

## 1. Decisiones de alcance

| Decisión | Valor propuesto | Estado |
|---|---|---|
| Nombre del producto | **AuditFlow** | Por confirmar |
| Frontend | **React + Vite + TypeScript** (SPA, panel interno + portal auditor) | Por confirmar |
| Backend | **FastAPI + Python 3.11 + SQLAlchemy 2 + Alembic + JWT** | Confirmado en la propuesta |
| Base de datos | **PostgreSQL 16** | Confirmado |
| Infraestructura | **Docker Compose** en desarrollo; **Dokploy + Nginx + SSL** en producción | Confirmado |
| Modelo de asignación | **Siempre manual**: el auditor postula ("Me interesa"), Operaciones elige al definitivo. No es "primero en llegar" | Por confirmar |
| Visibilidad del cliente | El auditor **no ve el nombre del cliente** en el MVP (solo ciudad, tipo y fechas) | Por confirmar |
| Pago | Se congela en la **asignación** (tabla `assignments`), no se toma de la tarifa del auditor | Regla de negocio fija |
| Notificaciones MVP | In-app + correo (SMTP). WhatsApp en fase 2 | Confirmado |

## 2. Fases de construcción

| Fase | Contenido | Resultado verificable |
|---|---|---|
| **Sprint 0** | Scaffolding, Docker Compose, PostgreSQL, auth JWT, primer admin | `Frontend → API → PostgreSQL` con login funcionando en Docker |
| **Sprint 1** | Usuarios y roles (admin, operaciones, auditor, supervisor), activación/desactivación | Admin gestiona accesos |
| **Sprint 2** | Auditores, competencias, matriz auditor↔competencia con vigencias | Catálogo completo de auditores y capacidades |
| **Sprint 3** | Clientes y oportunidades (folio, fechas, pago, viáticos, estados) | Operaciones publica servicios reales |
| **Sprint 4** | Portal del auditor: oportunidades compatibles, "Me interesa"/"No disponible", mis postulaciones | Auditor responde desde el teléfono |
| **Sprint 5** | Selección, asignación, confirmación, bloqueo de fechas, prevención de traslapes | Asignación formal con reglas de negocio |
| **Sprint 6** | Calendario, indisponibilidad, documentos, notificaciones por correo | Ejecución y documentación controladas |
| **Sprint 7** | Dashboard, indicadores, exportación CSV | Dirección supervisa la operación |
| **Sprint 8** | Auditoría de acciones, backups, SSL, Dokploy, pruebas, manual | Sistema listo para uso real |

**Entregable de la primera entrega funcional (Sprints 0–5):**
> Login como admin → crear auditor → crear competencia → asignarla → crear cliente → crear oportunidad → publicarla → login como auditor → ver oportunidad → "Me interesa" → Operaciones asigna al auditor.

Ese recorrido es el núcleo completo del negocio y el criterio de corte del MVP.

## 3. Estados del servicio y transiciones

```
Borrador → Publicada → Con interesados → En revisión → Asignada
→ Confirmada → En ejecución → Terminada → Factura recibida → Pagada
Cualquier estado → Cancelada (con motivo registrado)
```

Reglas:
- De `Borrador` solo Operaciones puede publicar.
- `Con interesados` se activa automáticamente con la primera postulación válida.
- La postulación **nunca** asigna: Operaciones elige en `En revisión` → `Asignada`.
- El auditor seleccionado confirma → `Confirmada` (si rechaza, vuelve a `En revisión`).
- Toda transición queda en `audit_logs` (quién, qué, cuándo, dato anterior/nuevo).

## 4. Reglas de negocio críticas (se implementan en el backend)

1. **Compatibilidad**: el auditor ve una oportunidad solo si está activo, tiene TODAS las competencias requeridas, cada certificación está vigente y no tiene cruce de fechas.
2. **Certificación vencida** = competencia bloqueada para postulación + alerta a Operaciones.
3. **Traslapes**: imposible postular/asignar a dos servicios con fechas que se cruzan (incluye `auditor_availability` como bloqueo).
4. **Pago congelado**: el monto se copia a `assignments` al asignar; cambios posteriores en la oportunidad o en la tarifa del auditor no lo alteran.
5. **Fecha límite**: no se aceptan postulaciones después de `application_deadline`.
6. **Audit trail total**: creación, edición, publicación, postulación, asignación, cancelación — todo en `audit_logs`.

## 5. Modelo de datos (resumen operativo)

- `users` — id, name, email, password_hash, role, is_active
- `auditors` — user_id FK, phone, city, state, daily_rate, tax_id, bank_info, availability_status, rating
- `competencies` — name (ISO 9001, ISO 14001…), description, is_active
- `auditor_competencies` — auditor_id, competency_id, level, certificate_number, valid_from, valid_until, document_id, status
- `clients` — business_name, commercial_name, tax_id, dirección, contactos, notas
- `audit_opportunities` — folio (AUD-YYYY-NNNNN), client_id, title, audit_type, ciudad/estado, start_date, end_date, days, payment_amount, travel_expenses, lodging, transportation, description, application_deadline, auditors_required, responsible_user_id, status
- `opportunity_competencies` — opportunity_id, competency_id, required_level
- `applications` — opportunity_id, auditor_id, status (interested / not_available), comments, applied_at
- `assignments` — opportunity_id, auditor_id, **payment_amount, travel_expenses (congelados)**, status, assigned_at, confirmed_at, completed_at
- `auditor_availability` — auditor_id, start_date, end_date, type (vacaciones / bloqueo / asignación), notes
- `documents` — entity_type, entity_id, document_type, file_name, file_url, uploaded_by
- `notifications` — user_id, title, message, type, is_read
- `audit_logs` — user_id, action, entity_type, entity_id, previous_data (JSONB), new_data (JSONB)

Detalle completo (campos y tipos) en `docs/schema.md` al ejecutar el Sprint 0.

## 6. Arquitectura y estructura de carpetas

```
auditflow/
├── backend/
│   ├── app/
│   │   ├── main.py, config.py, database.py, dependencies.py
│   │   ├── auth/  users/  auditors/  competencies/  clients/
│   │   ├── opportunities/  applications/  assignments/
│   │   ├── availability/  documents/  notifications/  audit_logs/
│   │   └── core/ (seguridad, paginación, utilidades)
│   ├── alembic/  tests/  requirements.txt  Dockerfile  .env.example
├── frontend/
│   ├── src/
│   │   ├── api/  components/  layouts/  hooks/  context/  utils/
│   │   └── pages/ (login, admin/, operations/, auditor/, supervisor/)
│   ├── Dockerfile  package.json  vite.config.ts  .env.example
├── docker-compose.yml      # api + web + db (dev)
├── docker-compose.prod.yml # api + web + db + nginx + certbot (Dokploy)
├── .env.example  .gitignore  README.md
└── docs/ (schema.md, reglas-negocio.md, manual-usuario.md)
```

## 7. Plan de ejecución inmediato — Sprint 0 (primeros pasos)

1. Inicializar repositorio Git (rama `main` + `develop`).
2. Crear `backend/` FastAPI: config, database, modelos base `User`, auth JWT, endpoint `/auth/login`, seed del primer admin.
3. Crear `frontend/` React + Vite + TS: pantalla Login, almacenamiento del token, layout base con menú por rol, cliente Axios con interceptor 401.
4. `docker-compose.yml` con `db` (PostgreSQL 16 + volumen), `api` y `web`.
5. Variables de entorno y `.env.example` (SECRET_KEY, DATABASE_URL, CORS, SMTP).
6. Alembic con la migración inicial (users).
7. Prueba de integración: login de admin desde el navegador contra la API en Docker.
8. CI básico (GitHub Actions): lint + tests de backend al hacer push a `develop`.

**Criterio de aceptación del Sprint 0:** `Frontend → FastAPI → PostgreSQL` funcionando dentro de Docker con inicio de sesión por JWT y rutas protegidas por rol.

## 8. Preguntas de alcance pendientes (no bloquean el Sprint 0, sí los Sprints 3–5)

- ¿Operaciones siempre elige al auditor o el primero que acepta lo toma?
- ¿El auditor ve el nombre del cliente y el pago desde el inicio?
- ¿Un servicio puede requerir varias competencias a la vez?
- ¿Quién confirma que el servicio terminó (operaciones o cliente)?
- ¿Qué pasa si el auditor asignado cancela? (¿vuelve a `En revisión` con los otros interesados?)
- ¿Se evalúa al auditor al terminar? (impacta Sprint 7)
- ¿La factura se carga dentro del sistema? (impacta Sprint 6)
