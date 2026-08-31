"""Endpoints de auditores y su matriz de competencias."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.auditors.schemas import (
    AuditorCompetencyCreate,
    AuditorCompetencyOut,
    AuditorCreate,
    AuditorOut,
    AuditorUpdate,
)
from app.auth.dependencies import get_current_user, require_roles
from app.auth.security import hash_password
from app.database import get_db
from app.models.auditor import Auditor, AuditorCompetency, Competency
from app.models.user import User, UserRole

router = APIRouter(prefix="/auditors", tags=["auditors"])

STAFF_ROLES = (UserRole.admin, UserRole.operations)


def _load_auditor(db: Session, auditor_id: int) -> Auditor:
    auditor = (
        db.query(Auditor)
        .options(
            selectinload(Auditor.user),
            selectinload(Auditor.competencies).selectinload(AuditorCompetency.competency),
        )
        .filter(Auditor.id == auditor_id)
        .first()
    )
    if auditor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Auditor no encontrado")
    return auditor


def auditor_out(auditor: Auditor) -> AuditorOut:
    return AuditorOut(
        id=auditor.id,
        user_id=auditor.user_id,
        full_name=auditor.user.full_name,
        email=auditor.user.email,
        is_active=auditor.user.is_active,
        phone=auditor.phone,
        city=auditor.city,
        state=auditor.state,
        daily_rate=float(auditor.daily_rate) if auditor.daily_rate is not None else None,
        tax_id=auditor.tax_id,
        bank_information=auditor.bank_information,
        availability_status=auditor.availability_status,
        rating=auditor.rating,
        notes=auditor.notes,
        competencies=[AuditorCompetencyOut.model_validate(ac) for ac in auditor.competencies],
    )


def _require_auditor_or_staff(user: User, db: Session, auditor_id: int) -> Auditor:
    """El propio auditor (por su perfil) o un rol de staff puede ver/gestionar."""
    auditor = _load_auditor(db, auditor_id)
    if user.role not in STAFF_ROLES and not (user.role == UserRole.auditor and auditor.user_id == user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver este auditor",
        )
    return auditor


@router.get("/me", response_model=AuditorOut)
def my_auditor_profile(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    auditor = db.query(Auditor).filter(Auditor.user_id == user.id).first()
    if auditor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No tienes perfil de auditor")
    return auditor_out(_load_auditor(db, auditor.id))


@router.get("", response_model=list[AuditorOut])
def list_auditors(db: Session = Depends(get_db), _: User = Depends(require_roles(*STAFF_ROLES))):
    auditors = (
        db.query(Auditor)
        .options(
            selectinload(Auditor.user),
            selectinload(Auditor.competencies).selectinload(AuditorCompetency.competency),
        )
        .order_by(Auditor.id.asc())
        .all()
    )
    return [auditor_out(a) for a in auditors]


@router.post("", response_model=AuditorOut, status_code=status.HTTP_201_CREATED)
def create_auditor(
    payload: AuditorCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*STAFF_ROLES)),
):
    email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if user is not None:
        # Si ya existe un usuario con perfil de auditor, no se puede duplicar.
        if db.query(Auditor).filter(Auditor.user_id == user.id).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El auditor ya existe")
        if user.role != UserRole.auditor:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El correo pertenece a un usuario que no es auditor",
            )
    else:
        user = User(
            email=email,
            full_name=payload.full_name.strip(),
            password_hash=hash_password(payload.password),
            role=UserRole.auditor,
            is_active=True,
        )
        db.add(user)
        db.flush()

    auditor = Auditor(
        user_id=user.id,
        phone=payload.phone,
        city=payload.city,
        state=payload.state,
        daily_rate=payload.daily_rate,
        tax_id=payload.tax_id,
        bank_information=payload.bank_information,
        availability_status=payload.availability_status,
        notes=payload.notes,
    )
    db.add(auditor)
    db.commit()
    return auditor_out(_load_auditor(db, auditor.id))


@router.get("/{auditor_id}", response_model=AuditorOut)
def get_auditor(
    auditor_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return auditor_out(_require_auditor_or_staff(user, db, auditor_id))


@router.patch("/{auditor_id}", response_model=AuditorOut)
def update_auditor(
    auditor_id: int,
    payload: AuditorUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    auditor = _require_auditor_or_staff(user, db, auditor_id)
    for field in (
        "phone",
        "city",
        "state",
        "daily_rate",
        "tax_id",
        "bank_information",
        "availability_status",
        "rating",
        "notes",
    ):
        value = getattr(payload, field)
        if value is not None:
            setattr(auditor, field, value)
    db.commit()
    return auditor_out(_load_auditor(db, auditor_id))


@router.post("/{auditor_id}/competencies", response_model=AuditorOut, status_code=status.HTTP_201_CREATED)
def assign_competency(
    auditor_id: int,
    payload: AuditorCompetencyCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role not in STAFF_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el personal autorizado puede asignar competencias",
        )
    auditor = _load_auditor(db, auditor_id)
    competency = db.get(Competency, payload.competency_id)
    if competency is None or not competency.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competencia no encontrada o desactivada",
        )
    duplicate = (
        db.query(AuditorCompetency)
        .filter(
            AuditorCompetency.auditor_id == auditor_id,
            AuditorCompetency.competency_id == payload.competency_id,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El auditor ya tiene asignada esta competencia",
        )
    assignment = AuditorCompetency(
        auditor_id=auditor_id,
        competency_id=payload.competency_id,
        level=payload.level,
        certificate_number=payload.certificate_number,
        valid_from=payload.valid_from,
        valid_until=payload.valid_until,
        document_url=payload.document_url,
        status="active",
    )
    db.add(assignment)
    db.commit()
    return auditor_out(_load_auditor(db, auditor_id))


@router.delete("/{auditor_id}/competencies/{assignment_id}", response_model=AuditorOut)
def remove_competency(
    auditor_id: int,
    assignment_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*STAFF_ROLES)),
):
    _load_auditor(db, auditor_id)
    assignment = db.get(AuditorCompetency, assignment_id)
    if assignment is None or assignment.auditor_id != auditor_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Asignación de competencia no encontrada"
        )
    db.delete(assignment)
    db.commit()
    return auditor_out(_load_auditor(db, auditor_id))
