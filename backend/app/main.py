"""Punto de entrada de la API AuditFlow."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.applications.routes import router as applications_router
from app.assignments.routes import router as assignments_router
from app.auditors.routes import router as auditors_router
from app.auth.routes import router as auth_router
from app.availability.routes import router as availability_router
from app.calendar.routes import router as calendar_router
from app.clients.routes import router as clients_router
from app.competencies.routes import router as competencies_router
from app.config import get_settings
from app.documents.routes import router as documents_router
from app.notifications.routes import router as notifications_router
from app.opportunities.routes import router as opportunities_router
from app.personal.routes import catalog_router as personal_catalog_router
from app.personal.routes import personal_router
from app.reports.routes import router as reports_router
from app.seed import seed_admin
from app.users.routes import router as users_router

settings = get_settings()


def _validate_security_config() -> None:
    """En staging/producción, la clave JWT debe ser fuerte y no la de ejemplo."""
    default_key = "cambiar-en-produccion-por-clave-larga-y-aleatoria"
    if settings.ENVIRONMENT in ("staging", "production"):
        if settings.SECRET_KEY == default_key or len(settings.SECRET_KEY) < 32:
            raise RuntimeError(
                "SECRET_KEY insegura: define una clave aleatoria de al menos 32 caracteres "
                f"para el entorno '{settings.ENVIRONMENT}'"
            )
        if settings.ADMIN_PASSWORD == "Admin123!":
            raise RuntimeError(
                "ADMIN_PASSWORD insegura: cambia la contraseña del administrador inicial "
                f"para el entorno '{settings.ENVIRONMENT}'"
            )


@asynccontextmanager
async def lifespan(app: FastAPI):
    _validate_security_config()
    # Las tablas las crea Alembic; aquí solo garantizamos el primer admin.
    seed_admin()
    yield


app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    return response

app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(auditors_router, prefix="/api")
app.include_router(competencies_router, prefix="/api")
app.include_router(clients_router, prefix="/api")
app.include_router(opportunities_router, prefix="/api")
app.include_router(applications_router, prefix="/api")
app.include_router(assignments_router, prefix="/api")
app.include_router(availability_router, prefix="/api")
app.include_router(calendar_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(personal_router, prefix="/api")
app.include_router(personal_catalog_router, prefix="/api")


@app.get("/api/health", tags=["system"])
def health():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}
