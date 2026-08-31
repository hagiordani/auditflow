# Despliegue en Hostinger VPS + Dokploy

Guía específica para publicar **AuditFlow** en un VPS de Hostinger usando **Dokploy**.

> Prerrequisito: el código debe estar en un repositorio Git (GitHub/GitLab).
> Si aún no lo tienes subido, hazlo primero (ver sección 0).

---

## 0. Subir el código a GitHub

```bash
cd C:\Deepseek\Test-1
git remote add origin https://github.com/TU_USUARIO/auditflow.git
git push -u origin main
```

> Si el repo no existe, créalo vacío en GitHub (sin README) y vuelve a ejecutar el push.

---

## 1. Crear el VPS en Hostinger

1. **Hostinger → VPS → New VPS**.
2. Elige el plan (2 GB RAM mínimo) y **Ubuntu 24.04** (o 22.04).
3. Anota la **IP pública** y la **contraseña root**.
4. (Opcional) Ve a **Dominios → Apuntar dominio** y agrega el registro `A` de tu dominio → IP del VPS (si vas a usar dominio).

---

## 2. Conectar por SSH

```bash
ssh root@IP_DEL_VPS
```

Instala lo básico:

```bash
apt update && apt upgrade -y
apt install -y git curl
```

---

## 3. Instalar Dokploy

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

- Espera ~2-3 min. Al final muestra la **URL del panel** (`http://IP_DEL_VPS:3000`) y la **contraseña** de la cuenta `admin`.
- Entra al panel, crea/valida tu cuenta y **conecta el servidor** (Server → Add Server → el local, usando las claves que generó Dokploy).

---

## 4. Abrir el puerto del panel (Hostinger)

En el firewall del VPS (hPanel → VPS → Firewall) abre el puerto **3000** para el panel de Dokploy. *(Si usaste el firewall de Dokploy, adminístralo desde su panel.)*

---

## 5. Crear el proyecto en Dokploy

1. **Projects → Create Project** → nombre: `auditflow`.
2. **Add Service → Docker Compose**:
   - Nombre: `auditflow`
   - Source: **Github** → conecta tu cuenta → selecciona el repo `auditflow`.
   - Branch: `main`
   - Ruta del archivo de composición: `docker-compose.prod.yml`
   - Comando: (dejar vacío; la composición se levanta con `docker compose up`)
3. **Variables de entorno** (pestaña Environment): pega el contenido de `.env.production.example` con tus valores reales (genera `SECRET_KEY` con `openssl rand -hex 32`).
4. **Deploy**. Dokploy clona el repo, construye `backend` y `frontend` y levanta `db`, `api` y `web`.

---

## 6. Primer smoke test (sin dominio)

Con el compose, `web` publica el puerto `8080` del host:

```
http://IP_DEL_VPS:8080
```

Abre el puerto **8080** en el firewall del VPS. Deberías ver el login.

- Inicia sesión con el `ADMIN_EMAIL` / `ADMIN_PASSWORD` definidos.
- **Cambia la contraseña** del administrador en **Seguridad**.

---

## 7. Dominio + HTTPS (Let's Encrypt)

1. En Dokploy, sobre el servicio `auditflow` (o `web`): **Domain**.
2. Agrega tu dominio → **http://dominio** → puerto **80** (el contenedor `web`/nginx).
3. Dokploy emite el certificado **Let's Encrypt** automáticamente (HTTPS).
4. Actualiza `CORS_ORIGINS` a `["https://tudominio.com"]` y vuelve a hacer **Deploy**.
5. Puedes cerrar el puerto `8080` del firewall si ya no lo necesitas.

> El frontend ya proxifica `/api` al contenedor `api`, así que la app y la API
> quedan en el mismo origen (sin problemas de CORS en el navegador).

---

## 8. Verificación post-despliegue

```bash
# En el VPS
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs api --tail=50
curl -s http://localhost:8080/api/health
```

- Todos los contenedores `healthy`, `api/health` responde `{"status":"ok"}`.
- Sube un documento, crea un auditor y una oportunidad para probar el flujo completo.

---

## 9. Backups automáticos

```bash
./deploy/backup.sh /opt/auditflow/backups
# cron diario 02:30
crontab -e
30 2 * * * /opt/auditflow/backup.sh /opt/auditflow/backups >> /var/log/auditflow-backup.log 2>&1
```

---

## 10. Entornos

| Entorno | Rama | Composición | `ENVIRONMENT` |
|---|---|---|---|
| Producción | `main` | `docker-compose.prod.yml` | `production` |
| Staging | `develop` | `docker-compose.prod.yml` | `staging` |

Crea un servicio Dokploy para staging apuntando a `develop` con `ENVIRONMENT=staging`
y su propio dominio (la API valida los secretos igual en ambos).
