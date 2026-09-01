"""Genera el guion de video de AuditFlow en PDF (docs/)."""

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

OUT = "docs/AuditFlow_Guion_Video.pdf"

styles = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=styles["Title"], fontSize=20, leading=24, textColor="#0f4c81", spaceAfter=6)
H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=13, leading=16, textColor="#0f4c81", spaceBefore=10, spaceAfter=3)
BODY = ParagraphStyle("BODY", parent=styles["BodyText"], fontSize=10, leading=14, spaceAfter=4)
SMALL = ParagraphStyle("SMALL", parent=BODY, fontSize=9, textColor="#64748b")

SCENES = [
    ("1", "0:00–0:20", "Portada",
     "Logo de AuditFlow sobre fondo azul.",
     "Bienvenidos. AuditFlow es la plataforma privada donde su organismo publica auditorías y los auditores autorizados las consultan, se postulan y reciben asignaciones. En este video veremos cómo usarla, desde la perspectiva de operaciones, de un auditor y de dirección."),
    ("2", "0:20–1:00", "Acceso y roles",
     "Pantalla de Login, escribir correo y contraseña, Iniciar sesión.",
     "Cada usuario entra con su correo y contraseña. Hay cuatro roles: administrador, que configura todo; operaciones, que publica y asigna; el auditor externo, que responde oportunidades; y el supervisor, que solo consulta. Tras varios intentos fallidos, el acceso se bloquea unos minutos por seguridad, y la política de contraseñas exige al menos ocho caracteres con letras y números."),
    ("3", "1:00–2:10", "Administrador: catálogo",
     "Competencias → Nueva competencia (ISO 9001) → Crear. Auditores → Nuevo auditor → detalle → Matriz → Asignar competencia con vigencia.",
     "El administrador carga primero el catálogo: crea las normas o especialidades, como ISO 9001. Luego da de alta a cada auditor; con el alta se genera su cuenta de acceso. En su perfil se asignan las competencias con su nivel y vigencia. Importante: una certificación vencida deja de contar, así el sistema solo ofrece al auditor servicios para los que está calificado."),
    ("4", "2:10–2:40", "Administrador: clientes",
     "Clientes → Nuevo cliente (razón social, contacto) → Crear.",
     "También se registran los clientes: empresas que reciben las auditorías. Esto permite asociar cada servicio y consultar el historial por cliente."),
    ("5", "2:40–4:00", "Administrador: publicar un servicio",
     "Oportunidades → Nueva oportunidad → llenar campos → Guardar → Publicar.",
     "El administrador crea el servicio; el folio se genera solo. Se indica cliente, tipo, ciudad, fechas, días, pago, viáticos, fecha límite y competencias requeridas. Al guardar queda en Borrador; al publicar, la oportunidad aparece únicamente en el portal de los auditores que cumplen esos requisitos."),
    ("6", "4:00–5:00", "Auditor: ver y responder",
     "(vista de auditor) Oportunidades → detalle → Me interesa.",
     "El auditor entra a su portal y solo ve los servicios compatibles con sus competencias vigentes y su disponibilidad. Revisa condiciones, pago y viáticos, y responde 'Me interesa' o 'No disponible'. Puede acompañar su respuesta con un comentario y rectificarla mientras el servicio siga abierto."),
    ("7", "5:00–6:00", "Administrador: asignar",
     "(administrador) detalle → Interesados → Asignar.",
     "Cuando llegan interesados, el administrador abre el servicio y ve la lista. Elige al auditor y pulsa Asignar. El pago y las condiciones quedan congelados. El sistema evita asignaciones dobles: si el auditor ya tiene otro servicio con fechas cruzadas o un bloqueo de calendario, no se permite. El auditor recibe una notificación y confirma."),
    ("8", "6:00–6:50", "Auditor: confirmar y gestionar",
     "(auditor) Mis servicios → Confirmar → Mi calendario → añadir indisponibilidad.",
     "En 'Mis servicios' el auditor confirma o rechaza. Al confirmar, el servicio pasa a Confirmada y sus fechas quedan bloqueadas. En su calendario ve sus próximos servicios y puede declarar indisponibilidades, con lo que el sistema no le ofrecerá trabajos en esas fechas."),
    ("9", "6:50–7:30", "Ciclo del servicio",
     "Detalle del servicio con la máquina de estados y el historial.",
     "El servicio recorre sus estados: de Borrador a Publicada, Con interesados, En revisión, Asignada, Confirmada, En ejecución, Terminada, Factura recibida y Pagada, o se cancela con un motivo. Cada acción queda registrada en el historial con el usuario y la fecha."),
    ("10", "7:30–8:00", "Administrador: reportes y mapa",
     "Reportes → KPIs → mapa de México → Exportar CSV.",
     "El administrador consulta los reportes: servicios por estado, costos confirmados, facturas pendientes y certificaciones por vencer, junto con el mapa de México y la evolución de auditorías. Todo se puede exportar a Excel. Así se tiene el pulso de la operación en un solo lugar."),
    ("11", "8:00–8:15", "Cierre",
     "Logo + contacto.",
     "Con esto tienen la plataforma lista para operar con sus auditores. Gracias por ver este video. Ante dudas, revisen el manual o el historial de cada servicio."),
]


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor("#64748b")
    canvas.drawString(20 * mm, 12 * mm, "AuditFlow · Guion de Video")
    canvas.drawRightString(190 * mm, 12 * mm, f"Página {doc.page}")
    canvas.restoreState()


story = []
story.append(Spacer(1, 30 * mm))
story.append(Paragraph("AuditFlow — Guion de Video", H1))
story.append(Paragraph("Cómo usar la plataforma de asignación de servicios de auditoría", BODY))
story.append(Spacer(1, 6 * mm))
story.append(Table([["Duración", "≈ 8 minutos"], ["Formato", "1280×720, voz en español"], ["Herramienta", "OBS Studio (grabación de pantalla)"]], colWidths=[40 * mm, 120 * mm], style=TableStyle([("GRID", (0, 0), (-1, -1), 0.5, "#cbd5e1"), ("BACKGROUND", (0, 0), (-1, 0), "#e8f0f8"), ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold")])))
story.append(Spacer(1, 10 * mm))

for num, t, title, onscreen, narration in SCENES:
    story.append(Paragraph(f"Escena {num} · {t} — {title}", H2))
    story.append(Table(
        [["En pantalla", onscreen], ["Narración", narration]],
        colWidths=[30 * mm, 140 * mm],
        style=TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, "#e2e8f0"),
            ("BACKGROUND", (0, 0), (0, -1), "#f4f6fa"),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]),
    ))
    story.append(Spacer(1, 8 * mm))

story.append(PageBreak())
story.append(Paragraph("Consejos de grabación", H2))
for tip in [
    "Usa OBS Studio (gratis) y graba la ventana del navegador a 1280×720.",
    "Oculta marcadores, pestañas personales y notificaciones del navegador.",
    "Haz una toma de respaldo de cada escena (por si te equivocas).",
    "Sube el audio por separado y ajusta la música de fondo si la usas.",
    "Edita con CapCut o Kdenlive: corta pausas y añade rótulos con el nombre de cada rol.",
]:
    story.append(Paragraph(f"• {tip}", BODY))

doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=16 * mm, title="AuditFlow - Guion de Video", author="AuditFlow")
frame = Frame(20 * mm, 16 * mm, 170 * mm, 262 * mm, id="normal")
doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=header_footer)])
doc.build(story)
print("PDF guion generado:", OUT)
