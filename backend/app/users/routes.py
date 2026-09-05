"""Endpoints de gestión de usuarios (solo administrador)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.auth.schemas import UserCreate, UserOut, UserUpdate
from app.auth.security import generate_temp_password, hash_password
from app.core.mailer import send_email
from app.database import get_db
from app.models.auditor import Auditor
from app.models.user import User, UserRole

router = APIRouter(prefix="/users", tags=["users"])


def _send_temp_password_email(full_name: str, email: str, temp_password: str) -> None:
    """Envía la contraseña temporal por correo (alta o restablecimiento)."""
    send_email(
        to=email,
        subject="AuditFlow — tu contraseña temporal",
        text=(
            f"Hola {full_name},\n\n"
            f"Tu contraseña temporal de acceso es:\n\n"
            f"    {temp_password}\n\n"
            "Por seguridad, cámbiala al iniciar sesión (Menú → Configuración → Seguridad).\n\n"
            "Plataforma privada de asignación de servicios de auditoría."
        ),
        html=(
            "<p>Hola <strong>{}</strong>,</p>"
            "<p>Tu contraseña temporal de acceso es:</p>"
            "<p style=\"font-size:20px;font-weight:700;letter-spacing:2px\">{}</p>"
            "<p>Por seguridad, cámbiala al iniciar sesión "
            "(Menú → Configuración → Seguridad).</p>"
            "<p style=\"color:#70809a\">Plataforma privada de asignación de servicios de auditoría.</p>"
        ).format(full_name, temp_password),
    )


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_roles(UserRole.admin))):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    email = payload.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado")

    # Si el admin no define contraseña, se genera una temporal y se envía por correo.
    temp_password = None
    if payload.password is None:
        temp_password = generate_temp_password()

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        password_hash=hash_password(temp_password or payload.password),
        role=payload.role,
        is_active=payload.is_active,
        must_change_password=temp_password is not None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if temp_password is not None:
        _send_temp_password_email(user.full_name, email, temp_password)

    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.role is not None:
        user.role = payload.role
        # Al convertir a auditor, asegura que exista su perfil para que el
        # portal del auditor funcione de inmediato.
        if user.role == UserRole.auditor and not db.query(Auditor).filter(
            Auditor.user_id == user.id
        ).first():
            db.add(Auditor(user_id=user.id, availability_status="available"))
    if payload.is_active is not None:
        user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_user_password(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    """Genera una nueva contraseña temporal y la envía por correo (recuperación)."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    temp_password = generate_temp_password()
    user.password_hash = hash_password(temp_password)
    user.must_change_password = True
    db.commit()
    _send_temp_password_email(user.full_name, user.email, temp_password)
