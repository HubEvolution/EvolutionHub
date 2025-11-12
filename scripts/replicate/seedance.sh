#!/usr/bin/env bash
set -euo pipefail

# Seedance 1 Pro Fast (bytedance/seedance-1-pro-fast) via Replicate
# - Always overrides REPLICATE_API_TOKEN from .env → then .env.local
# - Inputs via env (all optional unless noted):
#   PROMPT (required unless PROMPT_FILE) | PROMPT_FILE
#   RESOLUTION=720p | ASPECT_RATIO=16:9 | FPS=24 | DURATION=5 | CAMERA_FIXED=false | SEED=""
#   IMAGE="" (image-to-video)
#   REPORT_DIR=reports/replicate/<UTC>
#
# Requires: curl, jq

MODEL="bytedance/seedance-1-pro-fast"
API_BASE="https://api.replicate.com/v1"

# Resolve repo root and always override REPLICATE_API_TOKEN from dotenv files (.env then .env.local)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd)"
try_load_token() {
  local file="$1"; [ -f "$file" ] || return 1
  local line
  line="$(grep -E '^[[:space:]]*(export[[:space:]]+)?REPLICATE_API_TOKEN[[:space:]]*=' "$file" | tail -n1 || true)"
  [ -n "$line" ] || return 1
  local val="${line#*=}"
  val="$(printf '%s' "$val" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -E -e 's/[[:space:]]+#.*$//')"
  if [[ "$val" == \"*\" && "$val" == *\" ]]; then
    val="${val#\"}"; val="${val%\"}"
  elif [[ "$val" == \'*\' && "$val" == *\' ]]; then
    val="${val#\'}"; val="${val%\'}"
  fi
  if [ -n "$val" ]; then export REPLICATE_API_TOKEN="$val"; return 0; fi
  return 1
}
try_load_token "$ROOT/.env" || true
try_load_token "$ROOT/.env.local" || true

require_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1" >&2; exit 1; }; }
require_env() { local n="$1"; [ -n "${!n:-}" ] || { echo "Missing env: $n" >&2; exit 1; }; }
now_utc() { date -u +%Y%m%dT%H%M%SZ; }
make_report_dir() { local base="${REPORT_DIR:-}"; [ -n "$base" ] || base="reports/replicate/$(now_utc)"; mkdir -p "$base"; echo "$base"; }

fetch_latest_version() {
  local model="$1"
  local owner="${model%%/*}"; local name="${model#*/}"
  if [ -n "$owner" ] && [ -n "$name" ] && [ "$owner" != "$name" ]; then
    local meta
    meta=$(curl -s -H "Authorization: Token $REPLICATE_API_TOKEN" "$API_BASE/models/$owner/$name" || true)
    if [ -n "$meta" ] && [ "$meta" != "null" ]; then
      local id
      id=$(printf '%s' "$meta" | jq -r '.latest_version.id // .versions[0].id // empty')
      if [ -n "$id" ]; then echo "$id"; return 0; fi
    fi
  fi
  curl -s -H "Authorization: Token $REPLICATE_API_TOKEN" \
    "$API_BASE/models/$model/versions" | jq -r '.results[0].id'
}

token_len() { local v="${REPLICATE_API_TOKEN:-}"; echo "${#v}"; }

build_input_json() {
  local prompt_val="${PROMPT:-}"
  if [ -n "${PROMPT_FILE:-}" ]; then
    [ -f "$PROMPT_FILE" ] || { echo "Prompt file not found: $PROMPT_FILE" >&2; exit 1; }
    prompt_val="$(cat "$PROMPT_FILE")"
  fi
  if [ -z "$prompt_val" ]; then
    echo "Prompt is required (PROMPT or PROMPT_FILE)." >&2; exit 2
  fi

  local resolution="${RESOLUTION:-720p}"
  local ar="${ASPECT_RATIO:-16:9}"
  local fps="${FPS:-24}"
  local duration="${DURATION:-5}"
  local camera_fixed="${CAMERA_FIXED:-false}"
  local seed="${SEED:-}"
  local image="${IMAGE:-}"

  # Build JSON, include only non-empty fields; booleans handled via jq
  jq -n \
    --arg prompt "$prompt_val" \
    --arg resolution "$resolution" \
    --arg ar "$ar" \
    --arg fps_str "${fps}" \
    --arg duration_str "${duration}" \
    --argjson camera_fixed "$( [ "${camera_fixed}" = "true" ] && echo true || echo false )" \
    --arg seed "$seed" \
    --arg image "$image" \
    '{prompt: $prompt}
     | (if ($resolution|length)>0 then .resolution = $resolution else . end)
     | (if ($ar|length)>0 then .aspect_ratio = $ar else . end)
     | (if ($fps_str|tonumber?) != null then .fps = ($fps_str|tonumber) else . end)
     | (if ($duration_str|tonumber?) != null then .duration = ($duration_str|tonumber) else . end)
     | (.camera_fixed = $camera_fixed)
     | (if ($seed|length)>0 then (.seed = ( ($seed|tonumber?) // $seed )) else . end)
     | (if ($image|length)>0 then .image = $image else . end)'
}

start_prediction() {
  local version="$1"; local input_json="$2"
  local body; body=$(jq -n --arg ver "$version" --argjson inp "$input_json" '{version: $ver, input: $inp}')
  curl -s -X POST "$API_BASE/predictions" \
    -H "Authorization: Token $REPLICATE_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$body" | tee /dev/stderr | jq -r '.id'
}

poll_prediction() {
  local id="$1"; local out="$2"
  while true; do
    local R; R=$(curl -s -H "Authorization: Token $REPLICATE_API_TOKEN" "$API_BASE/predictions/$id")
    local status; status=$(jq -r '.status' <<<"$R")
    echo "[$(now_utc)] $id status: $status"
    if [[ "$status" == "succeeded" || "$status" == "failed" || "$status" == "canceled" ]]; then
      echo "$R" | jq . | tee "$out" >/dev/null
      break
    fi
    sleep 3
  done
}

main() {
  require_cmd curl; require_cmd jq; require_env REPLICATE_API_TOKEN
  local report; report=$(make_report_dir); echo "Report dir: $report"

  echo "Resolving latest version for $MODEL ..."
  local ver; ver=$(fetch_latest_version "$MODEL" || true)
  echo "VERSION=$ver"
  if [ -z "$ver" ] || [ "$ver" = "null" ]; then
    echo "[auth] Failed to resolve version for $MODEL (got: $ver)." >&2
    echo "[auth] REPLICATE_API_TOKEN length: $(token_len)" >&2
    echo "[hint] Verify token in .env/.env.local" >&2
    exit 1
  fi

  local inp; inp=$(build_input_json)
  echo "$inp" >"$report/seedance_input.json"

  echo "Starting prediction..."
  local id; id=$(start_prediction "$ver" "$inp" | tail -n1)
  echo "$id" >"$report/seedance_id.txt"

  poll_prediction "$id" "$report/seedance_result.json"
  echo "\nOutput URLs:"; jq -r '.output | .[]?' "$report/seedance_result.json" || true
  echo "Done. Artifacts in: $report"
}

main "$@"
