"""Genera el Manual de Capacitación de AuditFlow en PDF con capturas reales."""

import os

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

OUT = "docs/AuditFlow_Manual_Capacitacion.pdf"
CAP = os.path.join(os.path.dirname(__file__), "..", "docs", "capturas")
CAP = os.path.normpath(CAP)

styles = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=styles["Title"], fontSize=18, leading=22, spaceAfter=10, textColor="#145da0")
H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=14, leading=17, spaceBefore=16, spaceAfter=6, textColor="#145da0")
BODY = ParagraphStyle("BODY", parent=styles["BodyText"], fontSize=10, leading=14, spaceAfter=6)
BULLET = ParagraphStyle("BULLET", parent=BODY, leftIndent=10, bulletIndent=0, spaceAfter=2)
CAPTION = ParagraphStyle("CAPTION", parent=styles["BodyText"], fontSize=9, leading=12, textColor="#70809a", spaceAfter=8, spaceBefore=2)


def bullet(text):
    return Paragraph(f"• {text}", BULLET)


def img(name, caption):
    path = os.path.join(CAP, name)
    w = 170 * mm
    iw, ih = ImageReader(path).getSize()
    h = w * ih / iw
    return [Image(path, width=w, height=h), Paragraph(caption, CAPTION)]


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor("#70809a")
    canvas.drawString(20 * mm, 12 * mm, "AuditFlow · Manual de Capacitación")
    canvas.drawRightString(190 * mm, 12 * mm, f"Página {doc.page}")
    canvas.restoreState()


story = []
story.append(Spacer(1, 30 * mm))
story.append(Paragraph("Manual de Capacitación — AuditFlow", H1))
story.append(Paragraph("Plataforma privada de asignación de servicios de auditoría. Con capturas reales del sistema.", BODY))
story.append(Spacer(1, 10 * mm))
story.append(Table([["Documento", "AuditFlow_Manual_Capacitacion.pdf"], ["Versión", "0.2 · Rediseño High-End"], ["Perfiles", "Administrador · Auditor"]], colWidths=[40 * mm, 130 * mm], style=TableStyle([("GRID", (0, 0), (-1, -1), 0.5, "#e5ebf3"), ("BACKGROUND", (0, 0), (-1, 0), "#edf5ff")])))
story.append(PageBreak())

story.append(Paragraph("1. Acceso al sistema", H2))
story.append(Paragraph("Entra a la URL e inicia sesión con tu correo y contraseña. El primer administrador usa las credenciales del despliegue; tras 10 intentos fallidos se bloquea 5 min; cambia la contraseña en «Seguridad».", BODY))
story += img("00-login.png", "Pantalla de inicio de sesión")

story.append(Paragraph("2. Perfiles", H2))
story.append(Table([["Administrador", "Centro de control: oportunidades, auditores, personal, clientes, usuarios, competencias, calendario, reportes y mapa."], ["Auditor", "Su agenda: oportunidades compatibles, postularse, sus auditorías, calendario y documentos."]], colWidths=[34 * mm, 136 * mm], style=TableStyle([("GRID", (0, 0), (-1, -1), 0.5, "#e5ebf3")])))

story.append(Paragraph("3. Administrador — Centro de control", H2))
story.append(Paragraph("Resumen ejecutivo: KPIs clicables, donut de estados y rendimiento de auditores/clientes.", BODY))
story.append(bullet("Los KPIs son clicables (p. ej. «En ejecución» abre la lista filtrada)."))
story.append(bullet("El donut muestra la distribución por estado."))
story += img("01-dashboard.png", "Centro de control del administrador")

story.append(Paragraph("4. Administrador — Oportunidades", H2))
story.append(Paragraph("Vista por defecto en tarjetas (folio, estado, título, cliente, ubicación, fechas, pago, competencias), con toggle Tarjetas/Lista y buscador.", BODY))
story += img("02-oportunidades.png", "Lista de oportunidades (vista de tarjetas)")
story.append(Paragraph("«+ Nueva oportunidad» para crear; queda en Borrador y luego se publica.", BODY))
story += img("03-nueva-oportunidad.png", "Formulario de nueva oportunidad")

