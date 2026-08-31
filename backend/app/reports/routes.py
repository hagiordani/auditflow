"""Endpoints de reportes e indicadores para dirección y operaciones."""

import csv
import io
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.applications.service import OPEN_STATUSES, check_compatibility
from app.auditors.routes import _require_my_profile
from app.auth.dependencies import get_current_user, require_roles
from app.database import get_db
from app.models.application import Application
from app.models.assignment import Assignment
from app.models.auditor import Auditor, AuditorCompetency
from app.models.client import Client
from app.models.document import Document
from app.models.opportunity import (
    AuditOpportunity,
    OpportunityCompetency,
    OpportunityStatus,
)
from app.models.user import User, UserRole

router = APIRouter(prefix="/reports", tags=["reports"])

READERS = (UserRole.admin, UserRole.operations, UserRole.supervisor)


@router.get("/summary")
def summary(db: Session = Depends(get_db), _: User = Depends(require_roles(*READERS))):
    today = date.today()
    month_start = today.replace(day=1)

    # Oportunidades por estado
    by_status = {s.value: 0 for s in OpportunityStatus}
    rows = db.query(AuditOpportunity.status, func.count(AuditOpportunity.id)).group_by(
        AuditOpportunity.status
    ).all()
    for status, count in rows:
        by_status[status] = count

    # Auditores
    total_auditors = db.query(Auditor).count()
    active_auditors = (
        db.query(Auditor).join(User, Auditor.user_id == User.id).filter(User.is_active.is_(True)).count()
    )

    # Asignaciones
    pending_confirmations = db.query(Assignment).filter(Assignment.status == "pending").count()
    confirmed_assignments = db.query(Assignment).filter(Assignment.status == "confirmed").count()
    confirmed_cost_total = (
        db.query(func.coalesce(func.sum(Assignment.payment_amount), 0))
        .filter(Assignment.status == "confirmed")
        .scalar()
    )
    cost_this_month = (
        db.query(func.coalesce(func.sum(Assignment.payment_amount), 0))
        .join(AuditOpportunity, Assignment.opportunity_id == AuditOpportunity.id)
        .filter(
            Assignment.status == "confirmed",
            AuditOpportunity.start_date >= month_start,
        )
        .scalar()
    )

    # Certificaciones próximas a vencer (60 días)
    expiring_certifications = (
        db.query(AuditorCompetency)
        .filter(
            AuditorCompetency.status == "active",
            AuditorCompetency.valid_until.isnot(None),
            AuditorCompetency.valid_until >= today,
            AuditorCompetency.valid_until <= today + timedelta(days=60),
        )
        .count()
    )

    # Facturas pendientes: asignaciones confirmadas/terminadas sin factura en la oportunidad
    opportunities_with_invoice = (
        db.query(Document.entity_id)
        .filter(Document.entity_type == "opportunity", Document.document_type == "invoice")
        .subquery()
    )
    invoices_pending = (
        db.query(Assignment)
        .join(AuditOpportunity, Assignment.opportunity_id == AuditOpportunity.id)
        .filter(
            Assignment.status.in_(["confirmed"]),
            ~AuditOpportunity.id.in_(db.query(opportunities_with_invoice.c.entity_id)),
        )
        .count()
    )

    return {
        "total_opportunities": sum(by_status.values()),
        "opportunities_by_status": by_status,
        "total_auditors": total_auditors,
        "active_auditors": active_auditors,
        "pending_confirmations": pending_confirmations,
        "confirmed_assignments": confirmed_assignments,
        "confirmed_cost_total": float(confirmed_cost_total or 0),
        "cost_this_month": float(cost_this_month or 0),
        "expiring_certifications_60d": expiring_certifications,
        "invoices_pending": invoices_pending,
    }


@router.get("/auditor-summary")
def auditor_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    auditor = _require_my_profile(db, user)

    # Oportunidades compatibles disponibles
    open_opportunities = (
        db.query(AuditOpportunity)
        .filter(AuditOpportunity.status.in_(OPEN_STATUSES))
        .all()
    )
    db.query(AuditorCompetency).filter(AuditorCompetency.auditor_id == auditor.id).all()
    available = sum(
        1 for o in open_opportunities if not check_compatibility(db, o, auditor)
    )

    my_applications = (
        db.query(Application).filter(Application.auditor_id == auditor.id).count()
    )
    upcoming = (
        db.query(Assignment)
        .filter(Assignment.auditor_id == auditor.id, Assignment.status.in_(["pending", "confirmed"]))
        .all()
    )
    occupied_days = sum(
        a.opportunity.number_of_days for a in upcoming if a.opportunity.start_date
    )
    my_documents = (
        db.query(Document)
        .filter(Document.entity_type == "auditor", Document.entity_id == auditor.id)
        .count()
    )

    today = date.today()
    expiring_my_certs = (
        db.query(AuditorCompetency)
        .filter(
            AuditorCompetency.auditor_id == auditor.id,
            AuditorCompetency.status == "active",
            AuditorCompetency.valid_until.isnot(None),
            AuditorCompetency.valid_until >= today,
            AuditorCompetency.valid_until <= today + timedelta(days=90),
        )
        .count()
    )

    return {
        "available_opportunities": available,
        "my_applications": my_applications,
        "upcoming_assignments": len(upcoming),
        "occupied_days": occupied_days,
        "my_documents": my_documents,
        "expiring_my_certifications_90d": expiring_my_certs,
    }


