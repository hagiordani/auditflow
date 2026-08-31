"""Endpoints de indisponibilidad del auditor."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.auditors.routes import _load_auditor, _require_my_profile
from app.auth.dependencies import get_current_user, require_roles
from app.database import get_db
from app.models.availability import AVAILABILITY_TYPES, AuditorAvailability
from app.models.user import User, UserRole

router = APIRouter(prefix="/auditors", tags=["availability"])

STAFF = (UserRole.admin, UserRole.operations)


class AvailabilityCreate(BaseModel):
    start_date: date
    end_date: date
    availability_type: str = Field(default="unavailable", pattern="^(vacations|blocked|unavailable)$")
    notes: str | None = Field(default=None, max_length=500)


class AvailabilityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    auditor_id: int
    start_date: date
    end_date: date
    availability_type: str
    notes: str | None


def _serialize(a: AuditorAvailability) -> AvailabilityOut:
    return AvailabilityOut(
        id=a.id,
        auditor_id=a.auditor_id,
        start_date=a.start_date,
        end_date=a.end_date,
        availability_type=a.availability_type,
        notes=a.notes,
    )


@router.get("/me/availability", response_model=list[AvailabilityOut])
def my_availability(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    auditor = _require_my_profile(db, user)
    blocks = (
        db.query(AuditorAvailability)
        .filter(AuditorAvailability.auditor_id == auditor.id)
        .order_by(AuditorAvailability.start_date.asc())
        .all()
    )
    return [_serialize(b) for b in blocks]


@router.post("/me/availability", response_model=AvailabilityOut, status_code=201)
def add_my_availability(
    payload: AvailabilityCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    auditor = _require_my_profile(db, user)
    if payload.end_date < payload.start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La fecha final no puede ser anterior a la inicial",
        )
    block = AuditorAvailability(
        auditor_id=auditor.id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        availability_type=payload.availability_type,
        notes=payload.notes,
    )
    db.add(block)
    db.commit()
    db.refresh(block)
    return _serialize(block)


@router.delete("/me/availability/{block_id}")
def remove_my_availability(
    block_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    auditor = _require_my_profile(db, user)
    block = db.get(AuditorAvailability, block_id)
    if block is None or block.auditor_id != auditor.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Bloque de fechas no encontrado"
        )
    db.delete(block)
    db.commit()
    return {"message": "Bloque eliminado"}


@router.get("/{auditor_id}/availability", response_model=list[AvailabilityOut])
def auditor_availability(
    auditor_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*STAFF)),
):
    _load_auditor(db, auditor_id)
    blocks = (
        db.query(AuditorAvailability)
        .filter(AuditorAvailability.auditor_id == auditor_id)
        .order_by(AuditorAvailability.start_date.asc())
        .all()
    )
    return [_serialize(b) for b in blocks]


@router.post("/{auditor_id}/availability", response_model=AvailabilityOut, status_code=201)
def add_auditor_availability(
    auditor_id: int,
    payload: AvailabilityCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*STAFF)),
):
    _load_auditor(db, auditor_id)
    if payload.end_date < payload.start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La fecha final no puede ser anterior a la inicial",
        )
    block = AuditorAvailability(
        auditor_id=auditor_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        availability_type=payload.availability_type,
        notes=payload.notes,
    )
    db.add(block)
    db.commit()
    db.refresh(block)
    return _serialize(block)
