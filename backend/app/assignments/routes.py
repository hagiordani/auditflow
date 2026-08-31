"""Endpoints de asignaciones: selección del auditor definitivo y confirmación."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.applications.schemas import AuditorOpportunityOut
from app.assignments.schemas import AssignRequest, AssignmentOut, MyAssignmentOut
from app.auditors.routes import _auditor_opportunity_out, _load_auditor, _require_my_profile
from app.auth.dependencies import get_current_user, require_roles
from app.core.audit import log_action
from app.database import get_db
from app.models.application import Application
from app.models.assignment import BLOCKING_STATUSES, Assignment
from app.models.auditor import AuditorCompetency
from app.models.availability import AuditorAvailability
from app.models.opportunity import AuditOpportunity, OpportunityStatus
from app.models.user import User, UserRole
from app.notifications.service import notify
from app.opportunities.routes import _load as _load_opportunity, _to_out

router = APIRouter(tags=["assignments"])

STAFF = (UserRole.admin, UserRole.operations)

# Estados desde los que el staff puede asignar
ASSIGNABLE_STATUSES = {
    OpportunityStatus.published.value,
    OpportunityStatus.has_interested.value,
    OpportunityStatus.under_review.value,
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def find_overlap(
    db: Session,
    auditor_id: int,
    start_date,
    end_date,
    exclude_assignment_id: int | None = None,
) -> Assignment | None:
    """Busca otra asignación (pendiente o confirmada) con fechas cruzadas."""
    if not start_date or not end_date:
        return None
    query = (
        db.query(Assignment)
        .join(AuditOpportunity, Assignment.opportunity_id == AuditOpportunity.id)
        .filter(
            Assignment.auditor_id == auditor_id,
            Assignment.status.in_(BLOCKING_STATUSES),
            AuditOpportunity.start_date.isnot(None),
            AuditOpportunity.end_date.isnot(None),
            AuditOpportunity.start_date <= end_date,
            AuditOpportunity.end_date >= start_date,
        )
    )
    if exclude_assignment_id is not None:
        query = query.filter(Assignment.id != exclude_assignment_id)
    return query.first()


def _competency_reasons(db: Session, opportunity: AuditOpportunity, auditor_id: int) -> list[str]:
    valid_ids = {
        ac.competency_id
        for ac in db.query(AuditorCompetency)
        .filter(AuditorCompetency.auditor_id == auditor_id)
        .all()
        if ac.is_valid
    }
    reasons = []
    for oc in opportunity.competencies:
        if oc.competency_id not in valid_ids:
            reasons.append(f"No cuenta con la competencia vigente: {oc.competency.name}")
    return reasons


def _demote_opportunity(db: Session, opportunity: AuditOpportunity) -> str:
    """Vuelve la oportunidad a revisión (o publicada) cuando una asignación se cae."""
    interested = (
        db.query(Application)
        .filter(
            Application.opportunity_id == opportunity.id,
            Application.decision == "interested",
        )
        .count()
    )
    opportunity.status = (
        OpportunityStatus.under_review.value
        if interested > 0
        else OpportunityStatus.published.value
    )
    return opportunity.status


def _staff_assignment_out(db: Session, assignment: Assignment) -> AssignmentOut:
    return AssignmentOut(
        id=assignment.id,
        opportunity=_to_out(_load_opportunity(db, assignment.opportunity_id)),
        auditor_id=assignment.auditor_id,
        auditor_name=assignment.auditor.user.full_name,
        auditor_email=assignment.auditor.user.email,
        payment_amount=(
            float(assignment.payment_amount) if assignment.payment_amount is not None else None
        ),
        travel_expenses=assignment.travel_expenses,
        lodging=assignment.lodging,
        transportation=assignment.transportation,
        status=assignment.status,
        assigned_at=assignment.assigned_at,
        confirmed_at=assignment.confirmed_at,
        completed_at=assignment.completed_at,
    )


def _my_assignment_out(db: Session, assignment: Assignment) -> MyAssignmentOut:
    opportunity = _load_opportunity(db, assignment.opportunity_id)
    auditor = _load_auditor(db, assignment.auditor_id)
    opportunity_out = _auditor_opportunity_out(db, opportunity, auditor)
    client = None
    if opportunity.client:
        client = {
            "business_name": opportunity.client.business_name,
            "commercial_name": opportunity.client.commercial_name,
            "address": opportunity.client.address,
            "city": opportunity.client.city,
            "state": opportunity.client.state,
        }
    return MyAssignmentOut(
        id=assignment.id,
        opportunity=opportunity_out,
        client=client,
        payment_amount=(
            float(assignment.payment_amount) if assignment.payment_amount is not None else None
        ),
        travel_expenses=assignment.travel_expenses,
        lodging=assignment.lodging,
        transportation=assignment.transportation,
        status=assignment.status,
        assigned_at=assignment.assigned_at,
        confirmed_at=assignment.confirmed_at,
    )


@router.post("/opportunities/{opportunity_id}/assign", response_model=AssignmentOut, status_code=201)
def assign_auditor(
    opportunity_id: int,
    payload: AssignRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*STAFF)),
):
    opportunity = _load_opportunity(db, opportunity_id)
    if opportunity.status not in ASSIGNABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"No se puede asignar una oportunidad en estado '{opportunity.status}'",
        )
    if opportunity.start_date is None or opportunity.end_date is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La oportunidad no tiene fechas definidas",
        )

    auditor = _load_auditor(db, payload.auditor_id)
    if not auditor.user.is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="El auditor está desactivado"
        )

    # Debe existir una postulación "interesado" del auditor
    application = (
        db.query(Application)
        .filter(
            Application.opportunity_id == opportunity_id,
            Application.auditor_id == auditor.id,
            Application.decision == "interested",
        )
        .first()
    )
    if application is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El auditor no ha mostrado interés en esta oportunidad",
        )

    # Re-validar competencias vigentes
    reasons = _competency_reasons(db, opportunity, auditor.id)
    if reasons:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="; ".join(reasons))

    # Prevenir doble asignación del mismo auditor a la misma oportunidad
    existing = (
        db.query(Assignment)
        .filter(
            Assignment.opportunity_id == opportunity_id,
            Assignment.auditor_id == auditor.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El auditor ya está asignado a esta oportunidad",
        )

    # Prevenir traslape de fechas con otras asignaciones bloqueantes
    overlap = find_overlap(db, auditor.id, opportunity.start_date, opportunity.end_date)
    if overlap:
        other = _load_opportunity(db, overlap.opportunity_id)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "El auditor ya tiene una asignación con fechas incompatibles: "
                f"{other.folio} ({other.start_date} → {other.end_date})"
            ),
        )

    # Prevenir traslape con bloques de indisponibilidad del auditor
    blocking = (
        db.query(AuditorAvailability)
        .filter(
            AuditorAvailability.auditor_id == auditor.id,
            AuditorAvailability.start_date <= opportunity.end_date,
            AuditorAvailability.end_date >= opportunity.start_date,
        )
        .first()
    )
    if blocking:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "El auditor tiene un bloqueo de fechas: "
                f"{blocking.notes or blocking.availability_type} "
                f"({blocking.start_date} → {blocking.end_date})"
            ),
        )

    # Congelar condiciones: el pago ofrecido y viáticos se copian aquí.
    assignment = Assignment(
        opportunity_id=opportunity_id,
        auditor_id=auditor.id,
        payment_amount=(
            payload.payment_amount
            if payload.payment_amount is not None
            else opportunity.payment_amount
        ),
        travel_expenses=(
            payload.travel_expenses
            if payload.travel_expenses is not None
            else opportunity.travel_expenses
        ),
        lodging=payload.lodging if payload.lodging is not None else opportunity.lodging,
        transportation=(
            payload.transportation
            if payload.transportation is not None
            else opportunity.transportation
        ),
        status="pending",
    )
    db.add(assignment)
    db.flush()

    previous_status = opportunity.status
    opportunity.status = OpportunityStatus.assigned.value
    log_action(
        db,
        user.id,
        "assign",
        "opportunity",
        opportunity.id,
        previous={"status": previous_status},
        new={
            "status": opportunity.status,
            "auditor_id": auditor.id,
            "payment_amount": float(assignment.payment_amount)
            if assignment.payment_amount is not None
            else None,
        },
    )
    # Notificación al auditor asignado (debe confirmar)
    notify(
        db,
        auditor.user_id,
        f"Fuiste asignado al servicio {opportunity.folio}",
        f"{opportunity.title} · {opportunity.start_date} → {opportunity.end_date}. "
        "Confirma tu participación en Mis servicios.",
        "assignment",
    )
    if opportunity.responsible_user_id and opportunity.responsible_user_id != user.id:
        notify(
            db,
            opportunity.responsible_user_id,
            f"Asignación registrada: {opportunity.folio}",
            f"{auditor.user.full_name} debe confirmar el servicio {opportunity.title}.",
            "assignment",
        )
    db.commit()
    return _staff_assignment_out(db, assignment)


@router.get("/opportunities/{opportunity_id}/assignments", response_model=list[AssignmentOut])
def list_opportunity_assignments(
    opportunity_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*STAFF)),
):
    _load_opportunity(db, opportunity_id)
    assignments = (
        db.query(Assignment)
        .filter(Assignment.opportunity_id == opportunity_id)
        .order_by(Assignment.assigned_at.asc())
        .all()
    )
    return [_staff_assignment_out(db, a) for a in assignments]


@router.get("/auditors/me/assignments", response_model=list[MyAssignmentOut])
def my_assignments(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    auditor = _require_my_profile(db, user)
    assignments = (
        db.query(Assignment)
        .filter(Assignment.auditor_id == auditor.id)
        .order_by(Assignment.assigned_at.desc())
        .all()
    )
    return [_my_assignment_out(db, a) for a in assignments]


def _load_assignment(db: Session, assignment_id: int) -> Assignment:
    assignment = db.get(Assignment, assignment_id)
    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Asignación no encontrada"
        )
    return assignment


@router.post("/assignments/{assignment_id}/confirm", response_model=MyAssignmentOut)
def confirm_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != UserRole.auditor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el auditor asignado puede confirmar",
        )
    auditor = _require_my_profile(db, user)
    assignment = _load_assignment(db, assignment_id)
    if assignment.auditor_id != auditor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Esta asignación no es tuya"
        )
    if assignment.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"La asignación ya está en estado '{assignment.status}'",
        )
    assignment.status = "confirmed"
    assignment.confirmed_at = _utcnow()
    opportunity = _load_opportunity(db, assignment.opportunity_id)
    previous_status = opportunity.status
    opportunity.status = OpportunityStatus.confirmed.value
    log_action(
        db,
        user.id,
        "confirm_assignment",
        "opportunity",
        opportunity.id,
        previous={"status": previous_status},
        new={"status": opportunity.status, "assignment_id": assignment.id},
    )
    if opportunity.responsible_user_id:
        notify(
            db,
            opportunity.responsible_user_id,
            f"Servicio confirmado: {opportunity.folio}",
            f"{auditor.user.full_name} confirmó el servicio {opportunity.title}.",
            "assignment",
        )
    db.commit()
    return _my_assignment_out(db, assignment)


@router.post("/assignments/{assignment_id}/reject", response_model=MyAssignmentOut)
def reject_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != UserRole.auditor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el auditor asignado puede rechazar",
        )
    auditor = _require_my_profile(db, user)
    assignment = _load_assignment(db, assignment_id)
    if assignment.auditor_id != auditor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Esta asignación no es tuya"
        )
    if assignment.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"La asignación ya está en estado '{assignment.status}'",
        )
    assignment.status = "rejected"
    opportunity = _load_opportunity(db, assignment.opportunity_id)
    previous_status = opportunity.status
    new_status = _demote_opportunity(db, opportunity)
    log_action(
        db,
        user.id,
        "reject_assignment",
        "opportunity",
        opportunity.id,
        previous={"status": previous_status},
        new={"status": new_status, "assignment_id": assignment.id},
    )
    if opportunity.responsible_user_id:
        notify(
            db,
            opportunity.responsible_user_id,
            f"Asignación rechazada: {opportunity.folio}",
            f"{auditor.user.full_name} rechazó el servicio {opportunity.title}. "
            "La oportunidad volvió a revisión.",
            "assignment",
        )
    db.commit()
    return _my_assignment_out(db, assignment)


@router.post("/assignments/{assignment_id}/cancel", response_model=AssignmentOut)
def cancel_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*STAFF)),
):
    assignment = _load_assignment(db, assignment_id)
    if assignment.status not in ("pending", "confirmed"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"No se puede cancelar una asignación en estado '{assignment.status}'",
        )
    assignment.status = "cancelled"
    opportunity = _load_opportunity(db, assignment.opportunity_id)
    previous_status = opportunity.status
    new_status = _demote_opportunity(db, opportunity)
    log_action(
        db,
        user.id,
        "cancel_assignment",
        "opportunity",
        opportunity.id,
        previous={"status": previous_status},
        new={"status": new_status, "assignment_id": assignment.id},
    )
    notify(
        db,
        assignment.auditor.user_id,
        f"Asignación cancelada: {opportunity.folio}",
        f"El servicio {opportunity.title} fue cancelado por el equipo de operaciones.",
        "assignment",
    )
    db.commit()
    return _staff_assignment_out(db, assignment)
