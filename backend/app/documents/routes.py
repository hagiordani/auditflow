"""Endpoints de documentos: carga y descarga privada."""

import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.config import get_settings
from app.database import get_db
from app.models.auditor import Auditor
from app.models.document import DOCUMENT_TYPES, ENTITY_TYPES, Document
from app.models.opportunity import AuditOpportunity
from app.models.user import User, UserRole

router = APIRouter(prefix="/documents", tags=["documents"])

STAFF = (UserRole.admin, UserRole.operations)
MAX_SIZE = 15 * 1024 * 1024  # 15 MB


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    entity_type: str
    entity_id: int
    document_type: str
    file_name: str
    content_type: str | None
    size_bytes: int | None
    uploaded_by: int
    uploader_name: str | None
    uploaded_at: datetime


def _serialize(d: Document) -> DocumentOut:
    return DocumentOut(
        id=d.id,
        entity_type=d.entity_type,
        entity_id=d.entity_id,
        document_type=d.document_type,
        file_name=d.file_name,
        content_type=d.content_type,
        size_bytes=d.size_bytes,
        uploaded_by=d.uploaded_by,
        uploader_name=d.uploader.full_name if d.uploader else None,
        uploaded_at=d.uploaded_at,
    )


def _validate_entity(db: Session, entity_type: str, entity_id: int) -> None:
    if entity_type == "opportunity":
        if db.get(AuditOpportunity, entity_id) is None:
            raise HTTPException(status_code=404, detail="Oportunidad no encontrada")
    elif entity_type == "auditor":
        if db.get(Auditor, entity_id) is None:
            raise HTTPException(status_code=404, detail="Auditor no encontrado")
    elif entity_type == "assignment":
        # La asignación pertenece a una oportunidad; validación básica de existencia
        from app.models.assignment import Assignment

        if db.get(Assignment, entity_id) is None:
            raise HTTPException(status_code=404, detail="Asignación no encontrada")
    else:
        raise HTTPException(status_code=400, detail="Tipo de entidad no válido")


def _can_access(user: User, db: Session, doc: Document) -> bool:
    if user.role in STAFF:
        return True
    if user.role == UserRole.auditor:
        if doc.entity_type == "auditor":
            auditor = db.query(Auditor).filter(Auditor.user_id == user.id).first()
            return auditor is not None and auditor.id == doc.entity_id
    return False


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    entity_type: str = Form(...),
    entity_id: int = Form(...),
    document_type: str = Form(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if entity_type not in ENTITY_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de entidad no válido")
    if document_type not in DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de documento no válido")
    _validate_entity(db, entity_type, entity_id)

    # Permisos: staff carga cualquier cosa; el auditor solo documentos propios
    if user.role not in STAFF:
        if user.role == UserRole.auditor and entity_type == "auditor":
            auditor = db.query(Auditor).filter(Auditor.user_id == user.id).first()
            if auditor is None or auditor.id != entity_id:
                raise HTTPException(status_code=403, detail="Solo puedes subir tus documentos")
        else:
            raise HTTPException(
                status_code=403, detail="No tienes permisos para subir este documento"
            )

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="El archivo supera los 15 MB")

    settings = get_settings()
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "archivo").suffix.lower()[:10]
    stored_name = f"{uuid.uuid4().hex}{ext}"
    (upload_dir / stored_name).write_bytes(content)

    document = Document(
        entity_type=entity_type,
        entity_id=entity_id,
        document_type=document_type,
        file_name=file.filename or "archivo",
        stored_name=stored_name,
        content_type=file.content_type,
        size_bytes=len(content),
        uploaded_by=user.id,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return _serialize(document)


@router.get("", response_model=list[DocumentOut])
def list_documents(
    entity_type: str,
    entity_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _validate_entity(db, entity_type, entity_id)
    docs = (
        db.query(Document)
        .filter(Document.entity_type == entity_type, Document.entity_id == entity_id)
        .order_by(Document.uploaded_at.desc())
        .all()
    )
    return [_serialize(d) for d in docs if _can_access(user, db, d)]


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    if not _can_access(user, db, document):
        raise HTTPException(status_code=403, detail="No tienes permisos para este documento")

    settings = get_settings()
    path = Path(settings.UPLOAD_DIR) / document.stored_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="El archivo ya no existe en el servidor")
    return FileResponse(
        path,
        media_type=document.content_type or "application/octet-stream",
        filename=document.file_name,
    )
