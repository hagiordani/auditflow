"""Endpoints de oportunidades de auditoría."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from app.auth.dependencies import get_current_user, require_roles
from app.core.audit import log_action
from app.database import get_db
from app.models.auditor import Competency
from app.models.client import Client
from app.models.opportunity import (
    ALLOWED_TRANSITIONS,
    AuditLog,
    AuditOpportunity,
    OpportunityCompetency,
    OpportunityStatus,
)
from app.models.user import User, UserRole
from app.opportunities.schemas import (
    AuditLogOut,
    CancelRequest,
    ClientBrief,
    CompetencyRequirement,
    OpportunityCreate,
    OpportunityOut,
    OpportunityUpdate,
    TransitionRequest,
    UserBrief,
)

router = APIRouter(prefix="/opportunities", tags=["opportunities"])

STAFF = (UserRole.admin, UserRole.operations)
READERS = (UserRole.admin, UserRole.operations, UserRole.supervisor)


# ---------- Helpers ----------


def _load(db: Session, opportunity_id: int) -> AuditOpportunity:
    opportunity = (
        db.query(AuditOpportunity)
        .options(
            selectinload(AuditOpportunity.client),
            selectinload(AuditOpportunity.responsible),
            selectinload(AuditOpportunity.competencies).selectinload(
                OpportunityCompetency.competency
            ),
        )
        .filter(AuditOpportunity.id == opportunity_id)
        .first()
    )
    if opportunity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Oportunidad no encontrada"
        )
    return opportunity


def _to_out(opportunity: AuditOpportunity) -> OpportunityOut:
    return OpportunityOut(
        id=opportunity.id,
        folio=opportunity.folio,
        client=ClientBrief.model_validate(opportunity.client) if opportunity.client else None,
        title=opportunity.title,
        description=opportunity.description,
        audit_type=opportunity.audit_type,
        city=opportunity.city,
        state=opportunity.state,
        address=opportunity.address,
        start_date=opportunity.start_date,
        end_date=opportunity.end_date,
        number_of_days=opportunity.number_of_days,
        payment_amount=(
            float(opportunity.payment_amount) if opportunity.payment_amount is not None else None
        ),
        travel_expenses=opportunity.travel_expenses,
        lodging=opportunity.lodging,
        transportation=opportunity.transportation,
        application_deadline=opportunity.application_deadline,
        auditors_required=opportunity.auditors_required,
        responsible=(
            UserBrief.model_validate(opportunity.responsible) if opportunity.responsible else None
        ),
        status=OpportunityStatus(opportunity.status),
        cancel_reason=opportunity.cancel_reason,
        competencies=[
            CompetencyRequirement.model_validate(oc) for oc in opportunity.competencies
        ],
        created_at=opportunity.created_at,
        updated_at=opportunity.updated_at,
    )


def _generate_folio(db: Session, year: int) -> str:
    prefix = f"AUD-{year}-"
    rows = (
        db.query(AuditOpportunity.folio)
        .filter(AuditOpportunity.folio.like(f"{prefix}%"))
        .all()
    )
    numbers = []
    for (folio,) in rows:
        suffix = folio.rsplit("-", 1)[-1]
        if suffix.isdigit():
            numbers.append(int(suffix))
    sequence = max(numbers) + 1 if numbers else 1
    return f"{prefix}{sequence:05d}"


def _validate_dates(start: date | None, end: date | None, deadline: date | None) -> None:
    if start and end and end < start:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La fecha de finalización no puede ser anterior a la de inicio",
        )
    if start and deadline and deadline > start:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La fecha límite para postularse debe ser anterior o igual al inicio del servicio",
        )


def _sync_competencies(db: Session, opportunity: AuditOpportunity, items: list) -> None:
    """Reemplaza las competencias requeridas (solo se llama en estados editables)."""
    by_id = {item.competency_id: item for item in items}
    existing = {oc.competency_id: oc for oc in opportunity.competencies}

    for competency_id, oc in list(existing.items()):
        if competency_id not in by_id:
            db.delete(oc)

    for competency_id, item in by_id.items():
        competency = db.get(Competency, competency_id)
        if competency is None or not competency.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Competencia {competency_id} no encontrada o desactivada",
            )
        if competency_id in existing:
            existing[competency_id].required_level = item.required_level
        else:
            opportunity.competencies.append(
                OpportunityCompetency(
                    competency_id=competency_id, required_level=item.required_level
                )
            )


def _validate_publish(opportunity: AuditOpportunity) -> None:
    problems = []
    if opportunity.client_id is None:
        problems.append("cliente")
    if not opportunity.title.strip():
        problems.append("título")
    if opportunity.start_date is None or opportunity.end_date is None:
        problems.append("fechas del servicio")
    if opportunity.application_deadline is None:
        problems.append("fecha límite para postularse")
    if not opportunity.competencies:
        problems.append("al menos una competencia requerida")
    if problems:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"No se puede publicar: falta {', '.join(problems)}",
        )
    _validate_dates(opportunity.start_date, opportunity.end_date, opportunity.application_deadline)


# ---------- Endpoints ----------


@router.get("", response_model=list[OpportunityOut])
def list_opportunities(
    status_filter: OpportunityStatus | None = Query(default=None, alias="status"),
    client_id: int | None = None,
    competency_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*READERS)),
):
    query = (
        db.query(AuditOpportunity)
        .options(
            selectinload(AuditOpportunity.client),
            selectinload(AuditOpportunity.responsible),
            selectinload(AuditOpportunity.competencies).selectinload(
                OpportunityCompetency.competency
            ),
        )
        .order_by(AuditOpportunity.created_at.desc())
    )
    if status_filter is not None:
        query = query.filter(AuditOpportunity.status == status_filter.value)
    if client_id is not None:
        query = query.filter(AuditOpportunity.client_id == client_id)
    if competency_id is not None:
        query = query.join(OpportunityCompetency).filter(
            OpportunityCompetency.competency_id == competency_id
        )
    return [_to_out(o) for o in query.all()]


@router.post("", response_model=OpportunityOut, status_code=status.HTTP_201_CREATED)
def create_opportunity(
    payload: OpportunityCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*STAFF)),
):
    _validate_dates(payload.start_date, payload.end_date, payload.application_deadline)
    if payload.client_id is not None and db.get(Client, payload.client_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
    if payload.responsible_user_id is not None and db.get(User, payload.responsible_user_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Responsable no encontrado"
        )

    opportunity = AuditOpportunity(
        folio=_generate_folio(db, date.today().year),
        client_id=payload.client_id,
        title=payload.title.strip(),
        description=payload.description,
        audit_type=payload.audit_type,
        city=payload.city,
        state=payload.state,
        address=payload.address,
        start_date=payload.start_date,
        end_date=payload.end_date,
        number_of_days=payload.number_of_days,
        payment_amount=payload.payment_amount,
        travel_expenses=payload.travel_expenses,
        lodging=payload.lodging,
        transportation=payload.transportation,
        application_deadline=payload.application_deadline,
        auditors_required=payload.auditors_required,
        responsible_user_id=payload.responsible_user_id,
        status=OpportunityStatus.draft.value,
    )
    db.add(opportunity)
    db.flush()
    _sync_competencies(db, opportunity, payload.competencies)
    db.flush()
    log_action(
        db,
        user.id,
        "create",
        "opportunity",
        opportunity.id,
        new={"folio": opportunity.folio, "title": opportunity.title},
    )
    db.commit()
    return _to_out(_load(db, opportunity.id))


@router.get("/{opportunity_id}", response_model=OpportunityOut)
def get_opportunity(
    opportunity_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*READERS)),
):
    return _to_out(_load(db, opportunity_id))


@router.patch("/{opportunity_id}", response_model=OpportunityOut)
def update_opportunity(
    opportunity_id: int,
    payload: OpportunityUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*STAFF)),
):
    opportunity = _load(db, opportunity_id)
    if opportunity.status != OpportunityStatus.draft.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Solo se puede editar una oportunidad en estado Borrador",
        )

    changes = payload.model_dump(exclude_unset=True)
    competencies = changes.pop("competencies", None)

    _validate_dates(
        changes.get("start_date", opportunity.start_date),
        changes.get("end_date", opportunity.end_date),
        changes.get("application_deadline", opportunity.application_deadline),
    )
    if "client_id" in changes and changes["client_id"] is not None:
        if db.get(Client, changes["client_id"]) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")

    previous = {k: getattr(opportunity, k) for k in changes}
    for field, value in changes.items():
        setattr(opportunity, field, value)
    if competencies is not None:
        _sync_competencies(db, opportunity, competencies)
    log_action(db, user.id, "update", "opportunity", opportunity.id, previous=previous, new=changes)
    db.commit()
    return _to_out(_load(db, opportunity.id))


@router.post("/{opportunity_id}/publish", response_model=OpportunityOut)
def publish_opportunity(
    opportunity_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*STAFF)),
):
    opportunity = _load(db, opportunity_id)
    if opportunity.status != OpportunityStatus.draft.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Solo se puede publicar una oportunidad en estado Borrador",
        )
    _validate_publish(opportunity)
    previous = opportunity.status
    opportunity.status = OpportunityStatus.published.value
    log_action(
        db,
        user.id,
        "publish",
        "opportunity",
        opportunity.id,
        previous={"status": previous},
        new={"status": opportunity.status},
    )
    db.commit()
    return _to_out(_load(db, opportunity.id))


@router.post("/{opportunity_id}/transition", response_model=OpportunityOut)
def transition_opportunity(
    opportunity_id: int,
    payload: TransitionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*STAFF)),
):
    opportunity = _load(db, opportunity_id)
    current = OpportunityStatus(opportunity.status)
    if payload.to_status == current:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La oportunidad ya se encuentra en ese estado",
        )
    if payload.to_status not in ALLOWED_TRANSITIONS[current]:
        allowed = ", ".join(s.value for s in ALLOWED_TRANSITIONS[current]) or "ninguno"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transición no permitida desde '{current.value}'. Permitido: {allowed}",
        )
    previous = opportunity.status
    opportunity.status = payload.to_status.value
    if payload.to_status == OpportunityStatus.cancelled:
        opportunity.cancel_reason = payload.reason or opportunity.cancel_reason
    log_action(
        db,
        user.id,
        "transition",
        "opportunity",
        opportunity.id,
        previous={"status": previous},
        new={"status": opportunity.status, "reason": payload.reason},
    )
    db.commit()
    return _to_out(_load(db, opportunity.id))


@router.post("/{opportunity_id}/cancel", response_model=OpportunityOut)
def cancel_opportunity(
    opportunity_id: int,
    payload: CancelRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*STAFF)),
):
    opportunity = _load(db, opportunity_id)
    current = OpportunityStatus(opportunity.status)
    if current in (OpportunityStatus.cancelled, OpportunityStatus.paid):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede cancelar una oportunidad en este estado",
        )
    previous = opportunity.status
    opportunity.status = OpportunityStatus.cancelled.value
    opportunity.cancel_reason = payload.reason.strip()
    log_action(
        db,
        user.id,
        "cancel",
        "opportunity",
        opportunity.id,
        previous={"status": previous},
        new={"status": opportunity.status, "reason": opportunity.cancel_reason},
    )
    db.commit()
    return _to_out(_load(db, opportunity.id))


@router.get("/{opportunity_id}/history", response_model=list[AuditLogOut])
def opportunity_history(
    opportunity_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*READERS)),
):
    _load(db, opportunity_id)
    entries = (
        db.query(AuditLog)
        .filter(AuditLog.entity_type == "opportunity", AuditLog.entity_id == opportunity_id)
        .order_by(AuditLog.created_at.asc())
        .all()
    )
    return [
        AuditLogOut(
            id=e.id,
            user=UserBrief.model_validate(e.user) if e.user else None,
            action=e.action,
            entity_type=e.entity_type,
            entity_id=e.entity_id,
            previous_data=e.previous_data,
            new_data=e.new_data,
            created_at=e.created_at,
        )
        for e in entries
    ]
