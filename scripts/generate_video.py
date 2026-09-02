"""Genera un video (MP4) del Manual de Capacitación de AuditFlow.

Construye una presentación (slideshow) a partir de las capturas reales en
docs/capturas/*.png, con barra de título (arriba), contador y leyenda (abajo),
y añade narración de voz en español usando la API SAPI de Windows
(voice "Microsoft Sabina Desktop - Spanish (Mexico)").

Salida:
  docs/AuditFlow_Manual_Capacitacion_video.mp4
  scripts/tmp_audio/*.wav   (narración, si está disponible)
"""

import os
import subprocess
import textwrap

# --------------------------------------------------------------------------
# Configuración
# --------------------------------------------------------------------------
ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
CAP = os.path.join(ROOT, "docs", "capturas")
TMP = os.path.join(os.path.dirname(__file__), "tmp_audio")
OUT = os.path.join(ROOT, "docs", "AuditFlow_Manual_Capacitacion_video.mp4")

W, H = 1280, 800
FPS = 10
MIN_SECONDS = 5.0
PAD_SECONDS = 1.5      # colchon tras la narracion en cada slide (segundos)
GAP_SECONDS = 0.6      # silencio entre slides en el audio
VOICE_NAME = "Microsoft Sabina Desktop - Spanish (Mexico)"

# Título, leyenda (voz) y captura. El orden coincide con el manual.
# Si el slide no tiene captura propia, se usa un fallback.
SLIDES = [
    ("01 · Acceso al sistema", "Entra a la URL e inicia sesión con tu correo y contraseña. Tras diez intentos fallidos, la cuenta se bloquea cinco minutos.", "00-login.png"),
    ("02 · Perfiles", "Existen dos perfiles: el Administrador, que es el centro de control, y el Auditor, que solo ve su agenda y las oportunidades compatibles.", None),
    ("03 · Administrador · Centro de control", "El resumen ejecutivo muestra indicadores clicables, el donut de estados y el rendimiento de auditores y clientes.", "01-dashboard.png"),
    ("04 · Administrador · Oportunidades", "La vista por defecto es en tarjetas, con folio, estado, título, cliente, ubicación, fechas y pago.", "02-oportunidades.png"),
    ("05 · Administrador · Nueva oportunidad", "Pulsa Nueva oportunidad para crear el servicio en Borrador. Cuando esté listo, se publica.", "03-nueva-oportunidad.png"),
    ("06 · Administrador · Personal técnico", "El catálogo de personal agrupa evaluadores, instructores, inspectores y examinadores, con puestos, áreas y correos.", "04-personal.png"),
    ("07 · Administrador · Auditores", "Se da de alta a los auditores externos y se les asigna su matriz de competencias, con nivel y vigencia.", "05-auditores.png"),
    ("08 · Administrador · Clientes", "Catálogo de clientes.", "06-clientes.png"),
    ("09 · Administrador · Usuarios", "Se gestionan las cuentas de acceso, se cambia el rol y se activa o desactiva cada usuario.", "07-usuarios.png"),
    ("10 · Administrador · Competencias", "Catálogo de competencias.", "08-competencias.png"),
    ("11 · Administrador · Calendario", "Calendario de servicios.", "09-calendario.png"),
    ("12 · Administrador · Reportes", "Indicadores, servicios por cliente y por auditor, certificaciones por vencer, mapa de México, evolución y exportación a CSV.", "10-reportes.png"),
    ("13 · Auditor · Mi agenda", "El dashboard del auditor resume sus servicios y sus estados.", "11-auditor-dashboard.png"),
    ("14 · Auditor · Oportunidades", "El auditor solo ve los servicios compatibles: con las competencias vigentes y las fechas libres.", "12-auditor-oportunidades.png"),
    ("15 · Auditor · Mis servicios", "El auditor confirma o rechaza la asignación. Al confirmar, se bloquean las fechas.", "13-auditor-servicios.png"),
    ("16 · Auditor · Mi perfil", "El perfil del auditor, con sus datos y competencias.", "15-auditor-perfil.png"),
]

