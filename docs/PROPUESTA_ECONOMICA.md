# PROPUESTA ECONÓMICA
## Plataforma de Asignación de Servicios de Auditoría — AuditFlow

| | |
|---|---|
| **Cliente** | [Nombre del organismo de certificación] |
| **Proveedor** | [Tu nombre / empresa] |
| **Fecha** | [DD de MMM de AAAA] |
| **Moneda** | MXN (pesos mexicanos) |
| **Vigencia de la oferta** | 30 días naturales |

> **Nota:** las cifras de horas y montos son una **estimación inicial ajustable**.
> Sustituye la tarifa por hora y los valores marcados con `[ ]` antes de enviar.

---

## 1. Resumen ejecutivo

AuditFlow es una **plataforma privada web** donde el organismo publica servicios de
auditoría y los auditores externos autorizados los consultan, se postulan y reciben
asignaciones, con control completo de competencias, fechas, pagos y estados.

Características principales:
- **Dos perfiles**: Administrador (centro de control) y Auditor (su agenda).
- **Compatibilidad automática**: cada oportunidad se muestra solo a auditores calificados (competencia vigente + fechas libres).
- **Asignación con pago congelado** y prevención de fechas cruzadas.
- **Ciclo de vida** completo (11 estados) con **historial/bitácora** de todas las acciones.
- **Dashboard ejecutivo** con KPIs, mapa de México, rendimiento y evolución.
- **Documentos y notificaciones** integrados.

## 2. Alcance entregado

| Módulo | Descripción |
|---|---|
| Autenticación y acceso | Login JWT, recuperación, control por rol, bloqueo por intentos |
| Usuarios | Altas/bajas, activación, cambio de rol (2 perfiles) |
| Auditores | Catálogo + matriz de competencias con vigencias |
| Clientes | Catálogo con contacto y RFC |
| Oportunidades | Folio automático, estados, publicación, cancelación |
| Postulaciones | "Me interesa" / "No disponible" con comentarios |
| Asignaciones | Selección, confirmación, pago congelado, sin traslapes |
| Calendario y disponibilidad | Agenda + bloques de indisponibilidad |
| Documentos | Carga y descarga privada (orden, agenda, reporte, factura) |
| Notificaciones | In-app en asignación/confirmación/rechazo/cancelación |
| Dashboard y reportes | KPIs, donut, rendimiento, mapa de México, export CSV |
| Seguridad | Contraseñas fuertes, rate limit, headers, secretos |

## 3. Inversión — desarrollo e implementación

**Tarifa por hora considerada: `$[750] MXN/h`** (ajustable).

| # | Concepto | Horas est. | Monto (MXN) |
|---|---|---|---|
| 1 | Arquitectura y base (API, frontend, Docker, auth, CI) | 80 | $60,000 |
| 2 | Usuarios y control de acceso (2 perfiles, RBAC) | 40 | $30,000 |
| 3 | Auditores y matriz de competencias | 60 | $45,000 |
| 4 | Clientes y oportunidades (estados, folio, bitácora) | 80 | $60,000 |
| 5 | Portal del auditor (compatibilidad, postulaciones) | 60 | $45,000 |
| 6 | Asignaciones (pago congelado, traslapes) | 60 | $45,000 |
| 7 | Calendario, disponibilidad, documentos, notificaciones | 80 | $60,000 |
| 8 | Dashboard ejecutivo y reportes (KPIs, CSV) | 60 | $45,000 |
| 9 | Mapa de México y evolución temporal | 40 | $30,000 |
| 10 | Rediseño de interfaz High-End | 80 | $60,000 |
| 11 | Seguridad y endurecimiento | 40 | $30,000 |
| 12 | Pruebas automatizadas (88 tests) | 60 | $45,000 |
| 13 | Documentación (manual, guion de video) | 40 | $30,000 |
| 14 | Despliegue en Hostinger + Dokploy (SSL, backups) | 40 | $30,000 |
| | **Subtotal desarrollo** | **820** | **$615,000** |

## 4. Servicios opcionales (recurrentes)

| Concepto | Frecuencia | Monto (MXN) |
|---|---|---|
| Mantenimiento, soporte y actualizaciones | Mensual | $[12,000] |
| Capacitación al equipo (sesión guiada) | Única | $[8,000] |
| Hosting/dominio (VPS Hostinger + dominio) | Por su cuenta | — |

## 5. Resumen económico

| Concepto | Monto (MXN) |
|---|---|
| Desarrollo e implementación (una sola vez) | $615,000 |
| Capacitación (opcional) | $8,000 |
| **Total inversión inicial** | **$623,000** |
| Mantenimiento mensual (opcional) | $12,000/mes |

> IVA no incluido, se adiciona conforme a la legislación vigente.

## 6. Forma de pago propuesta

| Hito | % |
|---|---|
| Anticipo (arranque del proyecto) | 40% |
| Entrega del MVP funcional (demo) | 40% |
| Aceptación final y puesta en producción | 20% |

## 7. Condiciones

- Incluye: código fuente, base de datos, despliegue inicial y documentación.
- No incluye: fases futuras (WhatsApp, facturación electrónica automática, app móvil nativa, IA de asignación, integraciones contables/CRM/ERP).
- Los cambios de alcance posteriores se cotizan por separado.
- La garantía de funcionamiento cubre 30 días tras la aceptación.
