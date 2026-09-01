# AuditFlow — Manual de Usuario (v0.2 · Rediseño High-End)

Plataforma privada de asignación de servicios de auditoría. Diseño simplificado con **dos perfiles**.

---

## 1. Perfiles

| Perfil | Qué puede hacer |
|---|---|
| **Administrador** | Centro de control completo: oportunidades, auditores, clientes, usuarios, competencias, calendario, reportes y mapa. |
| **Auditor** | Su agenda: oportunidades compatibles, postularse, sus auditorías, calendario y documentos. Solo ve su propia información. |

> Los roles antiguos *Operaciones* y *Supervisor* se integraron en **Administrador**.

## 2. Acceso

1. Abre la URL e inicia sesión con tu correo y contraseña.
2. El primer administrador usa las credenciales definidas en el despliegue (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).
3. Política de contraseña: mínimo 8 caracteres, con letras y números. Cámbiala en **Seguridad** (arriba a la derecha).
4. Tras 10 intentos fallidos, el login se bloquea 5 minutos por IP.

## 3. Administrador — Centro de control

### 3.1 Dashboard ejecutivo
Al entrar verás un resumen de toda la operación:
- **KPIs clicables**: total, disponibles, en ejecución, finalizadas, auditores activos y clientes. Clic → abre la lista filtrada.
- **Donut "Oportunidades por estado"**.
- **Rendimiento de auditores** (asignadas / en ejecución / finalizadas / % cumplimiento).
- **Rendimiento de clientes** (auditorías / activas / finalizadas / monto / % cumplimiento).
- **Mapa de México**: coroplético interactivo; cambia la métrica, pasa el cursor para el detalle y haz clic en un estado para ver sus oportunidades.
- **Evolución de auditorías**: gráfica de creadas / asignadas / finalizadas por periodo (30 días, 3/6 meses, año).

### 3.2 Oportunidades
- Menú **Oportunidades**: vista de **tarjetas** por defecto (folio, estado, título, cliente, ubicación, fechas, pago y competencias requeridas), con toggle **Tarjetas / Lista**, buscador y filtro por estado.
- **+ Nueva oportunidad**: completa servicio, cliente, ubicación, fechas, pago, viáticos y competencias requeridas. Queda en **Borrador**; luego **Publicar**.
- En el detalle: **Interesados → Asignar** (el pago queda congelado), **Asignaciones**, **Documentos** e **Historial**.

### 3.3 Catálogos
- **Auditores**: alta (crea su cuenta de acceso) y **matriz de competencias** con nivel y vigencia (vencida = deja de contar).
- **Clientes**: alta y consulta.
- **Competencias**: normas/especialidades (ISO 9001, etc.).
- **Usuarios**: crear solo **Administrador** o **Auditor**; activar/desactivar.

## 4. Auditor — Mi agenda y oportunidades

- **Dashboard**: KPIs personales (disponibles, postulaciones, próximas auditorías, días ocupados, certificaciones por vencer).
- **Oportunidades**: solo las compatibles con tus competencias **vigentes** y fechas libres. En el detalle pulsa **Me interesa** (con comentario) o **No disponible**.
- **Mis auditorías**: confirma o rechaza las asignaciones; al confirmar se bloquean tus fechas.
- **Calendario**: próximos servicios + **indisponibilidades** (vacaciones/bloqueo).
- **Mis documentos**: sube facturas, reportes o certificados.
- **Mi perfil**: tus datos y competencias.

## 5. Ciclo del servicio

```
Borrador → Publicada → Con interesados → En revisión → Asignada → Confirmada
→ En ejecución → Terminada → Factura recibida → Pagada      (o Cancelada)
```

## 6. Reglas clave

- Postular **no** asigna: el administrador siempre elige.
- El auditor solo ve/postula servicios donde tiene **todas** las competencias **vigentes**.
- El **pago se congela al asignar**.
- Sin **fechas cruzadas** ni **bloqueos de calendario** en la asignación.
- Todo queda en el **historial** (quién creó, publicó, asignó, canceló).
- Los auditores **no ven el nombre del cliente** hasta ser asignados.

## 7. Reportes

- Menú **Reportes**: indicadores, servicios por cliente, auditores más utilizados, certificaciones por vencer y **exportación CSV (Excel)**.
