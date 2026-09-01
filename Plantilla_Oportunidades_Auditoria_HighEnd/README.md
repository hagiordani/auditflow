# Plantilla — Oportunidades de Auditoría

Interfaz standalone inspirada en la propuesta visual de alta gama para el módulo de oportunidades.

## Archivos
- `index.html` — estructura y contenido.
- `styles.css` — sistema visual responsive.
- `app.js` — interacciones de filtros, búsqueda, calendario y modal.

## Ejecutar
Abre `index.html` directamente en el navegador.

## Integración
La plantilla está preparada para sustituir datos estáticos por datos reales de una API.
Los puntos principales son:
- listado de oportunidades
- filtros por estado
- búsqueda
- calendario
- creación de oportunidad
- detalle de oportunidad

Para producción conviene reemplazar el `alert()` del formulario por un POST a tu backend y generar las filas desde la respuesta de la API.
