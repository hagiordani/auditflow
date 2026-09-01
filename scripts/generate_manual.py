"""Genera el Manual de Operación de AuditFlow en PDF (docs/)."""

from reportlab.lib.enums import TA_LEFT
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

OUT = "docs/AuditFlow_Manual_Operacion.pdf"

styles = getSampleStyleSheet()

H1 = ParagraphStyle("H1", parent=styles["Title"], fontSize=20, leading=24, spaceAfter=10, textColor="#145da0")
H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=14, leading=17, spaceBefore=14, spaceAfter=6, textColor="#145da0")
BODY = ParagraphStyle("BODY", parent=styles["BodyText"], fontSize=10.5, leading=15, spaceAfter=6, alignment=TA_LEFT)
BULLET = ParagraphStyle("BULLET", parent=BODY, leftIndent=10, bulletIndent=0, spaceAfter=2)
TITLE_PAGE = ParagraphStyle("TP", parent=styles["Title"], fontSize=26, leading=30, textColor="#145da0")
SUBTITLE = ParagraphStyle("ST", parent=styles["Normal"], fontSize=13, leading=18, textColor="#70809a")


def bullet(text):
    return Paragraph(f"• {text}", BULLET)


def make_table(data, col_widths):
    t = Table(data, colWidths=col_widths, hAlign="LEFT")
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), "#edf5ff"),
                ("TEXTCOLOR", (0, 0), (-1, 0), "#145da0"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, "#e5ebf3"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return t


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor("#70809a")
    canvas.drawString(20 * mm, 12 * mm, "AuditFlow · Manual de Operación")
    canvas.drawRightString(190 * mm, 12 * mm, f"Página {doc.page}")
    canvas.restoreState()


story = []
story.append(Spacer(1, 55 * mm))
story.append(Paragraph("AuditFlow", TITLE_PAGE))
story.append(Spacer(1, 6 * mm))
story.append(Paragraph("Manual de Operación", SUBTITLE))
story.append(Paragraph("Plataforma privada de asignación de servicios de auditoría · v0.2", SUBTITLE))
story.append(Spacer(1, 14 * mm))
story.append(make_table(
    [["Documento", "AuditFlow_Manual_Operacion.pdf"],
     ["Versión", "0.2 (Rediseño High-End)"],
     ["Perfiles", "Administrador · Auditor"]],
    [40 * mm, 130 * mm],
))
story.append(PageBreak())

story.append(Paragraph("1. Perfiles", H1))
story.append(make_table(
    [["Perfil", "Qué puede hacer"],
     ["Administrador", "Centro de control completo: oportunidades, auditores, clientes, usuarios, competencias, calendario, reportes y mapa."],
     ["Auditor", "Su agenda: oportunidades compatibles, postularse, sus auditorías, calendario y documentos. Solo ve su propia información."]],
    [34 * mm, 136 * mm],
))
story.append(bullet("Los roles antiguos Operaciones y Supervisor se integraron en Administrador."))

story.append(Paragraph("2. Acceso", H1))
story.append(bullet("Inicia sesión con tu correo y contraseña. El primer administrador usa ADMIN_EMAIL / ADMIN_PASSWORD del despliegue."))
story.append(bullet("Contraseña: mínimo 8 caracteres con letras y números. Cámbiala en «Seguridad»."))
story.append(bullet("Tras 10 intentos fallidos, el login se bloquea 5 minutos por IP."))

story.append(Paragraph("3. Administrador — Centro de control", H1))
story.append(Paragraph("3.1 Dashboard ejecutivo", H2))
story.append(bullet("KPIs clicables: total, disponibles, en ejecución, finalizadas, auditores activos y clientes. Clic → lista filtrada."))
story.append(bullet("Donut «Oportunidades por estado»."))
story.append(bullet("Rendimiento de auditores: asignadas / en ejecución / finalizadas / % cumplimiento."))
story.append(bullet("Rendimiento de clientes: auditorías / activas / finalizadas / monto / % cumplimiento."))
story.append(bullet("Mapa de México coroplético: cambia la métrica, pasa el cursor para el detalle y haz clic en un estado para ver sus oportunidades."))
story.append(bullet("Evolución de auditorías: creadas / asignadas / finalizadas por periodo (30 días, 3/6 meses, año)."))

story.append(Paragraph("3.2 Oportunidades", H2))
story.append(bullet("Vista de tarjetas por defecto (folio, estado, título, cliente, ubicación, fechas, pago y competencias requeridas), con toggle Tarjetas/Lista, buscador y filtro por estado."))
story.append(bullet("«+ Nueva oportunidad» → queda en Borrador → Publicar."))
story.append(bullet("Detalle: Interesados → Asignar (pago congelado), Asignaciones, Documentos e Historial."))

story.append(Paragraph("3.3 Catálogos", H2))
story.append(bullet("Auditores: alta (crea su cuenta) y matriz de competencias con nivel y vigencia (vencida = no cuenta)."))
story.append(bullet("Clientes y Competencias (normas/especialidades)."))
story.append(bullet("Usuarios: crear solo Administrador o Auditor; activar/desactivar."))

story.append(Paragraph("4. Auditor — Mi agenda y oportunidades", H1))
story.append(bullet("Dashboard: KPIs personales (disponibles, postulaciones, próximas auditorías, días ocupados, certificaciones por vencer)."))
story.append(bullet("Oportunidades: solo compatibles con competencias vigentes y fechas libres. «Me interesa» o «No disponible»."))
story.append(bullet("Mis auditorías: confirmar o rechazar asignaciones."))
story.append(bullet("Calendario: próximos servicios + indisponibilidades."))
story.append(bullet("Mis documentos: facturas, reportes, certificados."))

story.append(Paragraph("5. Ciclo del servicio", H1))
story.append(Paragraph("Borrador → Publicada → Con interesados → En revisión → Asignada → Confirmada → En ejecución → Terminada → Factura recibida → Pagada (o Cancelada)", BODY))

story.append(Paragraph("6. Reglas clave", H1))
for r in [
    "Postular no asigna: el administrador siempre elige.",
    "El auditor solo ve/postula servicios con todas las competencias vigentes.",
    "El pago se congela al asignar.",
    "Sin fechas cruzadas ni bloqueos de calendario en la asignación.",
    "Todo queda en el historial.",
    "Los auditores no ven el nombre del cliente hasta ser asignados.",
]:
    story.append(bullet(r))

story.append(Paragraph("7. Reportes", H1))
story.append(bullet("Menú Reportes: indicadores, servicios por cliente, auditores más utilizados, certificaciones por vencer y exportación CSV (Excel)."))

doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=16 * mm, title="AuditFlow - Manual de Operación", author="AuditFlow")
frame = Frame(20 * mm, 16 * mm, 170 * mm, 262 * mm, id="normal")
doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=header_footer)])
doc.build(story)
print("PDF generado:", OUT)
