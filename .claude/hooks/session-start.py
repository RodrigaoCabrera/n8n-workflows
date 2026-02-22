import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Debug log en ruta que funciona en Windows/Git Bash
Path(".claude/hook-debug.log").open("a").write(
    f"{datetime.now()} - session-start ejecutado\n"
)

data = json.load(sys.stdin)
cwd = data.get("cwd", "")

output = []

# Contexto de sesión previa
context_file = Path(".claude/session-context.md")
if context_file.exists() and context_file.stat().st_size > 0:
    output.append("## Contexto de sesión anterior")
    output.append(context_file.read_text())
    output.append("")

# Git info (solo si hay repo)
try:
    branch = subprocess.run(
        ["git", "branch", "--show-current"], capture_output=True, text=True, cwd=cwd
    )
    if branch.returncode == 0 and branch.stdout.strip():
        output.append("## Estado Git")
        output.append(f"Branch: {branch.stdout.strip()}")
        status = subprocess.run(
            ["git", "status", "--short"], capture_output=True, text=True, cwd=cwd
        )
        if status.stdout.strip():
            output.append(status.stdout.strip())
        else:
            output.append("Working tree limpio")
        output.append("")
except Exception:
    pass

if output:
    print("\n".join(output))

sys.exit(0)
