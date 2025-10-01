#!/usr/bin/env bash
set -euo pipefail

# Creates/ensures DNS records for a Stytch Custom Domain on Cloudflare.
# Requirements:
#  - Cloudflare API Token with DNS:Edit on the target Zone
#  - curl, jq installed
#
# Env vars:
#  CF_API_TOKEN       - Cloudflare API token
#  CF_ZONE_ID         - Cloudflare Zone ID (e.g. for example.com)
#  CF_ROOT_DOMAIN     - Root domain (e.g. example.com)
#  CF_SUBDOMAIN       - Subdomain host (e.g. login or login-test)
#  STYTCH_TARGET      - CNAME target from Stytch (e.g. abc.customers.stytch.dev)
#
# Optional:
#  ENSURE_CAA=true    - Also ensure CAA issue records on the root (@) for letsencrypt.org, ssl.com, pki.goog
#
# Example:
#  CF_API_TOKEN=*** CF_ZONE_ID=*** CF_ROOT_DOMAIN=example.com CF_SUBDOMAIN=login \
#  STYTCH_TARGET=iris-gibbon-2947.customers.stytch.dev \
#  ENSURE_CAA=true ./scripts/cloudflare/setup-stytch-custom-domain.sh

: "${CF_API_TOKEN:?CF_API_TOKEN required}"
: "${CF_ZONE_ID:?CF_ZONE_ID required}"
: "${CF_ROOT_DOMAIN:?CF_ROOT_DOMAIN required}"
: "${CF_SUBDOMAIN:?CF_SUBDOMAIN required}"
: "${STYTCH_TARGET:?STYTCH_TARGET required}"

API="https://api.cloudflare.com/client/v4"
AUTH=(-H "Authorization: Bearer ${CF_API_TOKEN}" -H "Content-Type: application/json")

host="${CF_SUBDOMAIN}.${CF_ROOT_DOMAIN}"

# Upsert CNAME record (proxied=false)
existing_cname_id=$(curl -sS -G "${API}/zones/${CF_ZONE_ID}/dns_records" "${AUTH[@]}" \
  --data-urlencode "type=CNAME" --data-urlencode "name=${host}" | jq -r '.result[0].id // empty')

if [[ -n "${existing_cname_id}" ]]; then
  echo "Updating existing CNAME ${host} → ${STYTCH_TARGET}"
  curl -sS -X PUT "${API}/zones/${CF_ZONE_ID}/dns_records/${existing_cname_id}" "${AUTH[@]}" \
    --data "$(jq -nc --arg name "${host}" --arg content "${STYTCH_TARGET}" '{type:"CNAME", name:$name, content:$content, ttl:1, proxied:false}')" >/dev/null
else
  echo "Creating CNAME ${host} → ${STYTCH_TARGET}"
  curl -sS -X POST "${API}/zones/${CF_ZONE_ID}/dns_records" "${AUTH[@]}" \
    --data "$(jq -nc --arg name "${host}" --arg content "${STYTCH_TARGET}" '{type:"CNAME", name:$name, content:$content, ttl:1, proxied:false}')" >/dev/null
fi

echo "CNAME ensured: ${host} → ${STYTCH_TARGET} (proxied=false)"

if [[ "${ENSURE_CAA:-}" == "true" ]]; then
  echo "Ensuring CAA records on ${CF_ROOT_DOMAIN}"
  for issuer in "letsencrypt.org" "ssl.com" "pki.goog"; do
    id=$(curl -sS -G "${API}/zones/${CF_ZONE_ID}/dns_records" "${AUTH[@]}" \
      --data-urlencode "type=CAA" --data-urlencode "name=${CF_ROOT_DOMAIN}" | jq -r ".result[] | select(.data.tag==\"issue\" and .data.value==\"${issuer}\").id // empty")
    if [[ -z "${id}" ]]; then
      echo "Creating CAA issue ${issuer} on ${CF_ROOT_DOMAIN}"
      curl -sS -X POST "${API}/zones/${CF_ZONE_ID}/dns_records" "${AUTH[@]}" \
        --data "$(jq -nc --arg name "${CF_ROOT_DOMAIN}" --arg issuer "${issuer}" '{type:"CAA", name:$name, data:{flags:0, tag:"issue", value:$issuer}, ttl:1}')" >/dev/null
    else
      echo "CAA issue ${issuer} already present"
    fi
  done
fi

echo "Done. Verify in Stytch dashboard, then set STYTCH_CUSTOM_DOMAIN=${host} in your environment."
