# AuditFlow — Manual de Usuario (MVP)

Plataforma privada de asignación de servicios de auditoría. Versión 0.1.0.

---

## 1. Roles

| Rol | Qué puede hacer |
|---|---|
| **Administrador** | Todo: usuarios, catálogos, oportunidades, asignaciones, reportes |
| **Operaciones** | Publica oportunidades, gestiona auditores/clientes, revisa interesados, asigna |
| **Auditor** | Ve oportunidades compatibles, postula, confirma servicios, gestiona su calendario y documentos |
| **Supervisor** | Solo lectura: oportunidades, calendario y reportes |

## 2. Acceso

1. Abre la URL de la plataforma e inicia sesión con tu correo y contraseña.
2. El primer acceso del administrador usa las credenciales definidas en el despliegue.
3. Cambia tu contraseña en **Seguridad** (menú superior). Política: mínimo 8 caracteres con letras y números.
4. Tras 10 intentos fallidos, el login se bloquea por IP durante 5 minutos.

## 3. Puesta en marcha (Administrador)

1. **Usuarios**: crea las cuentas del equipo (operaciones, supervisores, auditores).
2. **Competencias**: registra las normas/servicios (ISO 9001, ISO 14001…).
3. **Auditores**: da de alta a cada auditor (se crea su cuenta de acceso) y en su detalle **asigna competencias** con nivel, número de certificado y **vigencia**. Una certificación vencida deja de contar automáticamente.
4. **Clientes**: registra las empresas que reciben auditorías.

## 4. Publicar un servicio (Operaciones)

1. **Oportunidades → Nueva oportunidad**.
2. Completa: cliente, tipo, fechas, días, **pago**, viáticos/hospedaje/transporte, fecha límite de postulación y **competencias requeridas**.
3. El folio (`AUD-2026-00001`) se genera solo. La oportunidad queda en **Borrador**.
4. Revisa y pulsa **Publicar**. Desde ese momento aparece en el portal de los auditores compatibles.

## 5. Responder una oportunidad (Auditor)

1. En **Oportunidades** solo ves servicios compatibles con tus competencias **vigentes** y fechas libres (los bloqueos de tu calendario también se respetan).
2. Entra al detalle, revisa condiciones y responde **Me interesa** (puedes añadir comentarios) o **No disponible**. Puedes cambiar tu respuesta mientras siga abierta.
3. En **Mis postulaciones** consultas el estado de cada servicio.

## 6. Asignar y confirmar

1. Operaciones abre la oportunidad → sección **Interesados** → **Asignar** al auditor elegido. El pago y condiciones **quedan congelados** en la asignación (cambiarlos después no la afecta).
2. El sistema impide asignar si el auditor tiene otro servicio con fechas cruzadas o un bloqueo de calendario.
3. El auditor recibe una notificación y en **Mis servicios** pulsa **Confirmar** (o **Rechazar**). Al confirmar, el servicio pasa a **Confirmada** y las fechas quedan bloqueadas.
4. Si rechaza o se cancela, la oportunidad vuelve a revisión para elegir a otro candidato.

## 7. Ciclo de vida del servicio (estados)

```
Borrador → Publicada → Con interesados → En revisión → Asignada → Confirmada
→ En ejecución → Terminada → Factura recibida → Pagada      (o Cancelada)
```

- El estado avanza con los botones del detalle de la oportunidad o automáticamente (publicar, primer interesado, asignar, confirmar).
- **Cancelar** siempre pide un motivo; queda en el historial.

## 8. Calendario y documentos

- **Auditor → Mi calendario**: próximos servicios y **bloques de indisponibilidad** (vacaciones, etc.).
- **Staff → Calendario**: agenda de todos los servicios con asignación.
- **Documentos**: en el detalle de la oportunidad (staff) se suben órdenes de servicio, agendas y reportes; el auditor sube sus facturas/certificados en **Mis documentos**. Máximo 15 MB por archivo.

## 9. Reportes

- **Reportes** (admin/operaciones/supervisor): indicadores (servicios por estado, costos confirmados, facturas pendientes, certificaciones por vencer), servicios por cliente, auditores más utilizados y **exportación a CSV (Excel)**.
- El dashboard inicial muestra los KPIs del rol.

## 10. Reglas que conviene recordar

- Postular **no** asigna: operaciones siempre elige.
- Solo se ven/postulan servicios con **todas** las competencias requeridas vigentes.
- El pago mostrado al auditor se congela al asignar.
- Toda acción (crear, publicar, asignar, cancelar…) queda en el **historial** de la oportunidad con usuario y fecha.