@router.get("/by-client")
def by_client(db: Session = Depends(get_db), _: User = Depends(require_roles(*READERS))):
    rows = (
        db.query(
            Client.id,
            Client.business_name,
            Client.commercial_name,
            func.count(AuditOpportunity.id).label("total"),
        )
        .outerjoin(AuditOpportunity, AuditOpportunity.client_id == Client.id)
        .group_by(Client.id, Client.business_name, Client.commercial_name)
        .order_by(func.count(AuditOpportunity.id).desc())
        .all()
    )
    return [
        {
            "client_id": r.id,
            "business_name": r.business_name,
            "commercial_name": r.commercial_name,
            "total": r.total,
        }
        for r in rows
    ]


@router.get("/auditors-usage")
def auditors_usage(db: Session = Depends(get_db), _: User = Depends(require_roles(*READERS))):
    rows = (
        db.query(
            Auditor.id,
            User.full_name,
            User.email,
            func.count(Assignment.id).label("total"),
            func.sum(case((Assignment.status == "confirmed", 1), else_=0)).label("confirmed"),
        )
        .join(User, Auditor.user_id == User.id)
        .outerjoin(Assignment, Assignment.auditor_id == Auditor.id)
        .group_by(Auditor.id, User.full_name, User.email)
        .order_by(func.count(Assignment.id).desc())
        .all()
    )
    return [
        {
            "auditor_id": r.id,
            "name": r.full_name,
            "email": r.email,
            "total_assignments": r.total,
            "confirmed": int(r.confirmed or 0),
        }
        for r in rows
    ]


@router.get("/expiring-certifications")
def expiring_certifications(
    days: int = Query(default=60, ge=1, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*READERS)),
):
    today = date.today()
    rows = (
        db.query(AuditorCompetency)
        .filter(
            AuditorCompetency.status == "active",
            AuditorCompetency.valid_until.isnot(None),
            AuditorCompetency.valid_until >= today,
            AuditorCompetency.valid_until <= today + timedelta(days=days),
        )
        .order_by(AuditorCompetency.valid_until.asc())
        .all()
    )
    return [
        {
            "auditor": ac.auditor.user.full_name,
            "competency": ac.competency.name,
            "level": ac.level,
            "valid_until": ac.valid_until.isoformat(),
            "days_left": (ac.valid_until - today).days,
        }
        for ac in rows
    ]


@router.get("/export.csv")
def export_csv(db: Session = Depends(get_db), _: User = Depends(require_roles(*READERS))):
    """Exportación de oportunidades a CSV (compatible con Excel)."""
    opportunities = (
        db.query(AuditOpportunity)
        .order_by(AuditOpportunity.created_at.desc())
        .all()
    )
    assignments = (
        db.query(Assignment)
        .filter(Assignment.status.in_(["pending", "confirmed"]))
        .all()
    )
    by_opportunity: dict[int, list[str]] = {}
    for a in assignments:
        by_opportunity.setdefault(a.opportunity_id, []).append(
            f"{a.auditor.user.full_name} ({a.status})"
        )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "Folio",
            "Título",
            "Cliente",
            "Ciudad",
            "Estado",
            "Inicio",
            "Fin",
            "Días",
            "Pago",
            "Estado del servicio",
            "Auditor asignado",
            "Responsable",
        ]
    )
    for o in opportunities:
        writer.writerow(
            [
                o.folio,
                o.title,
                o.client.business_name if o.client else "",
                o.city or "",
                o.state or "",
                o.start_date.isoformat() if o.start_date else "",
                o.end_date.isoformat() if o.end_date else "",
                o.number_of_days,
                f"{float(o.payment_amount):.2f}" if o.payment_amount is not None else "",
                o.status,
                "; ".join(by_opportunity.get(o.id, [])),
                o.responsible.full_name if o.responsible else "",
            ]
        )

    content = "\ufeff" + output.getvalue()  # BOM para Excel
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=oportunidades_auditflow.csv"},
    )
