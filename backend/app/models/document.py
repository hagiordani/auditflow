"""Modelo de documentos adjuntos (certificados, órdenes, reportes, facturas)."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.user import utcnow

DOCUMENT_TYPES = ("certificate", "service_order", "agenda", "report", "invoice", "other")

ENTITY_TYPES = ("opportunity", "auditor", "assignment")

DOCUMENT_TYPE_LABELS = {
    "certificate": "Certificado",
    "service_order": "Orden de servicio",
    "agenda": "Agenda de auditoría",
    "report": "Reporte",
    "invoice": "Factura",
    "other": "Otro",
}


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(20), index=True)  # opportunity|auditor|assignment
    entity_id: Mapped[int] = mapped_column(index=True)
    document_type: Mapped[str] = mapped_column(String(30))
    file_name: Mapped[str] = mapped_column(String(255))  # nombre original
    stored_name: Mapped[str] = mapped_column(String(255))  # nombre en disco (uuid.ext)
    content_type: Mapped[str | None] = mapped_column(String(120))
    size_bytes: Mapped[int | None] = mapped_column()
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    uploader: Mapped["User | None"] = relationship(lazy="joined")  # noqa: F821
