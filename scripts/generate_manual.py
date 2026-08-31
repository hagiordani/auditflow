"""Genera el Manual de Operación de AuditFlow en PDF (docs/)."""

from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import (
    ParagraphStyle,
    getSampleStyleSheet,
)
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

OUT = "docs/AuditFlow_Manual_Operacion.pdf"

styles = getSampleStyleSheet()

H1 = ParagraphStyle("H1", parent=styles["Title"], fontSize=20, leading=24, spaceAfter=10, textColor="#0f4c81")
H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=14, leading=17, spaceBefore=14, spaceAfter=6, textColor="#0f4c81")
H3 = ParagraphStyle("H3", parent=styles["Heading3"], fontSize=12, leading=15, spaceBefore=10, spaceAfter=4)
BODY = ParagraphStyle("BODY", parent=styles["BodyText"], fontSize=10.5, leading=15, spaceAfter=6, alignment=TA_LEFT)
BULLET = ParagraphStyle("BULLET", parent=BODY, leftIndent=10, bulletIndent=0, spaceAfter=2)
CODE = ParagraphStyle("CODE", parent=styles["Code"], fontSize=9, leading=12, backColor="#f4f6fa", borderColor="#e2e8f0", borderWidth=0.5, padding=6)
TITLE_PAGE = ParagraphStyle("TP", parent=styles["Title"], fontSize=26, leading=30, textColor="#0f4c81", alignment=TA_CENTER)
SUBTITLE = ParagraphStyle("ST", parent=styles["Normal"], fontSize=13, leading=18, alignment=TA_CENTER, textColor="#64748b")


def flowable_heading(text, style):
    return Paragraph(text, style)


def bullet(text):
    return Paragraph(f"• {text}", BULLET)


def code(text):
    return Paragraph(text.replace("\n", "<br/>"), CODE)


