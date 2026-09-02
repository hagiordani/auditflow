"""Endpoints del catálogo de personal técnico (solo administrador)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.auth.dependencies import require_roles
from app.database import get_db
from app.models.personal import (
    Area,
    Personal,
    PersonalArea,
    PersonalEmail,
    PersonalRole,
    Role,
)
from app.models.user import User, UserRole
from app.personal.schemas import (
    AreaCreate,
    AreaOut,
    PersonalCreate,
    PersonalEmailOut,
    PersonalOut,
    PersonalUpdate,
    RoleCreate,
    RoleOut,
)

personal_router = APIRouter(prefix="/personal", tags=["personal"])
catalog_router = APIRouter(tags=["personal catalogs"])


def _load(db: Session, personal_id: int) -> Personal:
    person = (
        db.query(Personal)
        .options(
            selectinload(Personal.emails),
            selectinload(Personal.roles).selectinload(PersonalRole.role),
            selectinload(Personal.areas).selectinload(PersonalArea.area),
        )
        .filter(Personal.id == personal_id)
        .first()
    )
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personal no encontrado")
    return person


def _to_out(person: Personal) -> PersonalOut:
    return PersonalOut(
        id=person.id,
        nombre_completo=person.nombre_completo,
        celular=person.celular,
        activo=person.activo,
        roles=[RoleOut.model_validate(pr.role) for pr in person.roles],
        areas=[AreaOut.model_validate(pa.area) for pa in person.areas],
        emails=[
            PersonalEmailOut(id=e.id, email=e.email, principal=e.principal) for e in person.emails
        ],
        created_at=person.created_at,
        updated_at=person.updated_at,
    )


def _sync_relations(db: Session, person: Personal, rol_ids, area_ids, emails) -> None:
    # Roles
    if rol_ids is not None:
        existing = {pr.rol_id: pr for pr in person.roles}
        for rid in rol_ids:
            role = db.get(Role, rid)
            if role is None:
                raise HTTPException(status_code=404, detail=f"Rol {rid} no existe")
            if rid not in existing:
                person.roles.append(PersonalRole(personal_id=person.id, rol_id=rid))
        for rid in list(existing):
            if rid not in set(rol_ids):
                db.delete(existing[rid])
    # Áreas
    if area_ids is not None:
        existing = {pa.area_id: pa for pa in person.areas}
        for aid in area_ids:
            area = db.get(Area, aid)
            if area is None:
                raise HTTPException(status_code=404, detail=f"Área {aid} no existe")
            if aid not in existing:
                person.areas.append(PersonalArea(personal_id=person.id, area_id=aid))
        for aid in list(existing):
            if aid not in set(area_ids):
                db.delete(existing[aid])
    # Correos
    if emails is not None:
        # Validar duplicados globales (email único).
        for em in emails:
            email = em.email.strip().lower()
            dup = (
                db.query(PersonalEmail)
                .filter(PersonalEmail.email == email, PersonalEmail.personal_id != person.id)
                .first()
            )
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"El correo {email} ya pertenece a otro registro",
                )
        for e in person.emails:
            db.delete(e)
        for i, em in enumerate(emails):
            email = em.email.strip().lower()
            person.emails.append(
                PersonalEmail(
                    personal_id=person.id,
                    email=email,
                    principal=em.principal or i == 0,
                )
            )


# ---------- Catálogos: roles y áreas ----------


@catalog_router.get("/roles", response_model=list[RoleOut])
def list_roles(db: Session = Depends(get_db), _: User = Depends(require_roles(UserRole.admin))):
    return db.query(Role).order_by(Role.nombre.asc()).all()


@catalog_router.post("/roles", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
def create_role(
    payload: RoleCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    name = payload.nombre.strip().upper()
    if db.query(Role).filter(Role.nombre == name).first():
        raise HTTPException(status_code=409, detail="El rol ya existe")
    role = Role(nombre=name)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@catalog_router.get("/areas", response_model=list[AreaOut])
def list_areas(db: Session = Depends(get_db), _: User = Depends(require_roles(UserRole.admin))):
    return db.query(Area).order_by(Area.codigo.asc()).all()


@catalog_router.post("/areas", response_model=AreaOut, status_code=status.HTTP_201_CREATED)
def create_area(
    payload: AreaCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    code = payload.codigo.strip().upper()
    if db.query(Area).filter(Area.codigo == code).first():
        raise HTTPException(status_code=409, detail="El área ya existe")
    area = Area(codigo=code, nombre=payload.nombre)
    db.add(area)
    db.commit()
    db.refresh(area)
    return area


# ---------- Personal ----------


@personal_router.get("", response_model=list[PersonalOut])
def list_personal(
    db: Session = Depends(get_db), _: User = Depends(require_roles(UserRole.admin))
):
    people = (
        db.query(Personal)
        .options(
            selectinload(Personal.emails),
            selectinload(Personal.roles).selectinload(PersonalRole.role),
            selectinload(Personal.areas).selectinload(PersonalArea.area),
        )
        .order_by(Personal.nombre_completo.asc())
        .all()
    )
    return [_to_out(p) for p in people]


@personal_router.post("", response_model=PersonalOut, status_code=status.HTTP_201_CREATED)
def create_personal(
    payload: PersonalCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    person = Personal(
        nombre_completo=payload.nombre_completo.strip(),
        celular=payload.celular,
        activo=True,
    )
    db.add(person)
    db.flush()
    _sync_relations(db, person, payload.rol_ids, payload.area_ids, payload.emails)
    db.commit()
    return _to_out(_load(db, person.id))


@personal_router.get("/{personal_id}", response_model=PersonalOut)
def get_personal(
    personal_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    return _to_out(_load(db, personal_id))


@personal_router.patch("/{personal_id}", response_model=PersonalOut)
def update_personal(
    personal_id: int,
    payload: PersonalUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    person = _load(db, personal_id)
    if payload.nombre_completo is not None:
        person.nombre_completo = payload.nombre_completo.strip()
    if payload.celular is not None:
        person.celular = payload.celular
    if payload.activo is not None:
        person.activo = payload.activo
    _sync_relations(db, person, payload.rol_ids, payload.area_ids, payload.emails)
    db.commit()
    return _to_out(_load(db, personal_id))
