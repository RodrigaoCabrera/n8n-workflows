import json
import sys
from datetime import datetime
from pathlib import Path
import requests

LOG = Path(".claude/hook-debug.log")
LOG.parent.mkdir(parents=True, exist_ok=True)

def log(msg):
    LOG.open("a", encoding="utf-8").write(f"{datetime.now()} - {msg}\n")

MODELS = ["minimax-m2.5:cloud", "gpt-oss:120b-cloud", "deepseek-v3.1:671b-cloud"]
MAX_CHARS = 6000
CONTEXT_FILE = Path(".claude/session-context.md")

def sanitize(text):
    return text.replace("`", "'")

def extract_messages(transcript_path):
    lines = Path(transcript_path).read_text(errors="ignore").strip().split("\n")
    messages = []
    for line in lines:
        try:
            obj = json.loads(line)
            if obj.get("type") not in ("user", "assistant"):
                continue
            role = obj.get("message", {}).get("role", "")
            content = obj.get("message", {}).get("content", "")
            if isinstance(content, str) and content.strip():
                if not content.startswith("<command") and not content.startswith("Caveat:") and len(content) < 3000:
                    messages.append(f"[{role}]: {content[:600]}")
            elif isinstance(content, list):
                for c in content:
                    if isinstance(c, dict) and c.get("type") == "text":
                        text = c.get("text", "").strip()
                        if text and len(text) > 20 and len(text) < 3000:
                            messages.append(f"[{role}]: {text[:600]}")
        except:
            continue

    log(f"mensajes extraidos: {len(messages)}")

    # Distribuir: primeros 5 + 5 del medio + ultimos 20
    if len(messages) <= 30:
        selected = messages
    else:
        first = messages[:5]
        last = messages[-20:]
        mid_start = 5
        mid_end = len(messages) - 20
        step = max(1, (mid_end - mid_start) // 5)
        middle = messages[mid_start:mid_end:step][:5]
        selected = first + middle + last

    log(f"mensajes seleccionados: {len(selected)}")
    return "\n---\n".join(selected)

def generate(prompt):
    for model in MODELS:
        try:
            log(f"intentando con {model}")
            response = requests.post(
                "http://localhost:11434/api/generate",
                json={"model": model, "prompt": prompt, "stream": False},
                timeout=60,
            )
            log(f"status {model}: {response.status_code}")
            if response.ok:
                result = response.json().get("response", "").strip()
                log(f"resultado {model}: {len(result)} chars")
                if result:
                    return result
        except Exception as e:
            log(f"error con {model}: {e}")
            continue
    return None

def run(transcript_path):
    log(f"transcript_path: {transcript_path}")

    if not transcript_path or not Path(transcript_path).exists():
        log("sin transcript valido, saliendo")
        return

    conversation = extract_messages(transcript_path)
    if not conversation.strip():
        log("no se extrajeron mensajes utiles, saliendo")
        return

    prompt = f"""Sos un asistente que genera resumenes de sesiones de trabajo. 
IMPORTANTE: Solo responde con texto plano estructurado. NO uses tools, NO hagas fetch, NO ejecutes codigo, NO uses XML ni tags especiales.

Resume esta conversacion en el siguiente formato exacto:

## Que se estaba construyendo
[texto]

## Que esta completado
[texto]

## Que falta hacer
[texto]

## Decisiones tecnicas importantes
[texto]

## Archivos y rutas clave
[texto]

## Bugs pendientes
[texto]

Conversacion a resumir:
{conversation}"""

    summary = generate(prompt)
    if not summary:
        log("no se obtuvo summary, saliendo")
        return

    log(f"summary generado: {len(summary)} chars")

    previous = CONTEXT_FILE.read_text(encoding="utf-8") if CONTEXT_FILE.exists() else ""
    combined = f"{previous}\n\n---\n## Sesion {datetime.now().strftime('%Y-%m-%d %H:%M')}\n{summary}".strip()

    if len(combined) > MAX_CHARS:
        log(f"contexto supera {MAX_CHARS} chars ({len(combined)}), compactando...")
        compact_prompt = f"""Sos un asistente que compacta historiales de trabajo.
IMPORTANTE: Solo responde con texto plano estructurado. NO uses tools, NO hagas fetch, NO ejecutes codigo, NO uses XML ni tags especiales.

Compacta este historial en un unico resumen manteniendo: decisiones tecnicas, estado actual, pendientes y archivos clave. Descarta detalles repetidos.

Usa este formato:

## Proyecto
[texto]

## Estado Actual
[texto]

## Decisiones Tecnicas
[texto]

## Bugs Pendientes
[texto]

## Archivos Clave
[texto]

## Proximos Pasos
[texto]

Historial:
{combined}"""
        compacted = generate(compact_prompt)
        if compacted:
            log(f"compactado OK: {len(compacted)} chars")
            combined = compacted
        else:
            log("no se pudo compactar, guardando sin compactar")

    CONTEXT_FILE.write_text(sanitize(combined), encoding="utf-8")
    log("session-context.md escrito OK")


log("session-end ejecutado")

if len(sys.argv) > 1:
    log("modo manual")
    run(sys.argv[1])
else:
    try:
        raw = sys.stdin.read()
        log(f"stdin recibido: {len(raw)} bytes")
        data = json.loads(raw) if raw.strip() else {}
    except Exception as e:
        log(f"error leyendo stdin: {e}")
        data = {}
    run(data.get("transcript_path", ""))

sys.exit(0)