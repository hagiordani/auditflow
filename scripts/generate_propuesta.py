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
story.append(Paragraph("Precio cerrado (tope): $60,000 MXN — incluye el alcance base del MVP.", SMALL))
story.append(PageBreak())

story.append(Paragraph("1. Resumen ejecutivo", H2))
story.append(Paragraph("AuditFlow es una plataforma privada web donde el organismo publica servicios de auditoría y los auditores externos autorizados los consultan, se postulan y reciben asignaciones, con control de competencias, fechas, pagos y estados.", BODY))
story.append(Paragraph("Esta propuesta cubre el núcleo operativo (MVP) a un precio cerrado de $60,000 MXN, con dos perfiles: Administrador (centro de control) y Auditor (portal).", BODY))

story.append(Paragraph("2. Alcance incluido en el paquete", H2))
story.append(table(
    [["Módulo", "Qué incluye"],
     ["Acceso y usuarios", "Login JWT, control por rol, alta/activación de usuarios"],
     ["Auditores", "Catálogo + matriz de competencias con vigencias"],
     ["Clientes", "Catálogo con contacto"],
     ["Oportunidades", "Folio automático, estados, publicación, cancelación"],
     ["Portal del auditor", "Oportunidades compatibles, Me interesa / No disponible"],
     ["Asignaciones", "Selección, confirmación, pago congelado, sin traslapes"],
     ["Dashboard y reportes", "KPIs, servicios por estado, export CSV"],
     ["Despliegue", "Docker + Dokploy + dominio + HTTPS (puesta en marcha)"]],
    [48 * mm, 122 * mm],
))

story.append(Paragraph("3. Inversión — Paquete MVP (precio cerrado)", H2))
story.append(table(
    [["#", "Concepto", "Monto (MXN)"],
     ["1", "Fundación y despliegue (API, frontend, Docker, Dokploy, dominio)", "$18,000"],
     ["2", "Usuarios y control de acceso (2 perfiles)", "$6,000"],
     ["3", "Auditores y matriz de competencias", "$9,000"],
     ["4", "Clientes", "$4,500"],
     ["5", "Oportunidades (folio, estados, publicación)", "$7,500"],
     ["6", "Portal del auditor (postulaciones)", "$6,000"],
     ["7", "Asignaciones (pago congelado, confirmación)", "$6,000"],
     ["8", "Dashboard y reportes básicos", "$3,000"],
     ["", "TOTAL (tope)", "$60,000"]],
    [12 * mm, 118 * mm, 40 * mm],
))

story.append(Paragraph("4. Módulos opcionales (no incluidos)", H2))
story.append(table(
    [["Concepto", "Monto estimado (MXN)"],
     ["Mapa interactivo de México + evolución temporal", "$12,000"],
     ["Rediseño visual premium adicional", "$10,000"],
     ["Calendario avanzado + documentos", "$8,000"],
     ["Mantenimiento y soporte mensual", "$6,000/mes"]],
    [112 * mm, 58 * mm],
))

story.append(Paragraph("5. Resumen económico", H2))
story.append(table(
    [["Concepto", "Monto (MXN)"],
     ["Paquete MVP (precio cerrado)", "$60,000"],
     ["Módulos opcionales (a elegir)", "Según tabla"],
     ["Mantenimiento mensual (opcional)", "$6,000/mes"]],
    [110 * mm, 60 * mm],
))
story.append(Paragraph("IVA no incluido, se adiciona conforme a la legislación vigente.", SMALL))

story.append(Paragraph("6. Forma de pago", H2))
story.append(bullet("Anticipo (arranque): 50%"))
story.append(bullet("Entrega del MVP funcional: 30%"))
story.append(bullet("Aceptación final y puesta en producción: 20%"))

story.append(Paragraph("7. Condiciones", H2))
story.append(bullet("Incluye: código fuente, despliegue inicial y documentación básica."))
story.append(bullet("No incluye: los módulos de la sección 4 ni fases futuras (WhatsApp, facturación electrónica, app móvil, IA, integraciones contables/CRM/ERP)."))
story.append(bullet("Cambios de alcance posteriores se cotizan por separado."))
story.append(bullet("Garantía de funcionamiento: 30 días tras la aceptación."))

doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=16 * mm, title="AuditFlow - Propuesta Económica", author="AuditFlow")
frame = Frame(20 * mm, 16 * mm, 170 * mm, 262 * mm, id="normal")
doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=header_footer)])
doc.build(story)
print("PDF generado:", OUT)