def make_table(data, col_widths):
    t = Table(data, colWidths=col_widths, hAlign="LEFT")
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), "#e8f0f8"),
                ("TEXTCOLOR", (0, 0), (-1, 0), "#0f4c81"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, "#cbd5e1"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
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
    canvas.setFillColor("#64748b")
    canvas.drawString(20 * mm, 12 * mm, "AuditFlow · Manual de Operación")
    canvas.drawRightString(190 * mm, 12 * mm, f"Página {doc.page}")
    canvas.restoreState()


story = []

# ---------- Portada ----------
story.append(Spacer(1, 55 * mm))
story.append(Paragraph("AuditFlow", TITLE_PAGE))
story.append(Spacer(1, 6 * mm))
story.append(Paragraph("Manual de Operación", SUBTITLE))
story.append(Paragraph("Plataforma privada de asignación de servicios de auditoría · v0.1.0", SUBTITLE))
story.append(Spacer(1, 14 * mm))
story.append(make_table(
    [
        ["Documento", "AuditFlow_Manual_Operacion.pdf"],
        ["Versión de la app", "0.1.0 (MVP)"],
        ["Roles", "Administrador · Operaciones · Auditor · Supervisor"],
        ["Uso", "Guía operativa para el equipo"],
    ],
    [40 * mm, 130 * mm],
))
story.append(PageBreak())

# ---------- 1. Roles y acceso ----------
story.append(Paragraph("1. Roles y acceso", H1))
story.append(Paragraph("AuditFlow tiene cuatro roles. Cada uno ve y puede hacer cosas distintas.", BODY))
story.append(make_table(
    [
        ["Rol", "Qué puede hacer"],
        ["Administrador", "Todo: usuarios, catálogos, oportunidades, asignaciones, reportes."],
        ["Operaciones", "Publica oportunidades, gestiona auditores y clientes, revisa interesados, asigna."],
        ["Auditor", "Ve oportunidades compatibles, postula, confirma servicios, gestiona su calendario y documentos."],
        ["Supervisor", "Solo lectura: oportunidades, calendario y reportes."],
    ],
    [42 * mm, 128 * mm],
))
story.append(Spacer(1, 6 * mm))
story.append(Paragraph("Para entrar:", BODY))
story.append(bullet("Abre la URL de la plataforma e inicia sesión con tu correo y contraseña."))
story.append(bullet("El primer administrador usa el correo y contraseña definidos en el despliegue (variables ADMIN_EMAIL / ADMIN_PASSWORD)."))
story.append(bullet("Política de contraseña: mínimo 8 caracteres, con letras y números. Cámbiala en «Seguridad»."))
story.append(bullet("Tras 10 intentos fallidos, el login se bloquea 5 minutos por IP."))

# ---------- 2. Administrador ----------
story.append(Paragraph("2. Administrador — puesta en marcha", H1))

story.append(Paragraph("2.1 Crear el equipo interno", H2))
story.append(bullet("Menú Usuarios → Nuevo usuario → nombre, correo, contraseña y rol (Administrador / Operaciones / Supervisor)."))
story.append(bullet("Con los botones Activar / Desactivar de la tabla controlas las cuentas."))
story.append(bullet("Los auditores no se crean aquí: se crean en el módulo «Auditores»."))

story.append(Paragraph("2.2 Registrar normas y especialidades (competencias)", H2))
story.append(bullet("Menú Competencias → Nueva competencia → nombre (p. ej. ISO 9001) y descripción → Crear."))
story.append(bullet("Puedes activar o desactivar una norma; si se desactiva, deja de poder exigirse en servicios nuevos."))

story.append(Paragraph("2.3 Dar de alta auditores", H2))
story.append(bullet("Menú Auditores → Nuevo auditor → nombre, correo, contraseña (o marca «la cuenta ya existe (vincular solo el perfil)»), ciudad, tarifa diaria."))
story.append(bullet("En el detalle del auditor → Matriz de competencias → Asignar competencia: norma, nivel, nº de certificado y vigencia desde/hasta."))
story.append(bullet("Si una vigencia venció, la competencia deja de valer y el auditor no verá servicios que la exijan."))

story.append(Paragraph("2.4 Registrar clientes", H2))
story.append(bullet("Menú Clientes → Nuevo cliente → razón social, nombre comercial, RFC, dirección, contacto → Crear."))

# ---------- 3. Operaciones ----------
story.append(Paragraph("3. Operaciones — el corazón del negocio", H1))

story.append(Paragraph("3.1 Crear y publicar un servicio", H2))
story.append(bullet("Menú Oportunidades → + Nueva oportunidad."))
story.append(make_table(
    [
        ["Campo", "Ejemplo"],
        ["Título", "Auditoría de calidad"],
        ["Cliente", "El que hayas registrado"],
        ["Tipo", "Certificación / Vigilancia / Renovación"],
        ["Ciudad / Estado", "Puebla / Puebla"],
        ["Fecha inicio - fin", "12/09/2026 - 15/09/2026"],
        ["Nº de días", "3"],
        ["Pago ofrecido (MXN)", "12000"],
        ["Viáticos / Hospedaje / Transporte", "Incluidos / No incluidos"],
        ["Fecha límite para postularse", "05/09/2026"],
        ["Nº de auditores requeridos", "1"],
        ["Competencias requeridas", "Añadir competencia → ISO 9001 → nivel"],
    ],
    [55 * mm, 115 * mm],
))
story.append(bullet("El folio (p. ej. AUD-2026-00001) se genera automáticamente. La oportunidad queda en Borrador."))
story.append(bullet("Para publicarla: botón Publicar (en la lista o en el detalle). Valida cliente, fechas, fecha límite y al menos una competencia."))

story.append(Paragraph("3.2 Seguir el ciclo y asignar", H2))
story.append(bullet("Cuando un auditor responde «Me interesa», el servicio pasa solo a «Con interesados»."))
story.append(bullet("En el detalle → sección Interesados → botón Asignar al candidato elegido."))
story.append(bullet("El pago y las condiciones se congelan en la asignación; no cambian después."))
story.append(bullet("El sistema bloquea asignar si el auditor tiene otro servicio con fechas cruzadas o un bloqueo de calendario."))
story.append(bullet("El auditor recibe una notificación; al confirmar, el servicio pasa a «Confirmada» y se bloquean las fechas."))
story.append(bullet("En la misma pantalla: sección Asignaciones (cancelar / ver estado) y Documentos (orden, agenda, reporte)."))

story.append(Paragraph("3.3 Estados del servicio", H2))
story.append(make_table(
    [
        ["Estado", "Significado"],
        ["Borrador", "Editando; aún no visible para auditores."],
        ["Publicada", "Visible para auditores compatibles."],
        ["Con interesados", "Al menos un auditor mostró interés."],
        ["En revisión", "Operaciones eligiendo candidato."],
        ["Asignada", "Auditor elegido; espera su confirmación."],
        ["Confirmada", "El auditor confirmó; fechas bloqueadas."],
        ["En ejecución", "La auditoría está en curso."],
        ["Terminada", "Servicio realizado."],
        ["Factura recibida", "El auditor entregó la factura."],
        ["Pagada", "Servicio liquidado."],
        ["Cancelada", "Se canceló con motivo registrado."],
    ],
    [32 * mm, 138 * mm],
))
story.append(bullet("Puedes avanzar el estado con los botones «→ siguiente estado» en el detalle."))
story.append(bullet("Cancelar siempre pide un motivo y queda en el historial."))

# ---------- 4. Auditor ----------
story.append(Paragraph("4. Auditor — portal", H1))
story.append(Paragraph("4.1 Ver y responder oportunidades", H2))
story.append(bullet("Menú Oportunidades muestra solo las compatibles: competencias vigentes, fechas libres y sin bloqueos de calendario."))
story.append(bullet("En el detalle revisa condiciones (pago, viáticos, fechas) y responde «Me interesa» (con comentario) o «No disponible»."))
story.append(bullet("Puedes cambiar tu respuesta mientras la oportunidad siga abierta."))
story.append(bullet("En Mis postulaciones ves tus respuestas y el estado del servicio."))
story.append(Paragraph("4.2 Gestionar mis servicios", H2))
story.append(bullet("Mis servicios: cuando te asignen uno, confírmalo (Confirmar) o recházalo (Rechazar). Al confirmar se bloquean las fechas."))
story.append(bullet("Mis documentos: sube facturas, reportes o certificados (máx. 15 MB)."))
story.append(bullet("Mi calendario: próximos servicios y Añadir indisponibilidad (vacaciones/bloqueo) para que no te ofrezcan servicios en esas fechas."))
story.append(bullet("Mi perfil: tus datos y competencias. Para actualizar una certificación, contacta a operaciones."))

# ---------- 5. Supervisor ----------
story.append(Paragraph("5. Supervisor — monitoreo", H1))
story.append(bullet("Menú Reportes: KPIs (servicios por estado, costo confirmado total y del mes, facturas pendientes, certificaciones por vencer)."))
story.append(bullet("Tablas: servicios por cliente, auditores más utilizados y certificaciones por vencer."))
story.append(bullet("Botón Exportar CSV (Excel) para descargar la lista completa de servicios."))
story.append(bullet("Menú Calendario: agenda de todos los servicios con asignación."))

# ---------- 6. Reglas ----------
story.append(Paragraph("6. Reglas de negocio que conviene recordar", H1))
for r in [
    "Postular no asigna: operaciones siempre elige al auditor.",
    "Un auditor solo ve y puede postular servicios donde tenga todas las competencias vigentes.",
    "El pago se congela al asignar; cambiar la oportunidad o la tarifa no afecta la asignación.",
    "Sin fechas cruzadas ni bloqueos: no se asigna un auditor con conflicto de fechas.",
    "Certificación vencida = competencia inválida (deja de contar para la compatibilidad).",
    "Todo queda en el historial de la oportunidad (quién creó, publicó, asignó, canceló, con fecha y hora).",
    "Los auditores no ven el nombre del cliente hasta ser asignados (privacidad).",
]:
    story.append(bullet(r))

# ---------- 7. Notas ----------
story.append(Paragraph("7. Notas de operación", H1))
story.append(bullet("Notificaciones: campana 🔔 arriba a la derecha; al asignar, confirmar, rechazar o cancelar se avisa a quien corresponda."))
story.append(bullet("El uso por HTTP (sin candado) es normal cuando se accede por IP; al conectar un dominio, Dokploy emite HTTPS automáticamente."))
story.append(bullet("Ante dudas con los datos, revisa el historial del servicio (bitácora) antes de cambiar algo."))

doc = BaseDocTemplate(
    OUT,
    pagesize=A4,
    leftMargin=20 * mm,
    rightMargin=20 * mm,
    topMargin=18 * mm,
    bottomMargin=16 * mm,
    title="AuditFlow - Manual de Operación",
    author="AuditFlow",
)
frame = Frame(20 * mm, 16 * mm, 170 * mm, 262 * mm, id="normal")
doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=header_footer)])
doc.build(story)
print("PDF generado:", OUT)
