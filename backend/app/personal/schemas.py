"""Schemas Pydantic del catálogo de personal técnico."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str


class RoleCreate(BaseModel):
    nombre: str = Field(min_length=2, max_length=50)


class AreaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    codigo: str
    nombre: str | None


class AreaCreate(BaseModel):
    codigo: str = Field(min_length=1, max_length=30)
    nombre: str | None = Field(default=None, max_length=150)


class PersonalEmailIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    principal: bool = False


class PersonalEmailOut(BaseModel):
    id: int
    email: str
    principal: bool


class PersonalCreate(BaseModel):
    nombre_completo: str = Field(min_length=2, max_length=200)
    celular: str | None = Field(default=None, max_length=30)
    rol_ids: list[int] = []
    area_ids: list[int] = []
    emails: list[PersonalEmailIn] = []


class PersonalUpdate(BaseModel):
    nombre_completo: str | None = Field(default=None, min_length=2, max_length=200)
    celular: str | None = Field(default=None, max_length=30)
    activo: bool | None = None
    rol_ids: list[int] | None = None
    area_ids: list[int] | None = None
    emails: list[PersonalEmailIn] | None = None


class PersonalOut(BaseModel):
    id: int
    nombre_completo: str
    celular: str | None
    activo: bool
    roles: list[RoleOut] = []
    areas: list[AreaOut] = []
    emails: list[PersonalEmailOut] = []
    created_at: datetime
    updated_at: datetime
