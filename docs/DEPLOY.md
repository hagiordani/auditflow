# Despliegue de AuditFlow con Dokploy

## 1. Requisitos del servidor

- Linux (Ubuntu 22.04+ recomendado), 2 GB RAM mínimo
- Docker y Docker Compose instalados
- Dominio con registro DNS apuntando al servidor (p. ej. `auditflow.tudominio.com`)

## 2. Instalar Dokploy

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

Abre el panel en `http://IP:3000`, crea la cuenta administradora y conecta el servidor.

## 3. Crear el proyecto en Dokploy

1. **Projects → Create Project** → nombre `auditflow`.
2. **Create Service → Application**:
   - Nombre: `auditflow`
   - Tipo de fuente: **Docker Compose**
   - Repositorio: tu repo (rama `main`)
   - Archivo de composición: `docker-compose.prod.yml`
   - Dominio: `auditflow.tudominio.com` (Dokploy genera el certificado Let's Encrypt automáticamente)
   - Puerto de la aplicación: `80` (el contenedor `web`/nginx)

## 4. Variables de entorno (pestaña Environment del servicio)

| Variable | Valor |
|---|---|
| `POSTGRES_USER` | `auditflow` |
| `POSTGRES_PASSWORD` | clave fuerte generada |
| `POSTGRES_DB` | `auditflow` |
| `ENVIRONMENT` | `production` |
| `SECRET_KEY` | **generar**: `openssl rand -hex 32` (la API se niega a arrancar si es débil) |
| `ADMIN_EMAIL` | correo del administrador |
| `ADMIN_PASSWORD` | contraseña inicial fuerte (cambiarla tras el primer login) |
| `ADMIN_NAME` | nombre del administrador |
| `CORS_ORIGINS` | `["https://auditflow.tudominio.com"]` |

> La API **no arranca** en producción con la `SECRET_KEY` de ejemplo ni con
> `Admin123!` — es una validación intencional de seguridad.

## 5. Primer despliegue

1. Botón **Deploy**. La API ejecuta las migraciones de Alembic al iniciar y crea el primer administrador.
2. Verifica `https://auditflow.tudominio.com` e inicia sesión.
3. **Cambia la contraseña del administrador** desde *Seguridad*.

## 6. Entornos

| Entorno | Rama | Composición | Dominio |
|---|---|---|---|
| Producción | `main` | `docker-compose.prod.yml` | `auditflow.tudominio.com` |
| Staging | `staging` | `docker-compose.prod.yml` con `ENVIRONMENT=staging` | `auditflow-staging.tudominio.com` |

## 7. Backups

```bash
# Manual
./deploy/backup.sh /opt/auditflow/backups

# Automático (diario 02:30)
crontab -e
30 2 * * * /opt/auditflow/deploy/backup.sh /opt/auditflow/backups >> /var/log/auditflow-backup.log 2>&1
```

El script vuelca PostgreSQL + los documentos subidos y conserva 14 días de respaldos.

### Restaurar

```bash
gunzip -c backups/20260101_023000/database.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U auditflow auditflow
tar xzf backups/20260101_023000/uploads.tar.gz  # montar en el volumen uploads_data
```

## 8. Notas de seguridad

- El TLS lo termina el proxy de Dokploy (Let's Encrypt); el contenedor expone solo HTTP interno.
- PostgreSQL **no** publica el puerto 5432 (solo red interna de Compose).
- Los tokens JWT expiran según `ACCESS_TOKEN_EXPIRE_MINUTES` (480 min por defecto).
- El login tiene **rate limiting** por IP (10 fallos / 5 min; en memoria — con múltiples réplicas migrar a Redis).
- Bitácora completa de acciones en `audit_logs`; el CSV/API de reportes es de solo lectura para supervisor.
- Archivos subidos en volumen privado `uploads_data` (migrar a S3/R2 en fase 2 si se requiere).
