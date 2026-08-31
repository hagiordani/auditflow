"""Endpoints de postulaciones (auditor postula; staff consulta interesados)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.applications.schemas import ApplicationCreate, ApplicationOut, AuditorBrief
from app.applications.service import check_compatibility, OPEN_STATUSES
from app.auth.dependencies import get_current_user, require_roles
from app.core.audit import log_action
from app.database import get_db
from app.models.application import Application
from app.models.auditor import Auditor
from app.models.opportunity import AuditOpportunity, OpportunityStatus
from app.models.user import User, UserRole
from app.notifications.service import notify
from app.opportunities.routes import _load as load_opportunity

router = APIRouter(prefix="/opportunities", tags=["applications"])

STAFF = (UserRole.admin, UserRole.operations)


def _get_auditor_profile(db: Session, user: User) -> Auditor:
    auditor = db.query(Auditor).filter(Auditor.user_id == user.id).first()
    if auditor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tu usuario no tiene perfil de auditor",
        )
    return auditor


@router.post("/{opportunity_id}/apply")
def apply_to_opportunity(
    opportunity_id: int,
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != UserRole.auditor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los auditores pueden postularse",
        )
    auditor = _get_auditor_profile(db, user)
    opportunity = load_opportunity(db, opportunity_id)

    reasons = check_compatibility(db, opportunity, auditor)
    if reasons:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="; ".join(reasons),
        )

    application = (
        db.query(Application)
        .filter(
            Application.opportunity_id == opportunity_id,
            Application.auditor_id == auditor.id,
        )
        .first()
    )

    action = "update_application"
    if application is None:
        application = Application(
            opportunity_id=opportunity_id,
            auditor_id=auditor.id,
            decision=payload.decision,
            comments=payload.comments,
        )
        db.add(application)
        action = "apply"

        # Regla de negocio: con el primer interesado, la oportunidad pasa
        # de "publicada" a "con interesados".
        if (
            payload.decision == "interested"
            and opportunity.status == OpportunityStatus.published.value
        ):
            opportunity.status = OpportunityStatus.has_interested.value
            log_action(
                db,
                user.id,
                "first_interest",
                "opportunity",
                opportunity.id,
                previous={"status": OpportunityStatus.published.value},
                new={"status": opportunity.status, "auditor_id": auditor.id},
            )
    else:
        application.decision = payload.decision
        application.comments = payload.comments

    log_action(
        db,
        user.id,
        action,
        "opportunity",
        opportunity.id,
        new={"auditor_id": auditor.id, "decision": payload.decision},
    )
    if (
        opportunity.responsible_user_id
        and payload.decision == "interested"
        and opportunity.responsible_user_id != user.id
    ):
        notify(
            db,
            opportunity.responsible_user_id,
            f"Nuevo interesado: {opportunity.folio}",
            f"{auditor.user.full_name} indicó interés en {opportunity.title}.",
            "application",
        )
    db.commit()
    return {"message": "Postulación registrada", "decision": payload.decision}


@router.get("/{opportunity_id}/applications", response_model=list[ApplicationOut])
def list_applications(
    opportunity_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*STAFF)),
):
    load_opportunity(db, opportunity_id)
    applications = (
        db.query(Application)
        .filter(Application.opportunity_id == opportunity_id)
        .order_by(Application.applied_at.asc())
        .all()
    )
    return [
        ApplicationOut(
            id=a.id,
            opportunity_id=a.opportunity_id,
            auditor=AuditorBrief(
                id=a.auditor.id,
                full_name=a.auditor.user.full_name,
                email=a.auditor.user.email,
                city=a.auditor.city,
                state=a.auditor.state,
                daily_rate=(
                    float(a.auditor.daily_rate) if a.auditor.daily_rate is not None else None
                ),
            ),
            decision=a.decision,
            comments=a.comments,
            applied_at=a.applied_at,
            reviewed_at=a.reviewed_at,
        )
        for a in applications
    ]
