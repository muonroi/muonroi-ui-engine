#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Parity-check live UI engine catalog against committed snapshots.

Usage:
  ./scripts/parity-check.sh \
    --be-url http://localhost:5000 \
    --token <bearer-token> \
    --snapshot-dir ./snapshots/ui-engine \
    [--update-snapshot]
EOF
}

BE_URL=""
TOKEN=""
SNAPSHOT_DIR=""
UPDATE_SNAPSHOT="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --be-url)
      BE_URL="${2:-}"
      shift 2
      ;;
    --token)
      TOKEN="${2:-}"
      shift 2
      ;;
    --snapshot-dir)
      SNAPSHOT_DIR="${2:-}"
      shift 2
      ;;
    --update-snapshot)
      UPDATE_SNAPSHOT="true"
      shift 1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${BE_URL}" || -z "${TOKEN}" || -z "${SNAPSHOT_DIR}" ]]; then
  echo "--be-url, --token and --snapshot-dir are required." >&2
  exit 1
fi

if [[ "${TOKEN}" != Bearer* ]]; then
  TOKEN="Bearer ${TOKEN}"
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

mkdir -p "${SNAPSHOT_DIR}"

fetch() {
  local endpoint="$1"
  local out_file="$2"
  curl -fsSL -H "Authorization: ${TOKEN}" "${BE_URL%/}${endpoint}" -o "${out_file}"
}

fetch "/api/v1/ui-engine/catalog/apis" "${TMP_DIR}/apis.json"
fetch "/api/v1/ui-engine/catalog/rules" "${TMP_DIR}/rules.json"
fetch "/api/v1/ui-engine/catalog/bindings" "${TMP_DIR}/bindings.json"
fetch "/api/v1/ui-engine/catalog/graph" "${TMP_DIR}/graph.json"

python - <<'PY' "${TMP_DIR}" "${SNAPSHOT_DIR}" "${UPDATE_SNAPSHOT}"
import json
import pathlib
import sys

live_dir = pathlib.Path(sys.argv[1])
snapshot_dir = pathlib.Path(sys.argv[2])
update = sys.argv[3].lower() == "true"


def unwrap(payload):
    if isinstance(payload, dict) and "result" in payload:
        return payload["result"]
    return payload


def load_json(path: pathlib.Path):
    return unwrap(json.loads(path.read_text(encoding="utf-8")))

live = {
    "apis": load_json(live_dir / "apis.json"),
    "rules": load_json(live_dir / "rules.json"),
    "bindings": load_json(live_dir / "bindings.json"),
    "graph": load_json(live_dir / "graph.json"),
}

errors: list[str] = []
warnings: list[str] = []

snapshot_paths = {
    name: snapshot_dir / f"{name}.snapshot.json" for name in live.keys()
}

if update:
    for name, payload in live.items():
        snapshot_paths[name].write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("[parity-check] snapshots updated")
    sys.exit(0)

snapshots = {}
for name, path in snapshot_paths.items():
    if not path.exists():
        warnings.append(f"Snapshot missing: {path}")
        snapshots[name] = None
    else:
        snapshots[name] = json.loads(path.read_text(encoding="utf-8"))

live_rules = live["rules"] if isinstance(live["rules"], list) else []
snap_rules = snapshots.get("rules") if isinstance(snapshots.get("rules"), list) else []

live_rule_codes = {str(item.get("code", "")) for item in live_rules}
snap_rule_codes = {str(item.get("code", "")) for item in snap_rules}

added_rules = sorted(live_rule_codes - snap_rule_codes)
removed_rules = sorted(snap_rule_codes - live_rule_codes)
if added_rules:
    warnings.append(f"Rule codes added: {', '.join(added_rules[:20])}")
if removed_rules:
    warnings.append(f"Rule codes removed: {', '.join(removed_rules[:20])}")

live_contexts = {str(item.get("contextType", "")) for item in live_rules}
snap_contexts = {str(item.get("contextType", "")) for item in snap_rules}
if live_contexts != snap_contexts and snap_contexts:
    errors.append("Context type set changed between live and snapshot.")

live_bindings = live["bindings"] if isinstance(live["bindings"], list) else []
snap_bindings = snapshots.get("bindings") if isinstance(snapshots.get("bindings"), list) else []
live_endpoints = {f"{item.get('httpMethod','GET')} {item.get('endpointRoute','/')}" for item in live_bindings}
snap_endpoints = {f"{item.get('httpMethod','GET')} {item.get('endpointRoute','/')}" for item in snap_bindings}
if live_endpoints - snap_endpoints:
    warnings.append("Binding endpoints added: " + ", ".join(sorted(live_endpoints - snap_endpoints)[:20]))
if snap_endpoints - live_endpoints:
    warnings.append("Binding endpoints removed: " + ", ".join(sorted(snap_endpoints - live_endpoints)[:20]))


def depends_map(items):
    result = {}
    for item in items:
        code = str(item.get("code", ""))
        deps = [str(x) for x in item.get("dependsOn", []) if str(x)]
        result[code] = sorted(deps)
    return result

if snap_rules:
    if depends_map(live_rules) != depends_map(snap_rules):
        errors.append("DependsOn graph changed from snapshot.")

print("[parity-check] summary")
print(f"  warnings: {len(warnings)}")
print(f"  errors:   {len(errors)}")
for message in warnings:
    print(f"  WARN  {message}")
for message in errors:
    print(f"  ERROR {message}")

if errors:
    sys.exit(1)
PY