story.append(Paragraph("5. Administrador — Personal técnico", H2))
story.append(Paragraph("Catálogo del personal (evaluadores, instructores, inspectores, examinadores) con puestos, áreas y correos.", BODY))
story += img("04-personal.png", "Catálogo de personal técnico")

story.append(Paragraph("6. Administrador — Auditores", H2))
story.append(Paragraph("Alta de auditores externos; en el detalle se asigna la matriz de competencias con nivel y vigencia.", BODY))
story += img("05-auditores.png", "Catálogo de auditores externos")

story.append(Paragraph("7. Administrador — Clientes", H2))
story += img("06-clientes.png", "Catálogo de clientes")

story.append(Paragraph("8. Administrador — Usuarios", H2))
story.append(Paragraph("Cuentas de acceso (Administrador / Auditor); cambiar rol y activar/desactivar.", BODY))
story += img("07-usuarios.png", "Gestión de usuarios")

story.append(Paragraph("9. Administrador — Competencias", H2))
story += img("08-competencias.png", "Catálogo de competencias")

story.append(Paragraph("10. Administrador — Calendario", H2))
story += img("09-calendario.png", "Calendario de servicios")

story.append(Paragraph("11. Administrador — Reportes", H2))
story.append(Paragraph("Indicadores, servicios por cliente, auditores, certificaciones por vencer, mapa de México, evolución y export CSV.", BODY))
story += img("10-reportes.png", "Reportes e indicadores")

story.append(Paragraph("12. Auditor — Mi agenda", H2))
story += img("11-auditor-dashboard.png", "Dashboard del auditor")
story.append(Paragraph("Oportunidades compatibles (competencias vigentes y fechas libres).", BODY))
story += img("12-auditor-oportunidades.png", "Oportunidades disponibles del auditor")

story.append(Paragraph("13. Auditor — Mis servicios", H2))
story.append(Paragraph("Confirma o rechaza las asignaciones; al confirmar se bloquean las fechas.", BODY))
story += img("13-auditor-servicios.png", "Mis servicios (asignaciones del auditor)")

story.append(Paragraph("14. Auditor — Calendario", H2))
story += img("14-auditor-calendario.png", "Calendario del auditor")

story.append(Paragraph("15. Auditor — Mi perfil", H2))
story += img("15-auditor-perfil.png", "Perfil del auditor")

story.append(PageBreak())
story.append(Paragraph("16. Flujo principal", H2))
for t in [
    "Operaciones crea y publica una oportunidad.",
    "El sistema la muestra solo a auditores compatibles.",
    "Los auditores responden «Me interesa».",
    "Operaciones elige y asigna (pago congelado).",
    "El auditor confirma y se bloquean las fechas.",
    "El servicio recorre sus estados hasta Terminada/Paagada o Cancelada.",
]:
    story.append(bullet(t))

story.append(Paragraph("17. Reglas de negocio", H2))
for r in [
    "Postular no asigna: el administrador siempre elige.",
    "Solo se ven/postulan servicios con todas las competencias vigentes.",
    "El pago se congela al asignar.",
    "Sin fechas cruzadas ni bloqueos de calendario.",
    "Todo queda en el historial (quién, cuándo, qué).",
    "Los auditores no ven el nombre del cliente hasta ser asignados.",
]:
    story.append(bullet(r))

story.append(Paragraph("18. Solución de problemas frecuentes", H2))
story.append(bullet("«Tu usuario no tiene perfil de auditor» → crea el perfil en Auditores o usa Cambiar rol en Usuarios."))
story.append(bullet("El auditor no ve oportunidades → revisa competencia vigente y oportunidad publicada con fecha límite futura."))
story.append(bullet("«Credenciales inválidas» → usa las credenciales de las variables de entorno del despliegue."))

doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=16 * mm, title="AuditFlow - Manual de Capacitación", author="AuditFlow")
frame = Frame(20 * mm, 16 * mm, 170 * mm, 262 * mm, id="normal")
doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=header_footer)])
doc.build(story)
print("PDF generado:", OUT)
