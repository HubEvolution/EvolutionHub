---
description: 'Produktionslogging – Transports, Bindings und Redaktion'
owner: 'Platform Team'
priority: 'medium'
lastSync: '2025-11-15'
codeRefs: 'src/config/logging.ts, src/server/utils/logger-factory.ts, src/server/utils/log-transports.ts'
feature: 'observability-logging'
status: 'in_progress'
testRefs: 'tests/unit/utils/logger-transport.smoke.test.ts'
---

# Production Logging Transports

This project now supports pluggable log transports for production use:

- console: local stdout (default in dev)
- http: send structured JSON logs to an HTTP/SIEM endpoint
- analytics: write markers to Cloudflare Workers Analytics Engine
- logpush (r2): write JSONL records to an R2 bucket for Logpush ingestion

Configure transports via env variable `LOG_TRANSPORTS` (comma-separated), e.g.:

- `LOG_TRANSPORTS="http"` (production default if `LOG_HTTP_ENDPOINT` is set)
- `LOG_TRANSPORTS="console,http"`
- `LOG_TRANSPORTS="analytics,http,logpush"`

Additional env variables:

- `LOG_HTTP_ENDPOINT` – required for `http`
- `LOG_HTTP_API_KEY` – optional Bearer header for `http`
- `LOG_ANALYTICS_BINDING` – optional, name of dataset binding exposed on `globalThis[NAME]`
- `LOG_R2_BINDING` – optional, name of R2 bucket binding exposed on `globalThis[NAME]`
- `LOG_SSE_BRIDGE=1` – also forward logs to the internal debug SSE stream (dev default)

Redaction uses `LOG_CONFIG.filters`: nested keys matching `sensitiveKeys` are replaced with `[FILTERED]`, strings are truncated to `maxStringLength`, and recursion is limited by `maxObjectDepth`.

Security and general (metrics-like) service logs created through `loggerFactory` automatically flow through the selected transports.

## Auth Magic Request Logging

- Magic‑Link Requests nutzen Security‑Logger‑Metriken:
  - `auth_magic_request_success` / `auth_magic_request_error` mit `source: "magic_request"`.
  - `turnstile_verify_success` / `turnstile_verify_failed` / `turnstile_verify_unavailable` mit `source: "magic_request"`.
- Providerfehler werden als strukturierte Logs mit `status`, `providerType` und `requestId` geschrieben (keine E‑Mail/PII).
- Der Header `X-Stytch-Request-Id` erlaubt die Korrelation zwischen Stytch‑`request_id`, Logs und API‑Responses.