FALLBACK_IMG = "01-dashboard.png"
BRAND = "AuditFlow · Manual de Capacitación"


def log(msg):
    print("[video]", msg)


def load_image(name):
    from PIL import Image
    if not os.path.exists(os.path.join(CAP, name)):
        name = FALLBACK_IMG
        log(f"fallback imagen: {name}")
    return Image.open(os.path.join(CAP, name)).convert("RGB").resize((W, H), Image.LANCZOS)


def overlay(img_pil, title, caption, idx):
    """Pinta barra superior (título + contador) y barra inferior (leyenda)."""
    from PIL import ImageDraw, ImageFont
    img = img_pil.copy()
    draw = ImageDraw.Draw(img, "RGBA")

    def font(size):
        for cand in (r"C:\Windows\Fonts\arialbd.ttf", r"C:\Windows\Fonts\arial.ttf"):
            if os.path.exists(cand):
                return ImageFont.truetype(cand, size)
        return ImageFont.load_default()

    # ---- barra superior ----
    top_h = 64
    draw.rectangle([0, 0, W, top_h], fill=(10, 40, 80, 190))
    draw.rectangle([0, top_h - 5, W, top_h], fill=(20, 90, 150, 255))
    f_title = font(27)
    f_brand = font(16)
    draw.text((24, 16), title, font=f_title, fill=(255, 255, 255))
    tw = draw.textlength(title, font=f_title)
    draw.text((24 + tw + 14, 25), BRAND, font=f_brand, fill=(160, 200, 255))
    counter = f"{idx + 1} / {len(SLIDES)}"
    cw = draw.textlength(counter, font=f_title)
    draw.text((W - cw - 24, 18), counter, font=f_title, fill=(200, 220, 255))

    # ---- barra inferior ----
    lines = textwrap.wrap(caption, width=96)
    bot_h = 36 + 40 * len(lines)
    draw.rectangle([0, H - bot_h, W, H], fill=(8, 28, 56, 205))
    draw.rectangle([0, H - bot_h, W, H - bot_h + 5], fill=(20, 90, 150, 255))
    f_cap = font(23)
    y = H - bot_h + 26
    for line in lines:
        draw.text((24, y), line, font=f_cap, fill=(240, 246, 255))
        y += 40
    return img


# --------------------------------------------------------------------------
# Narración con SAPI de Windows (rápida y estable)
# --------------------------------------------------------------------------
def narrate_sapi():
    """Genera un .wav por slide usando SpeechSynthesizer. Devuelve rutas o None."""
    os.makedirs(TMP, exist_ok=True)
    ps1 = os.path.join(TMP, "gen_narr.ps1")
    lines = [
        "$ErrorActionPreference = 'Stop'",
        "Add-Type -AssemblyName System.Speech",
        f"$v = '{VOICE_NAME}'",
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer",
        "try { $s.SelectVoice($v) } catch { $s.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::Female) }",
        "$s.Rate = 0",
        "$s.Volume = 100",
    ]
    for i, (title, caption, _img) in enumerate(SLIDES):
        # escapar comillas simples duplicándolas
        txt = caption.replace("'", "''")
        out = os.path.join(TMP, f"slide_{i:02d}.wav").replace("\\", "\\\\").replace("'", "''")
        lines.append(f"$s.SetOutputToWaveFile('{out}')")
        lines.append(f"$s.Speak('{txt}')")
        lines.append("$s.SetOutputToNull()")
    lines.append("$s.Dispose()")
    lines.append("Write-Output 'DONE'")
    with open(ps1, "w", encoding="utf-8-sig", newline="\n") as f:
        f.write("\n".join(lines) + "\n")

    try:
        r = subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1],
            capture_output=True, text=True, timeout=300,
        )
        if "DONE" not in (r.stdout or ""):
            log("SAPI narracion: DONE no encontrado. " + (r.stderr[-300:] if r.stderr else ""))
            return [None] * len(SLIDES)
    except Exception as e:
        log(f"SAPI narracion fallo: {e}")
        return [None] * len(SLIDES)

    paths = []
    for i, (_, _, _img) in enumerate(SLIDES):
        w = os.path.join(TMP, f"slide_{i:02d}.wav")
        if os.path.exists(w) and os.path.getsize(w) > 0:
            paths.append(w)
        else:
            paths.append(None)
    n = sum(1 for p in paths if p)
    log(f"narracion generada: {n}/{len(SLIDES)} slides")
    return paths


