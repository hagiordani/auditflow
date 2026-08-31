"""Modelos de oportunidades de auditoría, competencias requeridas y bitácora."""

import enum
from datetime import date, datetime
from typing import Any

from sqlalchemy import JSON, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.user import utcnow

# --- Estados del servicio y máquina de transiciones ---


class OpportunityStatus(str, enum.Enum):
    draft = "draft"  # Borrador
    published = "published"  # Publicada
    has_interested = "has_interested"  # Con interesados
    under_review = "under_review"  # En revisión
    assigned = "assigned"  # Asignada
    confirmed = "confirmed"  # Confirmada
    in_progress = "in_progress"  # En ejecución
    completed = "completed"  # Terminada
    invoice_received = "invoice_received"  # Factura recibida
    paid = "paid"  # Pagada
    cancelled = "cancelled"  # Cancelada


ALLOWED_TRANSITIONS: dict[OpportunityStatus, list[OpportunityStatus]] = {
    OpportunityStatus.draft: [OpportunityStatus.published, OpportunityStatus.cancelled],
    OpportunityStatus.published: [
        OpportunityStatus.has_interested,
        OpportunityStatus.under_review,
        OpportunityStatus.assigned,
        OpportunityStatus.cancelled,
    ],
    OpportunityStatus.has_interested: [
        OpportunityStatus.under_review,
        OpportunityStatus.assigned,
        OpportunityStatus.cancelled,
    ],
    OpportunityStatus.under_review: [OpportunityStatus.assigned, OpportunityStatus.cancelled],
    OpportunityStatus.assigned: [OpportunityStatus.confirmed, OpportunityStatus.cancelled],
    OpportunityStatus.confirmed: [OpportunityStatus.in_progress, OpportunityStatus.cancelled],
    OpportunityStatus.in_progress: [OpportunityStatus.completed],
    OpportunityStatus.completed: [OpportunityStatus.invoice_received],
    OpportunityStatus.invoice_received: [OpportunityStatus.paid],
    OpportunityStatus.paid: [],
    OpportunityStatus.cancelled: [],
}

# Viáticos / hospedaje / transporte
EXPENSE_OPTIONS = ("included", "not_included")


class AuditOpportunity(Base):
    __tablename__ = "audit_opportunities"

    id: Mapped[int] = mapped_column(primary_key=True)
    folio: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    client_id: Mapped[int | None] = mapped_column(ForeignKey("clients.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    audit_type: Mapped[str | None] = mapped_column(String(80))  # certificación, vigilancia…
    city: Mapped[str | None] = mapped_column(String(120))
    state: Mapped[str | None] = mapped_column(String(120))
    address: Mapped[str | None] = mapped_column(Text)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    number_of_days: Mapped[int] = mapped_column(Integer, default=1)
    payment_amount: Mapped[float | None] = mapped_column(Numeric(12, 2))
    travel_expenses: Mapped[str] = mapped_column(String(20), default="not_included")
    lodging: Mapped[str] = mapped_column(String(20), default="not_included")
    transportation: Mapped[str] = mapped_column(String(20), default="not_included")
    application_deadline: Mapped[date | None] = mapped_column(Date)
    auditors_required: Mapped[int] = mapped_column(Integer, default=1)
    responsible_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(30), default=OpportunityStatus.draft.value, index=True)
    cancel_reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    client: Mapped["Client | None"] = relationship(lazy="joined")  # noqa: F821
    responsible: Mapped["User | None"] = relationship(lazy="joined")  # noqa: F821
    competencies: Mapped[list["OpportunityCompetency"]] = relationship(
        back_populates="opportunity", cascade="all, delete-orphan"
    )


class OpportunityCompetency(Base):
    """Competencias requeridas por la oportunidad, con nivel mínimo exigido."""

    __tablename__ = "opportunity_competencies"
    __table_args__ = (
        UniqueConstraint("opportunity_id", "competency_id", name="uq_opportunity_competency"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    opportunity_id: Mapped[int] = mapped_column(ForeignKey("audit_opportunities.id"), index=True)
    competency_id: Mapped[int] = mapped_column(ForeignKey("competencies.id"), index=True)
    required_level: Mapped[str] = mapped_column(String(40), default="Auditor")

    opportunity: Mapped["AuditOpportunity"] = relationship(back_populates="competencies")
    competency: Mapped["Competency"] = relationship(lazy="joined")  # noqa: F821


class AuditLog(Base):
    """Bitácora de acciones: quién, qué, cuándo y con qué datos."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(60), index=True)
    entity_type: Mapped[str] = mapped_column(String(60), index=True)
    entity_id: Mapped[int | None] = mapped_column(index=True)
    previous_data: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    new_data: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped["User | None"] = relationship(lazy="joined")  # noqa: F821
