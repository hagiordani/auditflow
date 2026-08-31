"""Modelo de postulaciones de auditores a oportunidades."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.user import utcnow

# Decisiones de postulación
APPLICATION_DECISIONS = ("interested", "not_available")


class Application(Base):
    """Postulación de un auditor a una oportunidad (Me interesa / No disponible)."""

    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("opportunity_id", "auditor_id", name="uq_application_auditor"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    opportunity_id: Mapped[int] = mapped_column(ForeignKey("audit_opportunities.id"), index=True)
    auditor_id: Mapped[int] = mapped_column(ForeignKey("auditors.id"), index=True)
    decision: Mapped[str] = mapped_column(String(20))  # interested | not_available
    comments: Mapped[str | None] = mapped_column(Text)
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    auditor: Mapped["Auditor"] = relationship(lazy="joined")  # noqa: F821
    opportunity: Mapped["AuditOpportunity"] = relationship(  # noqa: F821
        back_populates="applications"
    )
