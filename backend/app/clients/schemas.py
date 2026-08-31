"""Schemas Pydantic de clientes."""

from pydantic import BaseModel, ConfigDict, Field

from app.core.validators import Email


class ClientCreate(BaseModel):
    business_name: str = Field(min_length=2, max_length=255)
    commercial_name: str | None = Field(default=None, max_length=255)
    tax_id: str | None = Field(default=None, max_length=30)
    address: str | None = None
    city: str | None = Field(default=None, max_length=120)
    state: str | None = Field(default=None, max_length=120)
    contact_name: str | None = Field(default=None, max_length=120)
    contact_email: Email | None = None
    contact_phone: str | None = Field(default=None, max_length=30)
    notes: str | None = None


class ClientUpdate(BaseModel):
    business_name: str | None = Field(default=None, min_length=2, max_length=255)
    commercial_name: str | None = Field(default=None, max_length=255)
    tax_id: str | None = Field(default=None, max_length=30)
    address: str | None = None
    city: str | None = Field(default=None, max_length=120)
    state: str | None = Field(default=None, max_length=120)
    contact_name: str | None = Field(default=None, max_length=120)
    contact_email: Email | None = None
    contact_phone: str | None = Field(default=None, max_length=30)
    notes: str | None = None


class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    business_name: str
    commercial_name: str | None
    tax_id: str | None
    address: str | None
    city: str | None
    state: str | None
    contact_name: str | None
    contact_email: str | None
    contact_phone: str | None
    notes: str | None
