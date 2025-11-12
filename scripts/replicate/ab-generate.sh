#!/usr/bin/env bash
set -euo pipefail

# A/B video generation using Replicate (Veo 3.1 + WAN 2.5 T2V)
# - Uses environment variable REPLICATE_API_TOKEN (required)
# - Optional env overrides:
#   PROMPT            (text prompt)
#   PROMPT_FILE       (path to prompt file; overrides PROMPT if set)
#   AR                (default: 9:16)
#   DURATION          (default: 8)
#   VEO_RESOLUTION    (default: 1080p)
#   WAN_SIZE          (default: 720p)
#   AUDIO             (default: ambient)
#   REPORT_DIR        (default: reports/replicate/<UTC ISO ts>)
#
# Requires: curl, jq

MODEL_VEO="google/veo-3.1"
MODEL_WAN="wan-video/wan-2.5-t2v"
API_BASE="https://api.replicate.com/v1"

# Resolve repo root and always override REPLICATE_API_TOKEN from dotenv files (.env then .env.local)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd)"
try_load_token() {
  local file="$1"
  [ -f "$file" ] || return 1
  # pick last non-comment assignment; support optional leading 'export'
  local line
  line="$(grep -E '^[[:space:]]*(export[[:space:]]+)?REPLICATE_API_TOKEN[[:space:]]*=' "$file" | tail -n1 || true)"
  [ -n "$line" ] || return 1
  local val="${line#*=}"
  # trim surrounding whitespace
  val="$(printf '%s' "$val" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  # drop trailing inline comments starting with # (unquoted)
  val="$(printf '%s' "$val" | sed -E 's/[[:space:]]+#.*$//')"
  # strip surrounding quotes if present
  if [[ "$val" == \"*\" && "$val" == *\" ]]; then
    val="${val#\"}"; val="${val%\"}"
  elif [[ "$val" == \'*\' && "$val" == *\' ]]; then
    val="${val#\'}"; val="${val%\'}"
  fi
  if [ -n "$val" ]; then export REPLICATE_API_TOKEN="$val"; return 0; fi
  return 1
}
# Load base .env, then override with .env.local if present
try_load_token "$ROOT/.env" || true
try_load_token "$ROOT/.env.local" || true

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "Missing required env: $name" >&2
    exit 1
  fi
}

token_len() { local v="${REPLICATE_API_TOKEN:-}"; echo "${#v}"; }

now_utc() {
  date -u +%Y%m%dT%H%M%SZ
}

make_report_dir() {
  local base="${REPORT_DIR:-}";
  if [ -z "$base" ]; then
    base="reports/replicate/$(now_utc)"
  fi
  mkdir -p "$base"
  echo "$base"
}

fetch_latest_version() {
  local model="$1"
  # model is owner/name; try meta endpoint first for latest_version.id
  local owner="${model%%/*}"; local name="${model#*/}"
  if [ -n "$owner" ] && [ -n "$name" ] && [ "$owner" != "$name" ]; then
    local meta
    meta=$(curl -s -H "Authorization: Token $REPLICATE_API_TOKEN" \
      "$API_BASE/models/$owner/$name" || true)
    if [ -n "$meta" ] && [ "$meta" != "null" ]; then
      local id
      id=$(printf '%s' "$meta" | jq -r '.latest_version.id // .versions[0].id // empty')
      if [ -n "$id" ]; then echo "$id"; return 0; fi
    fi
  fi
  # Fallback to versions listing
  curl -s -H "Authorization: Token $REPLICATE_API_TOKEN" \
    "$API_BASE/models/$model/versions" | jq -r '.results[0].id'
}

fetch_input_props() {
  local model="$1"; local version="$2"
  curl -s -H "Authorization: Token $REPLICATE_API_TOKEN" \
    "$API_BASE/models/$model/versions/$version" \
    | jq -r '.openapi_schema.components.schemas.Input.properties | keys[]?' || true
}

has_prop() { # has_prop <prop_list_string> <prop_name>
  local props="$1"; local name="$2"
  grep -Fxq "$name" <<<"$props"
}

build_input_json() { # build_input_json <props> <model_kind: veo|wan>
  local props="$1"; local kind="$2"
  local prompt_json

  # Determine prompt source
  local prompt_val="${PROMPT:-}"
  if [ -n "${PROMPT_FILE:-}" ]; then
    if [ ! -f "$PROMPT_FILE" ]; then
      echo "Prompt file not found: $PROMPT_FILE" >&2; exit 1
    fi
    prompt_val="$(cat "$PROMPT_FILE")"
  fi
  if [ -z "$prompt_val" ]; then
    prompt_val='Abstract data lattice emerging from blur into sharp structure; dark indigo/violet with bioluminescent cyan/magenta accents; glassy holographic lines; soft dolly-in camera; elegant, futuristic. Audio: ambient chimes only, no vocals/voiceover. Final 1s hold for logo and CTA "Kostenlos testen".'
  fi

  local ar="${AR:-9:16}"
  local duration="${DURATION:-8}"
  local audio="${AUDIO:-ambient}"
  local veo_res="${VEO_RESOLUTION:-1080p}"
  local wan_size="${WAN_SIZE:-720p}"

  # Flags whether properties exist
  local HAS_AR="0" HAS_DURATION="0" HAS_RESOLUTION="0" HAS_SIZE="0" HAS_AUDIO="0" HAS_AUDIO_PRESET="0"
  has_prop "$props" aspect_ratio && HAS_AR="1"
  has_prop "$props" duration && HAS_DURATION="1"
  has_prop "$props" resolution && HAS_RESOLUTION="1"
  has_prop "$props" size && HAS_SIZE="1"
  has_prop "$props" audio && HAS_AUDIO="1"
  has_prop "$props" audio_preset && HAS_AUDIO_PRESET="1"

  # Choose resolution/size by model kind
  local res_val="$veo_res"
  if [ "$kind" = "wan" ]; then
    res_val="$wan_size"
  fi

  # Build JSON with only supported keys (use if-then-else updates)
  PROMPT_JSON=$(jq -n \
    --arg prompt "$prompt_val" \
    --arg ar "$ar" \
    --arg res "$res_val" \
    --arg audio "$audio" \
    --arg duration_str "$duration" \
    --arg HAS_AR "$HAS_AR" \
    --arg HAS_DURATION "$HAS_DURATION" \
    --arg HAS_RESOLUTION "$HAS_RESOLUTION" \
    --arg HAS_SIZE "$HAS_SIZE" \
    --arg HAS_AUDIO "$HAS_AUDIO" \
    --arg HAS_AUDIO_PRESET "$HAS_AUDIO_PRESET" \
    '{prompt: $prompt}
     | (if $HAS_AR == "1" then .aspect_ratio = $ar else . end)
     | (if $HAS_DURATION == "1" then .duration = ($duration_str|tonumber) else . end)
     | (if $HAS_RESOLUTION == "1" then .resolution = $res else . end)
     | (if $HAS_SIZE == "1" then .size = $res else . end)
     | (if $HAS_AUDIO == "1" then .audio = $audio else . end)
     | (if $HAS_AUDIO_PRESET == "1" then .audio_preset = $audio else . end)')

  echo "$PROMPT_JSON"
}

start_prediction() { # start_prediction <model> <version> <input_json> -> id
  local model="$1"; local version="$2"; local input_json="$3"
  local body
  body=$(jq -n --arg ver "$version" --argjson inp "$input_json" '{version: $ver, input: $inp}')
  curl -s -X POST "$API_BASE/predictions" \
    -H "Authorization: Token $REPLICATE_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$body" | tee /dev/stderr | jq -r '.id'
}

poll_prediction() { # poll_prediction <id> <out_json_path>
  local id="$1"; local out="$2"
  while true; do
    local R
    R=$(curl -s -H "Authorization: Token $REPLICATE_API_TOKEN" "$API_BASE/predictions/$id")
    local status
    status=$(jq -r '.status' <<<"$R")
    echo "[$(now_utc)] $id status: $status"
    if [[ "$status" == "succeeded" || "$status" == "failed" || "$status" == "canceled" ]]; then
      echo "$R" | jq . | tee "$out" >/dev/null
      break
    fi
    sleep 3
  done
}

main() {
  require_cmd curl
  require_cmd jq
  require_env REPLICATE_API_TOKEN

  local report
  report=$(make_report_dir)

  echo "Report dir: $report"

  # Veo 3.1
  echo "Fetching Veo 3.1 latest version..."
  local veo_version
  veo_version=$(fetch_latest_version "$MODEL_VEO")
  echo "VEO_VERSION=$veo_version"
  if [ -z "$veo_version" ] || [ "$veo_version" = "null" ]; then
    echo "[auth] Failed to fetch versions for $MODEL_VEO (got: $veo_version)." >&2
    echo "[auth] REPLICATE_API_TOKEN length: $(token_len)" >&2
    echo "[hint] Ensure a valid token is present in .env/.env.local or environment." >&2
    exit 1
  fi
  local veo_props
  veo_props=$(fetch_input_props "$MODEL_VEO" "$veo_version")
  local veo_input
  veo_input=$(build_input_json "$veo_props" "veo")
  echo "$veo_input" >"$report/veo_input.json"
  echo "Starting Veo prediction..."
  local veo_id
  veo_id=$(start_prediction "$MODEL_VEO" "$veo_version" "$veo_input" | tail -n1)
  echo "$veo_id" >"$report/veo_id.txt"

  # WAN 2.5 T2V
  echo "Fetching WAN 2.5 T2V latest version..."
  local wan_version
  wan_version=$(fetch_latest_version "$MODEL_WAN")
  echo "WAN_VERSION=$wan_version"
  if [ -z "$wan_version" ] || [ "$wan_version" = "null" ]; then
    echo "[auth] Failed to fetch versions for $MODEL_WAN (got: $wan_version)." >&2
    echo "[auth] REPLICATE_API_TOKEN length: $(token_len)" >&2
    echo "[hint] Ensure a valid token is present in .env/.env.local or environment." >&2
    exit 1
  fi
  local wan_props
  wan_props=$(fetch_input_props "$MODEL_WAN" "$wan_version")
  local wan_input
  wan_input=$(build_input_json "$wan_props" "wan")
  echo "$wan_input" >"$report/wan_input.json"
  echo "Starting WAN prediction..."
  local wan_id
  wan_id=$(start_prediction "$MODEL_WAN" "$wan_version" "$wan_input" | tail -n1)
  echo "$wan_id" >"$report/wan_id.txt"

  # Poll sequentially (simple & reliable)
  echo "Polling Veo ($veo_id)..."
  poll_prediction "$veo_id" "$report/veo_result.json"
  echo "Polling WAN ($wan_id)..."
  poll_prediction "$wan_id" "$report/wan_result.json"

  echo "\nFinal outputs:"
  echo "Veo URLs:"; jq -r '.output | .[]?' "$report/veo_result.json" || true
  echo "WAN URLs:"; jq -r '.output | .[]?' "$report/wan_result.json" || true
  echo "Done. Artifacts in: $report"
}

main "$@"