def wav_duration(path):
    import wave
    if not path or not os.path.exists(path):
        return None
    try:
        with wave.open(path, "rb") as w:
            fr = w.getframerate()
            return w.getnframes() / fr if fr else None
    except Exception:
        return None


# --------------------------------------------------------------------------
# Construcción del video
# --------------------------------------------------------------------------
def build_video(durations):
    import imageio.v2 as imageio
    import numpy as np
    writer = imageio.get_writer(OUT, fps=FPS, macro_block_size=None, codec="libx264")
    for idx, (title, caption, imgname) in enumerate(SLIDES):
        dur = durations[idx] if durations[idx] else MIN_SECONDS
        dur = max(dur, MIN_SECONDS)
        frames = int(round(dur * FPS))
        img = load_image(imgname or FALLBACK_IMG)
        frame = overlay(img, title, caption, idx)
        arr = np.asarray(frame)
        for _ in range(frames):
            writer.append_data(arr)
        log(f"slide {idx + 1} ({imgname or FALLBACK_IMG}) -> {dur:.1f}s")
    writer.close()


def find_ffmpeg():
    for cand in [
        r"C:\Deepseek\Test-1\backend\.venv\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe",
    ]:
        if os.path.exists(cand):
            return cand
    import shutil
    return shutil.which("ffmpeg")


def build_audio(paths):
    """Concatena los wav en un solo m4a."""
    ffmpeg = find_ffmpeg()
    files = [p for p in paths if p]
    if not ffmpeg or not files:
        return None
    concat_list = os.path.join(TMP, "concat.txt")
    with open(concat_list, "w", encoding="utf-8") as f:
        for p in files:
            f.write(f"file '{os.path.abspath(p)}'\n")
    audio_out = os.path.join(ROOT, "docs", "man_cap_narracion.m4a")
    cmd = [ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", concat_list,
           "-af", "apad=pad_dur=0.4", "-c:a", "aac", "-b:a", "160k", audio_out]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        log("ffmpeg audio: " + (r.stderr[-400:] if r.stderr else ""))
        return None
    log("audio m4a: " + audio_out)
    return audio_out


def mux(video, audio):
    ffmpeg = find_ffmpeg()
    if not ffmpeg or not audio:
        return
    tmp = OUT + ".tmp.mp4"
    r = subprocess.run([ffmpeg, "-y", "-i", video, "-i", audio,
                        "-c:v", "copy", "-c:a", "aac", "-shortest", tmp],
                       capture_output=True, text=True)
    if r.returncode == 0 and os.path.exists(tmp):
        os.replace(tmp, video)
        log("video + narración fusionados")
    else:
        log("mux fallo: " + (r.stderr[-300:] if r.stderr else ""))


def main():
    log(f"capturas en: {CAP}")
    paths = narrate_sapi()
    durations = [wav_duration(p) for p in paths]
    build_video(durations)
    audio = build_audio(paths)
    if audio:
        mux(OUT, audio)
    size = os.path.getsize(OUT)
    log(f"listo: {OUT} ({size / 1024 / 1024:.1f} MB)")


if __name__ == "__main__":
    main()
