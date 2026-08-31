"""Schemas Pydantic de asignaciones."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.applications.schemas import AuditorOpportunityOut
from app.models.opportunity import EXPENSE_OPTIONS
from app.opportunities.schemas import OpportunityOut


class AssignRequest(BaseModel):
    auditor_id: int
    payment_amount: float | None = Field(default=None, ge=0, le=10_000_000)
    travel_expenses: str | None = Field(default=None, pattern=f"^({'|'.join(EXPENSE_OPTIONS)})$")
    lodging: str | None = Field(default=None, pattern=f"^({'|'.join(EXPENSE_OPTIONS)})$")
    transportation: str | None = Field(default=None, pattern=f"^({'|'.join(EXPENSE_OPTIONS)})$")


class AssignmentOut(BaseModel):
    """Asignación vista por el staff (con la oportunidad completa)."""

    id: int
    opportunity: OpportunityOut
    auditor_id: int
    auditor_name: str
    auditor_email: str
    payment_amount: float | None
    travel_expenses: str
    lodging: str
    transportation: str
    status: str
    assigned_at: datetime
    confirmed_at: datetime | None
    completed_at: datetime | None


class MyAssignmentOut(BaseModel):
    """Asignación vista por el auditor (incluye cliente: ya está asignado al servicio)."""

    id: int
    opportunity: AuditorOpportunityOut
    client: dict | None
    payment_amount: float | None
    travel_expenses: str
    lodging: str
    transportation: str
    status: str
    assigned_at: datetime
    confirmed_at: datetime | None
