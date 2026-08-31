"""Servicio de notificaciones in-app."""

from sqlalchemy.orm import Session

from app.models.notification import Notification


def notify(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "general",
) -> None:
    """Crea una notificación. El commit lo hace el flujo llamante."""
    db.add(
        Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
        )
    )
