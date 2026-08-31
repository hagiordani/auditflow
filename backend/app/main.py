"""Punto de entrada de la API AuditFlow."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auditors.routes import router as auditors_router
from app.auth.routes import router as auth_router
from app.competencies.routes import router as competencies_router
from app.config import get_settings
from app.seed import seed_admin
from app.users.routes import router as users_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
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

app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(auditors_router, prefix="/api")
app.include_router(competencies_router, prefix="/api")


@app.get("/api/health", tags=["system"])
def health():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}
