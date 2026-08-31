"""Configuración de pytest: DB de prueba aislada + seed de admin."""

import os

# IMPORTANTE: definir las variables ANTES de importar la app (lru_cache).
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_auditflow.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-para-ci-suficientemente-larga-123456")
os.environ.setdefault("ADMIN_EMAIL", "admin@test.local")
os.environ.setdefault("ADMIN_PASSWORD", "TestAdmin123!")
os.environ.setdefault("ADMIN_NAME", "Admin Test")

import pytest
from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    # El contexto activa el lifespan (seed del admin).
    with TestClient(app) as c:
        yield c
