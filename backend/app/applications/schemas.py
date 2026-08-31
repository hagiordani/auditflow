"""Schemas Pydantic de postulaciones."""

from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.application import APPLICATION_DECISIONS
from app.opportunities.schemas import CompetencyRequirement


class ApplicationCreate(BaseModel):
    decision: str = Field(pattern=f"^({'|'.join(APPLICATION_DECISIONS)})$")
    comments: str | None = Field(default=None, max_length=1000)


class AuditorBrief(BaseModel):
    id: int
    full_name: str
    email: str
    city: str | None
    state: str | None
    daily_rate: float | None


class ApplicationOut(BaseModel):
    """Postulación vista por el staff (incluye datos del auditor)."""

    id: int
    opportunity_id: int
    auditor: AuditorBrief
    decision: str
    comments: str | None
    applied_at: datetime
    reviewed_at: datetime | None


class MyApplicationBrief(BaseModel):
    id: int
    decision: str
    comments: str | None
    applied_at: datetime


class AuditorOpportunityOut(BaseModel):
    """Oportunidad vista por el auditor: sin datos del cliente (privacidad)."""

    id: int
    folio: str
    title: str
    description: str | None
    audit_type: str | None
    city: str | None
    state: str | None
    address: str | None
    start_date: date | None
    end_date: date | None
    number_of_days: int
    payment_amount: float | None
    travel_expenses: str
    lodging: str
    transportation: str
    application_deadline: date | None
    auditors_required: int
    status: str
    competencies: list[CompetencyRequirement]
    my_application: MyApplicationBrief | None


class MyApplicationOut(BaseModel):
    """Postulación del auditor, con el detalle de la oportunidad."""

    id: int
    decision: str
    comments: str | None
    applied_at: datetime
    opportunity: AuditorOpportunityOut
