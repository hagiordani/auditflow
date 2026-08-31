"""Helper de bitácora: registrar acciones con datos previos y nuevos."""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any

from sqlalchemy.orm import Session

from app.models.opportunity import AuditLog


def _json_safe(value: Any) -> Any:
    """Convierte valores no serializables a JSON (Decimal, fechas, enums)."""
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    return value


def log_action(
    db: Session,
    user_id: int | None,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    previous: dict[str, Any] | None = None,
    new: dict[str, Any] | None = None,
) -> None:
    """Añade una entrada a la bitácora. El commit lo hace el flujo llamante."""
    db.add(
        AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            previous_data=_json_safe(previous),
            new_data=_json_safe(new),
        )
    )
