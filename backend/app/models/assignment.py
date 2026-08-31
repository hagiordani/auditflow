"""Modelo de asignaciones: el pago y condiciones quedan CONGELADOS aquí."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.user import utcnow

# Estados de una asignación
ASSIGNMENT_STATUSES = ("pending", "confirmed", "rejected", "cancelled")

# Estados que bloquean fechas del auditor (cuentan para traslapes)
BLOCKING_STATUSES = ("pending", "confirmed")


class Assignment(Base):
    """Asignación definitiva de un auditor a una oportunidad."""

    __tablename__ = "assignments"
    __table_args__ = (
        UniqueConstraint("opportunity_id", "auditor_id", name="uq_assignment_auditor"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    opportunity_id: Mapped[int] = mapped_column(ForeignKey("audit_opportunities.id"), index=True)
    auditor_id: Mapped[int] = mapped_column(ForeignKey("auditors.id"), index=True)

    # Condiciones congeladas al momento de asignar (no cambian si la tarifa u
    # oportunidad se modifica después).
    payment_amount: Mapped[float | None] = mapped_column(Numeric(12, 2))
    travel_expenses: Mapped[str] = mapped_column(String(20))
    lodging: Mapped[str] = mapped_column(String(20))
    transportation: Mapped[str] = mapped_column(String(20))

    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    opportunity: Mapped["AuditOpportunity"] = relationship(lazy="joined")  # noqa: F821
    auditor: Mapped["Auditor"] = relationship(lazy="joined")  # noqa: F821
