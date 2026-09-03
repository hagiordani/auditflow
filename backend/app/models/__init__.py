"""Modelos de datos (SQLAlchemy). Importar aquí para que Alembic los detecte."""

from app.models.auditor import (
    AVAILABILITY_STATUSES,
    COMPETENCY_LEVELS,
    Auditor,
    AuditorCompetency,
    Competency,
)
from app.models.application import APPLICATION_DECISIONS, Application
from app.models.assignment import ASSIGNMENT_STATUSES, BLOCKING_STATUSES, Assignment
from app.models.availability import AVAILABILITY_TYPES, AuditorAvailability
from app.models.client import Client
from app.models.document import DOCUMENT_TYPES, ENTITY_TYPES, Document
from app.models.notification import Notification
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
    "Application",
    "APPLICATION_DECISIONS",
    "Assignment",
    "ASSIGNMENT_STATUSES",
    "BLOCKING_STATUSES",
    "AuditorAvailability",
    "AVAILABILITY_TYPES",
    "Document",
    "DOCUMENT_TYPES",
    "ENTITY_TYPES",
    "Notification",
]
