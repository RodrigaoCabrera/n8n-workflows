import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

LOG = Path(".claude/hook-debug.log")
LOG.parent.mkdir(parents=True, exist_ok=True)

def log(msg): 
    LOG.open("a", encoding="utf-8").write(f"{datetime.now()} - {msg}\n")

log("session-start ejecutado")

try:
    raw = sys.stdin.read()
    log(f"stdin recibido: {len(raw)} bytes")
    data = json.loads(raw) if raw.strip() else {}
except Exception as e:
    log(f"error leyendo stdin: {e}")
    data = {}

cwd = data.get("cwd", "")
log(f"cwd: {cwd}")

context_parts = []

# Contexto de sesión previa
try:
    context_file = Path(".claude/session-context.md")
    if context_file.exists() and context_file.stat().st_size > 0:
        log("cargando session-context.md")
        content = context_file.read_text(encoding="utf-8")
        content = content.replace("`", "'")
        context_parts.append("## Contexto de sesion anterior\n" + content)
    else:
        log("sin session-context.md previo")
except Exception as e:
    log(f"error leyendo context: {e}")

# Git info (solo si hay repo)
try:
    branch = subprocess.run(
        ["git", "branch", "--show-current"], capture_output=True, text=True, cwd=cwd
    )
    log(f"git returncode: {branch.returncode}")
    if branch.returncode == 0 and branch.stdout.strip():
        git_info = f"## Estado Git\nBranch: {branch.stdout.strip()}"
        status = subprocess.run(
            ["git", "status", "--short"], capture_output=True, text=True, cwd=cwd
        )
        if status.stdout.strip():
            git_info += f"\n{status.stdout.strip()}"
        else:
            git_info += "\nWorking tree limpio"
        context_parts.append(git_info)
except Exception as e:
    log(f"error git: {e}")

if context_parts:
    additional_context = "\n\n".join(context_parts)
    output = {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": additional_context
        }
    }
    log(f"enviando additionalContext: {len(additional_context)} chars")
    print(json.dumps(output))
else:
    log("sin contexto para enviar")

sys.exit(0)