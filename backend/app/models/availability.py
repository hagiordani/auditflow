"""Modelo de indisponibilidad del auditor (vacaciones, bloqueos)."""

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.user import utcnow

AVAILABILITY_TYPES = ("vacations", "blocked", "unavailable")


class AuditorAvailability(Base):
    """Bloque de fechas en el que el auditor NO puede tomar servicios."""

    __tablename__ = "auditor_availability"

    id: Mapped[int] = mapped_column(primary_key=True)
    auditor_id: Mapped[int] = mapped_column(ForeignKey("auditors.id"), index=True)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    availability_type: Mapped[str] = mapped_column(String(20), default="unavailable")
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )
