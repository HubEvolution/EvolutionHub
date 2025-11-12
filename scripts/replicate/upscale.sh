#!/usr/bin/env bash
set -euo pipefail

# Topaz Video Upscale on Replicate
# - Input: SOURCE_URL (arg1) or env SOURCE_URL
# - ENV required: REPLICATE_API_TOKEN
# - Optional env overrides:
#   RESOLUTION (default: 1080p)
#   FPS        (default: 60)  # set to empty to omit
#   REPORT_DIR (default: reports/replicate/<UTC ISO ts>)
#
# Requires: curl, jq

MODEL_TOPAZ="topazlabs/video-upscale"
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
  # Try meta endpoint first for latest_version.id
  local meta
  meta=$(curl -s -H "Authorization: Token $REPLICATE_API_TOKEN" \
    "$API_BASE/models/$MODEL_TOPAZ" || true)
  if [ -n "$meta" ] && [ "$meta" != "null" ]; then
    local id
    id=$(printf '%s' "$meta" | jq -r '.latest_version.id // .versions[0].id // empty')
    if [ -n "$id" ]; then echo "$id"; return 0; fi
  fi
  # Fallback to versions listing
  curl -s -H "Authorization: Token $REPLICATE_API_TOKEN" \
    "$API_BASE/models/$MODEL_TOPAZ/versions" | jq -r '.results[0].id'
}

fetch_input_props() {
  local version="$1"
  curl -s -H "Authorization: Token $REPLICATE_API_TOKEN" \
    "$API_BASE/models/$MODEL_TOPAZ/versions/$version" \
    | jq -r '.openapi_schema.components.schemas.Input.properties | keys[]?' || true
}

has_prop() { local props="$1"; local name="$2"; grep -Fxq "$name" <<<"$props"; }

build_input_json() {
  local props="$1"; local src="$2"
  local resolution="${RESOLUTION:-1080p}";
  local fps="${FPS:-60}";

  local has_video="0" has_resolution="0" has_fps="0"
  has_prop "$props" video && has_video="1"
  has_prop "$props" resolution && has_resolution="1"
  has_prop "$props" fps && has_fps="1"

  jq -n \
    --arg video "$src" \
    --arg res "$resolution" \
    --arg fps_str "$fps" \
    --arg HV "$has_video" --arg HR "$has_resolution" --arg HF "$has_fps" \
    '{} \
     | (if $HV=="1" then .video = $video else . end) \
     | (if $HR=="1" then .resolution = $res else . end) \
     | (if $HF=="1" and ($fps_str|length)>0 and ($fps_str|tonumber?)!=null then .fps = ($fps_str|tonumber) else . end)'
}

start_prediction() {
  local version="$1"; local input_json="$2"
  local body; body=$(jq -n --arg ver "$version" --argjson inp "$input_json" '{version: $ver, input: $inp}')
  curl -s -X POST "$API_BASE/models/$MODEL_TOPAZ/predictions" \
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

usage() {
  cat <<EOF
Usage: SOURCE_URL=<url> ./scripts/replicate/upscale.sh
   or: ./scripts/replicate/upscale.sh <url>

Env:
  REPLICATE_API_TOKEN  (required)
  RESOLUTION=1080p     (optional)
  FPS=60               (optional; empty to omit)
  REPORT_DIR=<path>    (optional)
EOF
}

main() {
  require_cmd curl; require_cmd jq; require_env REPLICATE_API_TOKEN
  local src="${1:-${SOURCE_URL:-}}"
  if [ -z "$src" ]; then usage; exit 2; fi

  local report; report=$(make_report_dir); echo "Report dir: $report"
  echo "Fetching Topaz latest version..."
  local ver; ver=$(fetch_latest_version); echo "TOPAZ_VERSION=$ver"
  local props; props=$(fetch_input_props "$ver")
  local inp; inp=$(build_input_json "$props" "$src")
  echo "$inp" >"$report/topaz_input.json"
  echo "Starting Upscale..."
  local id; id=$(start_prediction "$ver" "$inp" | tail -n1)
  echo "$id" >"$report/topaz_id.txt"
  poll_prediction "$id" "$report/topaz_result.json"
  echo "\nUpscaled URLs:"; jq -r '.output | .[]?' "$report/topaz_result.json" || true
  echo "Done. Artifacts in: $report"
}

main "$@"
