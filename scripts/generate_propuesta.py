"""Genera la propuesta económica de AuditFlow en PDF (docs/)."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

OUT = "docs/AuditFlow_Propuesta_Economica.pdf"

styles = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=styles["Title"], fontSize=19, leading=23, spaceAfter=10, textColor="#145da0")
H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=13, leading=16, spaceBefore=12, spaceAfter=5, textColor="#145da0")
BODY = ParagraphStyle("BODY", parent=styles["BodyText"], fontSize=10, leading=14, spaceAfter=6)
BULLET = ParagraphStyle("BULLET", parent=BODY, leftIndent=10, bulletIndent=0, spaceAfter=2)
SMALL = ParagraphStyle("SMALL", parent=BODY, fontSize=8.5, textColor="#70809a")


def bullet(text):
    return Paragraph(f"• {text}", BULLET)


def table(data, widths, header=True):
    t = Table(data, colWidths=widths, hAlign="LEFT")
    style = [
        ("GRID", (0, 0), (-1, -1), 0.5, "#e5ebf3"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]
    if header:
        style += [
            ("BACKGROUND", (0, 0), (-1, 0), "#edf5ff"),
            ("TEXTCOLOR", (0, 0), (-1, 0), "#145da0"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ]
    t.setStyle(TableStyle(style))
    return t


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor("#70809a")
    canvas.drawString(20 * mm, 12 * mm, "AuditFlow · Propuesta Económica")
    canvas.drawRightString(190 * mm, 12 * mm, f"Página {doc.page}")
    canvas.restoreState()


story = []
story.append(Spacer(1, 30 * mm))
story.append(Paragraph("PROPUESTA ECONÓMICA", H1))
story.append(Paragraph("Plataforma de Asignación de Servicios de Auditoría — AuditFlow", BODY))
story.append(Spacer(1, 8 * mm))
story.append(table(
    [["Cliente", "[Nombre del organismo de certificación]"],
     ["Proveedor", "[Tu nombre / empresa]"],
     ["Moneda", "MXN (pesos mexicanos)"],
     ["Vigencia", "30 días naturales"]],
    [38 * mm, 132 * mm],
))
story.append(Spacer(1, 6 * mm))
story.append(Paragraph("Nota: cifras de horas y montos son una estimación inicial ajustable. Sustituye la tarifa y los valores [ ] antes de enviar.", SMALL))
story.append(PageBreak())

story.append(Paragraph("1. Resumen ejecutivo", H2))
story.append(Paragraph("AuditFlow es una plataforma privada web donde el organismo publica servicios de auditoría y los auditores externos autorizados los consultan, se postulan y reciben asignaciones, con control de competencias, fechas, pagos y estados.", BODY))
for r in [
    "Dos perfiles: Administrador (centro de control) y Auditor (su agenda).",
    "Compatibilidad automática: cada oportunidad se muestra solo a auditores calificados.",
    "Asignación con pago congelado y prevención de fechas cruzadas.",
    "Ciclo de vida completo (11 estados) con historial de todas las acciones.",
    "Dashboard ejecutivo con KPIs, mapa de México, rendimiento y evolución.",
    "Documentos y notificaciones integrados.",
]:
    story.append(bullet(r))

story.append(Paragraph("2. Alcance entregado", H2))
story.append(table(
    [["Módulo", "Descripción"],
     ["Autenticación y acceso", "Login JWT, control por rol, bloqueo por intentos"],
     ["Usuarios", "Altas/bajas, activación, cambio de rol (2 perfiles)"],
     ["Auditores", "Catálogo + matriz de competencias con vigencias"],
     ["Clientes", "Catálogo con contacto y RFC"],
     ["Oportunidades", "Folio automático, estados, publicación, cancelación"],
     ["Postulaciones", "Me interesa / No disponible con comentarios"],
     ["Asignaciones", "Selección, confirmación, pago congelado, sin traslapes"],
     ["Calendario", "Agenda + bloques de indisponibilidad"],
     ["Documentos", "Carga y descarga privada"],
     ["Notificaciones", "In-app en asignación/confirmación/rechazo/cancelación"],
     ["Dashboard y reportes", "KPIs, donut, rendimiento, mapa, export CSV"],
     ["Seguridad", "Contraseñas fuertes, rate limit, headers, secretos"]],
    [48 * mm, 122 * mm],
))

story.append(Paragraph("3. Inversión — desarrollo e implementación", H2))
story.append(Paragraph("Tarifa por hora considerada: $[750] MXN/h (ajustable).", BODY))
story.append(table(
    [["#", "Concepto", "Horas", "Monto (MXN)"],
     ["1", "Arquitectura y base", "80", "$60,000"],
     ["2", "Usuarios y control de acceso", "40", "$30,000"],
     ["3", "Auditores y matriz de competencias", "60", "$45,000"],
     ["4", "Clientes y oportunidades", "80", "$60,000"],
     ["5", "Portal del auditor", "60", "$45,000"],
     ["6", "Asignaciones", "60", "$45,000"],
     ["7", "Calendario, documentos, notificaciones", "80", "$60,000"],
     ["8", "Dashboard ejecutivo y reportes", "60", "$45,000"],
     ["9", "Mapa de México y evolución", "40", "$30,000"],
     ["10", "Rediseño de interfaz High-End", "80", "$60,000"],
     ["11", "Seguridad y endurecimiento", "40", "$30,000"],
     ["12", "Pruebas automatizadas (88 tests)", "60", "$45,000"],
     ["13", "Documentación", "40", "$30,000"],
     ["14", "Despliegue Hostinger + Dokploy", "40", "$30,000"],
     ["", "Subtotal desarrollo", "820", "$615,000"]],
    [12 * mm, 84 * mm, 26 * mm, 30 * mm],
))

story.append(Paragraph("4. Servicios opcionales (recurrentes)", H2))
story.append(table(
    [["Concepto", "Frecuencia", "Monto (MXN)"],
     ["Mantenimiento y soporte", "Mensual", "$[12,000]"],
     ["Capacitación al equipo", "Única", "$[8,000]"],
     ["Hosting/dominio (VPS Hostinger)", "Por su cuenta", "—"]],
    [90 * mm, 40 * mm, 40 * mm],
))

story.append(Paragraph("5. Resumen económico", H2))
story.append(table(
    [["Concepto", "Monto (MXN)"],
     ["Desarrollo e implementación", "$615,000"],
     ["Capacitación (opcional)", "$8,000"],
     ["Total inversión inicial", "$623,000"],
     ["Mantenimiento mensual (opcional)", "$12,000/mes"]],
    [110 * mm, 60 * mm],
))
story.append(Paragraph("IVA no incluido, se adiciona conforme a la legislación vigente.", SMALL))

story.append(Paragraph("6. Forma de pago", H2))
story.append(bullet("Anticipo (arranque): 40%"))
story.append(bullet("Entrega del MVP funcional (demo): 40%"))
story.append(bullet("Aceptación final y puesta en producción: 20%"))

story.append(Paragraph("7. Condiciones", H2))
story.append(bullet("Incluye: código fuente, base de datos, despliegue inicial y documentación."))
story.append(bullet("No incluye: fases futuras (WhatsApp, facturación automática, app móvil, IA, integraciones contables/CRM/ERP)."))
story.append(bullet("Cambios de alcance posteriores se cotizan por separado."))
story.append(bullet("Garantía de funcionamiento: 30 días tras la aceptación."))

doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=16 * mm, title="AuditFlow - Propuesta Económica", author="AuditFlow")
frame = Frame(20 * mm, 16 * mm, 170 * mm, 262 * mm, id="normal")
doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=header_footer)])
doc.build(story)
print("PDF generado:", OUT)
