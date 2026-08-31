"""Modelos de datos (SQLAlchemy). Importar aquí para que Alembic los detecte."""

from app.models.auditor import (
    AVAILABILITY_STATUSES,
    COMPETENCY_LEVELS,
    Auditor,
    AuditorCompetency,
    Competency,
)
from app.models.client import Client
from app.models.opportunity import (
    ALLOWED_TRANSITIONS,
    EXPENSE_OPTIONS,
    AuditLog,
    AuditOpportunity,
    OpportunityCompetency,
    OpportunityStatus,
)
from app.models.user import User, UserRole

__all__ = [
    "User",
    "UserRole",
    "Auditor",
    "Competency",
    "AuditorCompetency",
    "COMPETENCY_LEVELS",
    "AVAILABILITY_STATUSES",
    "Client",
    "AuditOpportunity",
    "OpportunityCompetency",
    "OpportunityStatus",
    "ALLOWED_TRANSITIONS",
    "EXPENSE_OPTIONS",
    "AuditLog",
]
