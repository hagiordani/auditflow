"""Modelos de auditores, competencias y matriz de competencias."""

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.user import utcnow

# Niveles de competencia permitidos (catálogo simple para el MVP)
COMPETENCY_LEVELS = ["Auditor", "Auditor líder", "Auditor técnico", "Especialista"]

# Estados de disponibilidad del auditor
AVAILABILITY_STATUSES = ["available", "busy", "unavailable"]

# Tipo de auditor
AUDITOR_TYPES = ["interno", "externo"]


class Competency(Base):
    """Norma o especialidad en la que un auditor puede estar calificado (ISO 9001, ISO 14001…)."""

    __tablename__ = "competencies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    auditors: Mapped[list["AuditorCompetency"]] = relationship(
        back_populates="competency", cascade="all, delete-orphan"
    )


class Auditor(Base):
    """Perfil del auditor externo (vinculado a su cuenta de usuario)."""

    __tablename__ = "auditors"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(30))
    city: Mapped[str | None] = mapped_column(String(120))
    state: Mapped[str | None] = mapped_column(String(120))
    daily_rate: Mapped[float | None] = mapped_column(Numeric(12, 2))  # tarifa diaria MXN
    tax_id: Mapped[str | None] = mapped_column(String(30))  # RFC
    bank_information: Mapped[str | None] = mapped_column(Text)
    availability_status: Mapped[str] = mapped_column(
        String(20), default="available"
    )  # available | busy | unavailable
    auditor_type: Mapped[str] = mapped_column(
        String(20), default="externo"
    )  # interno | externo
    specialty: Mapped[str | None] = mapped_column(String(120))  # cargo / especialidad
    roles: Mapped[str | None] = mapped_column(String(200))  # roles separados por ';'
    rating: Mapped[float | None] = mapped_column()
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    user: Mapped["User"] = relationship(lazy="joined")  # noqa: F821
    competencies: Mapped[list["AuditorCompetency"]] = relationship(
        back_populates="auditor", cascade="all, delete-orphan"
    )


class AuditorCompetency(Base):
    """Fila de la matriz: competencia asignada a un auditor, con nivel y vigencia."""

    __tablename__ = "auditor_competencies"
    __table_args__ = (
        UniqueConstraint("auditor_id", "competency_id", name="uq_auditor_competency"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    auditor_id: Mapped[int] = mapped_column(ForeignKey("auditors.id"), index=True)
    competency_id: Mapped[int] = mapped_column(ForeignKey("competencies.id"), index=True)
    level: Mapped[str] = mapped_column(String(40), default="Auditor")
    certificate_number: Mapped[str | None] = mapped_column(String(80))
    valid_from: Mapped[date | None] = mapped_column(Date)
    valid_until: Mapped[date | None] = mapped_column(Date)
    document_url: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | revoked
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    auditor: Mapped["Auditor"] = relationship(back_populates="competencies")
    competency: Mapped["Competency"] = relationship(lazy="joined")

    @property
    def is_valid(self) -> bool:
        """Una competencia es válida si está activa y no ha vencido su vigencia."""
        return self.status == "active" and (
            self.valid_until is None or self.valid_until >= date.today()
        )
