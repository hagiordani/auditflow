"""Envío de correo (SMTP) para contraseñas temporales y notificaciones.

Si SMTP_HOST no está configurado, el correo se registra en logs (entorno de
desarrollo) en lugar de enviarse, para no romper el flujo.
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import get_settings

logger = logging.getLogger("auditflow.mailer")


def send_email(to: str, subject: str, html: str, text: str | None = None) -> bool:
    """Envía un correo HTML a `to`. Devuelve True si se envió; False si solo se logueó."""
    settings = get_settings()
    if not settings.SMTP_HOST:
        logger.info(
            "EMAIL (SMTP no configurado; no enviado)\n  Para: %s\n  Asunto: %s\n  TEXTO:\n%s",
            to,
            subject,
            text or _strip_html(html),
        )
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    if text:
        msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        if settings.SMTP_USE_SSL:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20)
            if settings.SMTP_STARTTLS:
                server.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(msg["From"], [to], msg.as_string())
        server.quit()
        logger.info("Correo enviado a %s: %s", to, subject)
        return True
    except Exception as exc:  # pragma: no cover - depende del servidor SMTP
        logger.exception("No se pudo enviar correo a %s: %s", to, exc)
        return False


def _strip_html(html: str) -> str:
    import re

    return re.sub(r"<[^>]+>", " ", html).strip()
