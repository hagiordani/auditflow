"""Captura de pantallas de AuditFlow (manual de capacitación)."""

import os
import time

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
OUT = r"C:\Deepseek\Test-1\docs\capturas"
os.makedirs(OUT, exist_ok=True)

ADMIN = {"email": "admin@auditflow.local", "password": "Admin123!"}
AUDITOR = {"email": "maria.lopez@auditflow.local", "password": "MariaNueva123!"}

ADMIN_PAGES = [
    ("01-dashboard", "/"),
    ("02-oportunidades", "/opportunities"),
    ("03-nueva-oportunidad", "/opportunities/new"),
    ("04-personal", "/personal"),
    ("05-auditores", "/auditors"),
    ("06-clientes", "/clients"),
    ("07-usuarios", "/admin/users"),
    ("08-competencias", "/competencies"),
    ("09-calendario", "/calendar"),
    ("10-reportes", "/reports"),
]

AUDITOR_PAGES = [
    ("11-auditor-dashboard", "/"),
    ("12-auditor-oportunidades", "/auditor/opportunities"),
    ("13-auditor-servicios", "/auditor/assignments"),
    ("14-auditor-calendario", "/auditor/calendar"),
    ("15-auditor-perfil", "/auditor/profile"),
]


def login(page, cred):
    page.goto(f"{BASE}/login", wait_until="networkidle")
    page.fill("#email", cred["email"])
    page.fill("#password", cred["password"])
    page.click("button[type=submit]")
    page.wait_for_url("**/", timeout=15000)
    time.sleep(0.8)


def shot(page, name, url):
    page.goto(f"{BASE}{url}", wait_until="networkidle")
    time.sleep(0.8)
    page.screenshot(path=os.path.join(OUT, f"{name}.png"), full_page=False)
    print("capturada:", name)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1280, "height": 800}, device_scale_factor=1)
    page = ctx.new_page()

    # Admin
    try:
        login(page, ADMIN)
    except Exception as e:
        print("Login admin falló:", e)
        browser.close()
        raise

    # Portada de login (re-login sin sesión)
    ctx2 = browser.new_context(viewport={"width": 1280, "height": 800})
    p2 = ctx2.new_page()
    p2.goto(f"{BASE}/login", wait_until="networkidle")
    time.sleep(0.8)
    p2.screenshot(path=os.path.join(OUT, "00-login.png"))
    print("capturada: 00-login")
    ctx2.close()

    for name, url in ADMIN_PAGES:
        shot(page, name, url)

    # Auditor
    aud_ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    apage = aud_ctx.new_page()
    try:
        login(apage, AUDITOR)
    except Exception as e:
        print("Login auditor falló (se crea cuenta de auditor de prueba):", e)
        # crear auditor demo via API
        import requests

        admin = requests.post(
            f"{BASE}/api/auth/login", json=ADMIN
        ).json()
        h = {"Authorization": f"Bearer {admin['access_token']}"}
        requests.post(
            f"{BASE}/api/auditors",
            json={"email": "audi.demo@auditflow.local", "full_name": "Auditor Demo", "password": "AuditorDemo123!"},
            headers=h,
        )
        login(apage, {"email": "audi.demo@auditflow.local", "password": "AuditorDemo123!"})

    for name, url in AUDITOR_PAGES:
        shot(apage, name, url)

    browser.close()

print("Capturas en:", OUT)
