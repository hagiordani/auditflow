"""Modelos del catálogo de personal técnico (evaluadores, instructores, etc.)."""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.user import utcnow


class Role(Base):
    """Puesto del personal técnico (EVALUADOR, INSTRUCTOR, INSPECTOR, EXAMINADOR)."""

    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(50), unique=True)
    # Relación N:M hacia Personal
    people: Mapped[list["PersonalRole"]] = relationship(
        back_populates="role", cascade="all, delete-orphan"
    )


class Area(Base):
    """Área funcional (SG, NN, CIFA, SECTOR)."""

    __tablename__ = "areas"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(30), unique=True)
    nombre: Mapped[str | None] = mapped_column(String(150))
    people: Mapped[list["PersonalArea"]] = relationship(
        back_populates="area", cascade="all, delete-orphan"
    )


class Personal(Base):
    """Una persona del catálogo (personal técnico)."""

    __tablename__ = "personal"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre_completo: Mapped[str] = mapped_column(String(200), index=True)
    celular: Mapped[str | None] = mapped_column(String(30))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    emails: Mapped[list["PersonalEmail"]] = relationship(
        back_populates="personal", cascade="all, delete-orphan"
    )
    roles: Mapped[list["PersonalRole"]] = relationship(
        back_populates="personal", cascade="all, delete-orphan"
    )
    areas: Mapped[list["PersonalArea"]] = relationship(
        back_populates="personal", cascade="all, delete-orphan"
    )


class PersonalEmail(Base):
    __tablename__ = "personal_emails"
    __table_args__ = (
        # Un solo correo "principal" por persona (PostgreSQL); SQLite lo ignora.
        Index(
            "uq_personal_emails_principal",
            "personal_id",
            unique=True,
            postgresql_where=text("principal = TRUE"),
            sqlite_where=text("principal = TRUE"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    personal_id: Mapped[int] = mapped_column(
        ForeignKey("personal.id", ondelete="CASCADE"), index=True
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    principal: Mapped[bool] = mapped_column(Boolean, default=False)

    personal: Mapped["Personal"] = relationship(back_populates="emails")


class PersonalRole(Base):
    __tablename__ = "personal_roles"

    personal_id: Mapped[int] = mapped_column(
        ForeignKey("personal.id", ondelete="CASCADE"), primary_key=True
    )
    rol_id: Mapped[int] = mapped_column(
        ForeignKey("roles.id", ondelete="RESTRICT"), primary_key=True
    )

    personal: Mapped["Personal"] = relationship(back_populates="roles")
    role: Mapped["Role"] = relationship(back_populates="people")


class PersonalArea(Base):
    __tablename__ = "personal_areas"

    personal_id: Mapped[int] = mapped_column(
        ForeignKey("personal.id", ondelete="CASCADE"), primary_key=True
    )
    area_id: Mapped[int] = mapped_column(
        ForeignKey("areas.id", ondelete="RESTRICT"), primary_key=True
    )

    personal: Mapped["Personal"] = relationship(back_populates="areas")
    area: Mapped["Area"] = relationship(back_populates="people")
