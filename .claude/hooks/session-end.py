import json
import sys
from datetime import datetime
from pathlib import Path

import requests

LOG = Path(".claude/hook-debug.log")
LOG.parent.mkdir(parents=True, exist_ok=True)


def log(msg):
    LOG.open("a", encoding="utf-8").write(f"{datetime.now()} - {msg}\n")


log("session-end ejecutado")

# Leer stdin
try:
    raw = sys.stdin.read()
    log(f"stdin recibido: {len(raw)} bytes")
    data = json.loads(raw) if raw.strip() else {}
except Exception as e:
    log(f"error leyendo stdin: {e}")
    data = {}

transcript_path = data.get("transcript_path", "")
log(f"transcript_path: {transcript_path}")

if not transcript_path or not Path(transcript_path).exists():
    log("sin transcript valido, saliendo")
    sys.exit(0)

transcript_snippet = Path(transcript_path).read_text(errors="ignore")[-4000:]

prompt = f"""Resume esta sesion de trabajo de forma estructurada y concisa:
- Que se estaba construyendo:
- Que esta completado:
- Que falta hacer:
- Decisiones tecnicas importantes:
- Archivos y rutas clave:

Transcript:
{transcript_snippet}"""

MODELS = ["minimax-m2.5:cloud", "gpt-oss:120b-cloud", "deepseek-v3.1:671b-cloud"]
MAX_CHARS = 6000
CONTEXT_FILE = Path(".claude/session-context.md")

# Generar resumen de la sesión actual
summary = None
for model in MODELS:
    try:
        log(f"intentando con {model}")
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": model, "prompt": prompt, "stream": False},
            timeout=120,
        )
        log(f"status {model}: {response.status_code}")
        if response.ok:
            summary = response.json().get("response", "").strip()
            log(f"summary length: {len(summary)}")
            if summary:
                break
    except Exception as e:
        log(f"error con {model}: {e}")
        continue

if not summary:
    log("no se obtuvo summary, saliendo")
    sys.exit(0)

# Leer contexto acumulado anterior
previous = CONTEXT_FILE.read_text(encoding="utf-8") if CONTEXT_FILE.exists() else ""

# Combinar contexto anterior + sesión actual
combined = f"{previous}\n\n---\n## Sesion {datetime.now().strftime('%Y-%m-%d %H:%M')}\n{summary}".strip()

# Si supera el límite, compactar todo en uno
if len(combined) > MAX_CHARS:
    log(f"contexto supera {MAX_CHARS} chars ({len(combined)}), compactando...")
    compact_prompt = f"""Tenes este historial de sesiones de trabajo. Compactalo en un unico resumen estructurado manteniendo toda la informacion relevante: decisiones tecnicas, estado actual, pendientes y archivos clave. Descarta detalles repetidos o irrelevantes.

{combined}"""

    compacted = None
    for model in MODELS:
        try:
            log(f"compactando con {model}")
            response = requests.post(
                "http://localhost:11434/api/generate",
                json={"model": model, "prompt": compact_prompt, "stream": False},
                timeout=120,
            )
            if response.ok:
                compacted = response.json().get("response", "").strip()
                if compacted:
                    log(f"compactado OK, nuevo length: {len(compacted)}")
                    combined = compacted
                    break
        except Exception as e:
            log(f"error compactando con {model}: {e}")
            continue

    if not compacted:
        log("no se pudo compactar, guardando sin compactar")

CONTEXT_FILE.write_text(combined, encoding="utf-8")
log("session-context.md escrito OK")

sys.exit(0)
