"""Endpoints de competencias (normas y especialidades)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auditors.schemas import CompetencyCreate, CompetencyOut, CompetencyUpdate
from app.auth.dependencies import get_current_user, require_roles
from app.database import get_db
from app.models.auditor import Competency
from app.models.user import User, UserRole

router = APIRouter(prefix="/competencies", tags=["competencies"])


@router.get("", response_model=list[CompetencyOut])
def list_competencies(
    db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    return db.query(Competency).order_by(Competency.name.asc()).all()


@router.post("", response_model=CompetencyOut, status_code=status.HTTP_201_CREATED)
def create_competency(
    payload: CompetencyCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    name = payload.name.strip()
    if db.query(Competency).filter(Competency.name == name).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="La competencia ya existe")
    competency = Competency(name=name, description=payload.description)
    db.add(competency)
    db.commit()
    db.refresh(competency)
    return competency


@router.patch("/{competency_id}", response_model=CompetencyOut)
def update_competency(
    competency_id: int,
    payload: CompetencyUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    competency = db.get(Competency, competency_id)
    if competency is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Competencia no encontrada")
    if payload.name is not None:
        name = payload.name.strip()
        duplicate = (
            db.query(Competency)
            .filter(Competency.name == name, Competency.id != competency_id)
            .first()
        )
        if duplicate:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="La competencia ya existe")
        competency.name = name
    if payload.description is not None:
        competency.description = payload.description
    if payload.is_active is not None:
        competency.is_active = payload.is_active
    db.commit()
    db.refresh(competency)
    return competency
