"""Reglas de compatibilidad auditor ↔ oportunidad.

Un auditor es compatible con una oportunidad cuando:
1. Tiene perfil de auditor y su cuenta está activa.
2. Tiene TODAS las competencias requeridas, cada una vigente (no vencida ni revocada).
3. La oportunidad está en un estado abierto y la fecha límite no venció.
4. No tiene un bloque de indisponibilidad que cruce las fechas del servicio.
"""

from datetime import date

from sqlalchemy.orm import Session

from app.models.auditor import Auditor, AuditorCompetency
from app.models.availability import AuditorAvailability
from app.models.opportunity import AuditOpportunity, OpportunityCompetency, OpportunityStatus

# Estados en los que un auditor puede postularse
OPEN_STATUSES = {
    OpportunityStatus.published.value,
    OpportunityStatus.has_interested.value,
    OpportunityStatus.under_review.value,
}


def check_compatibility(
    db: Session, opportunity: AuditOpportunity, auditor: Auditor
) -> list[str]:
    """Devuelve la lista de motivos por los que el auditor NO es compatible (vacía si es compatible)."""
    reasons: list[str] = []

    if not auditor.user.is_active:
        reasons.append("Tu cuenta está desactivada")

    if opportunity.status not in OPEN_STATUSES:
        reasons.append("La oportunidad ya no acepta postulaciones")

    if opportunity.application_deadline is None:
        reasons.append("La oportunidad no tiene fecha límite definida")
    elif opportunity.application_deadline < date.today():
        reasons.append("La fecha límite para postularse ya venció")

    required = opportunity.competencies
    if not required:
        reasons.append("La oportunidad no tiene competencias requeridas definidas")

    # Competencias válidas del auditor (vigentes)
    valid_competency_ids = {
        ac.competency_id
        for ac in auditor.competencies
        if ac.is_valid
    }
    for oc in required:
        if oc.competency_id not in valid_competency_ids:
            reasons.append(
                f"No cuentas con la competencia vigente: {oc.competency.name}"
            )

    # Indisponibilidad declarada que cruza las fechas del servicio
    if opportunity.start_date and opportunity.end_date:
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
            reasons.append(
                f"Tienes un bloqueo de fechas del {blocking.start_date} al {blocking.end_date}"
            )

    return reasons


def is_compatible(db: Session, opportunity: AuditOpportunity, auditor: Auditor) -> bool:
    return not check_compatibility(db, opportunity, auditor)
