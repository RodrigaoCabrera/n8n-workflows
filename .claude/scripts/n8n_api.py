"""
n8n REST API Utility
Usage:
  python n8n_api.py get <workflow_id>                          # Fetch workflow JSON
  python n8n_api.py get-node <workflow_id> <node_name>        # Print node jsCode
  python n8n_api.py update-node <workflow_id> <node_name> <code.js>  # Update jsCode from file
  python n8n_api.py replace <workflow_id> <node_name> <old_str> <new_str>  # Inline string replace
  python n8n_api.py replace-file <workflow_id> <node_name> <old_file> <new_file>  # File-based replace

Reads N8N_API_KEY and N8N_API_URL from ~/.claude.json (project scope: n8n-workflows).
"""
import json, sys, urllib.request
from pathlib import Path


def load_credentials():
    cfg_path = Path.home() / ".claude.json"
    with open(cfg_path, encoding="utf-8") as f:
        cfg = json.load(f)
    for proj_path, proj_data in cfg.get("projects", {}).items():
        if "n8n-workflows" in proj_path:
            env = proj_data.get("mcpServers", {}).get("n8n-mcp", {}).get("env", {})
            key = env.get("N8N_API_KEY", "")
            if key:
                return key, env.get("N8N_API_URL", "http://localhost:5678")
    raise RuntimeError("N8N_API_KEY not found in ~/.claude.json")


def get_headers(api_key):
    return {"X-N8N-API-KEY": api_key, "Content-Type": "application/json"}


def fetch_workflow(api_url, headers, wf_id):
    req = urllib.request.Request(f"{api_url}/api/v1/workflows/{wf_id}", headers=headers)
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def save_workflow(api_url, headers, wf_id, wf):
    payload = json.dumps({
        "name":        wf["name"],
        "nodes":       wf["nodes"],
        "connections": wf["connections"],
        "settings":    wf.get("settings", {}),
        "staticData":  wf.get("staticData"),
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{api_url}/api/v1/workflows/{wf_id}",
        data=payload, method="PUT", headers=headers
    )
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def find_node(wf, node_name):
    for node in wf["nodes"]:
        if node["name"] == node_name:
            return node
    return None


# ── Commands ─────────────────────────────────────────────────────────────────

def cmd_get(api_url, headers, wf_id):
    wf = fetch_workflow(api_url, headers, wf_id)
    print(json.dumps(wf, indent=2, ensure_ascii=False))


def cmd_get_node(api_url, headers, wf_id, node_name):
    wf   = fetch_workflow(api_url, headers, wf_id)
    node = find_node(wf, node_name)
    if not node:
        print(f"ERROR: node '{node_name}' not found", file=sys.stderr)
        sys.exit(1)
    code = node.get("parameters", {}).get("jsCode", "")
    print(code)


def cmd_update_node(api_url, headers, wf_id, node_name, code_file):
    new_code = Path(code_file).read_text(encoding="utf-8")
    wf       = fetch_workflow(api_url, headers, wf_id)
    node     = find_node(wf, node_name)
    if not node:
        print(f"ERROR: node '{node_name}' not found", file=sys.stderr)
        sys.exit(1)
    node["parameters"]["jsCode"] = new_code
    result = save_workflow(api_url, headers, wf_id, wf)
    print(f"OK: '{node_name}' updated in '{result['name']}'")


def cmd_replace(api_url, headers, wf_id, node_name, old_str, new_str):
    wf   = fetch_workflow(api_url, headers, wf_id)
    node = find_node(wf, node_name)
    if not node:
        print(f"ERROR: node '{node_name}' not found", file=sys.stderr)
        sys.exit(1)
    code     = node["parameters"]["jsCode"]
    new_code = code.replace(old_str, new_str)
    if code == new_code:
        print("WARNING: old string not found — no changes made")
        sys.exit(1)
    node["parameters"]["jsCode"] = new_code
    result = save_workflow(api_url, headers, wf_id, wf)
    print(f"OK: replacement applied in '{node_name}' — saved to '{result['name']}'")


def cmd_replace_file(api_url, headers, wf_id, node_name, old_file, new_file):
    old_str = Path(old_file).read_text(encoding="utf-8")
    new_str = Path(new_file).read_text(encoding="utf-8")
    cmd_replace(api_url, headers, wf_id, node_name, old_str, new_str)


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    api_key, api_url = load_credentials()
    headers          = get_headers(api_key)
    cmd              = sys.argv[1]

    if cmd == "get" and len(sys.argv) == 3:
        cmd_get(api_url, headers, sys.argv[2])

    elif cmd == "get-node" and len(sys.argv) == 4:
        cmd_get_node(api_url, headers, sys.argv[2], sys.argv[3])

    elif cmd == "update-node" and len(sys.argv) == 5:
        cmd_update_node(api_url, headers, sys.argv[2], sys.argv[3], sys.argv[4])

    elif cmd == "replace" and len(sys.argv) == 6:
        cmd_replace(api_url, headers, sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])

    elif cmd == "replace-file" and len(sys.argv) == 6:
        cmd_replace_file(api_url, headers, sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])

    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
