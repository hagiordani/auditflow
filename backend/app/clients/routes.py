"""Endpoints de clientes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_roles
from app.clients.schemas import ClientCreate, ClientOut, ClientUpdate
from app.core.audit import log_action
from app.database import get_db
from app.models.client import Client
from app.models.user import User, UserRole

router = APIRouter(prefix="/clients", tags=["clients"])

STAFF = (UserRole.admin, UserRole.operations)
READERS = (UserRole.admin, UserRole.operations, UserRole.supervisor)


@router.get("", response_model=list[ClientOut])
def list_clients(db: Session = Depends(get_db), _: User = Depends(require_roles(*READERS))):
    return db.query(Client).order_by(Client.business_name.asc()).all()


@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*STAFF)),
):
    client = Client(**payload.model_dump())
    db.add(client)
    db.flush()
    log_action(db, user.id, "create", "client", client.id, new={"business_name": client.business_name})
    db.commit()
    db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientOut)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*READERS)),
):
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
    return client


@router.patch("/{client_id}", response_model=ClientOut)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*STAFF)),
):
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
    changes = payload.model_dump(exclude_unset=True)
    previous = {k: getattr(client, k) for k in changes}
    for field, value in changes.items():
        setattr(client, field, value)
    log_action(db, user.id, "update", "client", client.id, previous=previous, new=changes)
    db.commit()
    db.refresh(client)
    return client
