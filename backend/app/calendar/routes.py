"""Endpoints de calendario: agenda del auditor y de servicios (staff)."""

from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auditors.routes import _require_my_profile
from app.auth.dependencies import get_current_user, require_roles
from app.database import get_db
from app.models.assignment import Assignment
from app.models.availability import AuditorAvailability
from app.models.opportunity import AuditOpportunity
from app.models.user import User, UserRole

router = APIRouter(tags=["calendar"])

STAFF = (UserRole.admin, UserRole.operations, UserRole.supervisor)


class CalendarEvent(BaseModel):
    type: str  # assignment | unavailability
    id: int
    title: str
    folio: str | None
    start_date: date
    end_date: date
    status: str | None


class StaffCalendarEvent(BaseModel):
    assignment_id: int
    folio: str
    title: str
    auditor_name: str
    city: str | None
    state: str | None
    start_date: date
    end_date: date
    status: str


@router.get("/auditors/me/calendar", response_model=list[CalendarEvent])
def my_calendar(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    """Agenda del auditor: asignaciones (pendientes/confirmadas) + indisponibilidades."""
    auditor = _require_my_profile(db, user)
    events: list[CalendarEvent] = []

    assignments = (
        db.query(Assignment)
        .filter(
            Assignment.auditor_id == auditor.id,
            Assignment.status.in_(["pending", "confirmed"]),
        )
        .all()
    )
    for a in assignments:
        opp = a.opportunity
        if opp.start_date and opp.end_date:
            events.append(
                CalendarEvent(
                    type="assignment",
                    id=a.id,
                    title=opp.title,
                    folio=opp.folio,
                    start_date=opp.start_date,
                    end_date=opp.end_date,
                    status=a.status,
                )
            )

    blocks = (
        db.query(AuditorAvailability)
        .filter(AuditorAvailability.auditor_id == auditor.id)
        .all()
    )
    for b in blocks:
        events.append(
            CalendarEvent(
                type="unavailability",
                id=b.id,
                title=b.notes or "Indisponible",
                folio=None,
                start_date=b.start_date,
                end_date=b.end_date,
                status=b.availability_type,
            )
        )

    events.sort(key=lambda e: (e.start_date, e.type))
    return events


@router.get("/calendar", response_model=list[StaffCalendarEvent])
def staff_calendar(
    db: Session = Depends(get_db), _: User = Depends(require_roles(*STAFF))
):
    """Agenda de servicios para staff: asignaciones pendientes/confirmadas próximas."""
    assignments = (
        db.query(Assignment)
        .filter(Assignment.status.in_(["pending", "confirmed"]))
        .all()
    )
    events = []
    for a in assignments:
        opp = a.opportunity
        if opp.start_date and opp.end_date:
            events.append(
                StaffCalendarEvent(
                    assignment_id=a.id,
                    folio=opp.folio,
                    title=opp.title,
                    auditor_name=a.auditor.user.full_name,
                    city=opp.city,
                    state=opp.state,
                    start_date=opp.start_date,
                    end_date=opp.end_date,
                    status=a.status,
                )
            )
    events.sort(key=lambda e: e.start_date)
    return events
