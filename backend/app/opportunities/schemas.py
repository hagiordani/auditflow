"""Schemas Pydantic de oportunidades de auditoría."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.opportunity import EXPENSE_OPTIONS, OpportunityStatus


class ClientBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    business_name: str
    commercial_name: str | None


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str


class CompetencyRequirement(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    competency: "CompetencyBrief"
    required_level: str


class CompetencyBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class OpportunityCompetencyIn(BaseModel):
    competency_id: int
    required_level: str = Field(default="Auditor", max_length=40)


class OpportunityCreate(BaseModel):
    client_id: int | None = None
    title: str = Field(min_length=3, max_length=255)
    description: str | None = None
    audit_type: str | None = Field(default=None, max_length=80)
    city: str | None = Field(default=None, max_length=120)
    state: str | None = Field(default=None, max_length=120)
    address: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    number_of_days: int = Field(default=1, ge=1, le=90)
    payment_amount: float | None = Field(default=None, ge=0, le=10_000_000)
    travel_expenses: str = Field(default="not_included", pattern=f"^({'|'.join(EXPENSE_OPTIONS)})$")
    lodging: str = Field(default="not_included", pattern=f"^({'|'.join(EXPENSE_OPTIONS)})$")
    transportation: str = Field(default="not_included", pattern=f"^({'|'.join(EXPENSE_OPTIONS)})$")
    application_deadline: date | None = None
    auditors_required: int = Field(default=1, ge=1, le=10)
    responsible_user_id: int | None = None
    competencies: list[OpportunityCompetencyIn] = []


class OpportunityUpdate(BaseModel):
    """Solo aplicable en estado Borrador."""

    client_id: int | None = None
    title: str | None = Field(default=None, min_length=3, max_length=255)
    description: str | None = None
    audit_type: str | None = Field(default=None, max_length=80)
    city: str | None = Field(default=None, max_length=120)
    state: str | None = Field(default=None, max_length=120)
    address: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    number_of_days: int | None = Field(default=None, ge=1, le=90)
    payment_amount: float | None = Field(default=None, ge=0, le=10_000_000)
    travel_expenses: str | None = Field(default=None, pattern=f"^({'|'.join(EXPENSE_OPTIONS)})$")
    lodging: str | None = Field(default=None, pattern=f"^({'|'.join(EXPENSE_OPTIONS)})$")
    transportation: str | None = Field(default=None, pattern=f"^({'|'.join(EXPENSE_OPTIONS)})$")
    application_deadline: date | None = None
    auditors_required: int | None = Field(default=None, ge=1, le=10)
    responsible_user_id: int | None = None
    competencies: list[OpportunityCompetencyIn] | None = None


class OpportunityOut(BaseModel):
    id: int
    folio: str
    client: ClientBrief | None
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
    responsible: UserBrief | None
    status: OpportunityStatus
    cancel_reason: str | None
    competencies: list[CompetencyRequirement]
    created_at: datetime
    updated_at: datetime


class TransitionRequest(BaseModel):
    to_status: OpportunityStatus
    reason: str | None = Field(default=None, max_length=500)


class CancelRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class AuditLogOut(BaseModel):
    id: int
    user: UserBrief | None
    action: str
    entity_type: str
    entity_id: int | None
    previous_data: dict | None
    new_data: dict | None
    created_at: datetime


CompetencyRequirement.model_rebuild()
