#!/usr/bin/env bash
set -euo pipefail

# Start a persistent Cloudflare Tunnel for the local Cascade MCP server.
# Prerequisites:
#   - cloudflared installed and logged in: `cloudflared tunnel login`
#   - A tunnel created: `cloudflared tunnel create cascade-mcp`
#   - DNS routed: `cloudflared tunnel route dns cascade-mcp mcp.example.com`
#   - Access policy applied to the hostname (Service Token recommended for GPT connector)
#
# Usage:
#   TUNNEL_NAME=cascade-mcp ./scripts/cloudflare/start-mcp-tunnel.sh
#   # optionally override config path
#   CONFIG=./scripts/cloudflare/mcp-tunnel.yml TUNNEL_NAME=cascade-mcp ./scripts/cloudflare/start-mcp-tunnel.sh

CONFIG=${CONFIG:-"./scripts/cloudflare/mcp-tunnel.yml"}
TUNNEL_NAME=${TUNNEL_NAME:-"cascade-mcp"}

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared not found. Install from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/" >&2
  exit 1
fi

if [ ! -f "$CONFIG" ]; then
  echo "Config file not found: $CONFIG" >&2
  exit 1
fi

# Run the named tunnel with the provided config. This keeps running in the foreground.
exec cloudflared tunnel --config "$CONFIG" run "$TUNNEL_NAME"
