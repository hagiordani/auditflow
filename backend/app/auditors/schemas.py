"""Schemas Pydantic de auditores y matriz de competencias."""

from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.core.validators import Email, Password
from app.models.auditor import AVAILABILITY_STATUSES, COMPETENCY_LEVELS


class CompetencyBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class AuditorCompetencyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    competency: CompetencyBrief
    level: str
    certificate_number: str | None
    valid_from: date | None
    valid_until: date | None
    document_url: str | None
    status: str
    is_valid: bool


class AuditorOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: Email
    is_active: bool
    phone: str | None
    city: str | None
    state: str | None
    daily_rate: float | None
    tax_id: str | None
    bank_information: str | None
    availability_status: str
    rating: float | None
    notes: str | None
    competencies: list[AuditorCompetencyOut]


class AuditorCreate(BaseModel):
    """Alta de auditor: crea también su cuenta de usuario (rol auditor)."""

    email: Email
    full_name: str = Field(min_length=2, max_length=255)
    password: Password
    phone: str | None = Field(default=None, max_length=30)
    city: str | None = Field(default=None, max_length=120)
    state: str | None = Field(default=None, max_length=120)
    daily_rate: float | None = Field(default=None, ge=0, le=1_000_000)
    tax_id: str | None = Field(default=None, max_length=30)
    bank_information: str | None = None
    availability_status: str = Field(default="available", pattern="^(available|busy|unavailable)$")
    notes: str | None = None


class AuditorUpdate(BaseModel):
    phone: str | None = Field(default=None, max_length=30)
    city: str | None = Field(default=None, max_length=120)
    state: str | None = Field(default=None, max_length=120)
    daily_rate: float | None = Field(default=None, ge=0, le=1_000_000)
    tax_id: str | None = Field(default=None, max_length=30)
    bank_information: str | None = None
    availability_status: str | None = Field(
        default=None, pattern="^(available|busy|unavailable)$"
    )
    rating: float | None = Field(default=None, ge=0, le=5)
    notes: str | None = None


class AuditorCompetencyCreate(BaseModel):
    competency_id: int
    level: str = Field(default="Auditor")
    certificate_number: str | None = Field(default=None, max_length=80)
    valid_from: date | None = None
    valid_until: date | None = None
    document_url: str | None = Field(default=None, max_length=500)


class CompetencyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None


class CompetencyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = None
    is_active: bool | None = None


class CompetencyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    is_active: bool


__all__ = [
    "AuditorOut",
    "AuditorCreate",
    "AuditorUpdate",
    "AuditorCompetencyOut",
    "AuditorCompetencyCreate",
    "CompetencyBrief",
    "CompetencyOut",
    "CompetencyCreate",
    "CompetencyUpdate",
    "COMPETENCY_LEVELS",
    "AVAILABILITY_STATUSES",
]
