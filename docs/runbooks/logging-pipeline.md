---
description: 'Runbook: Logging-Pipeline – Deploy, Bindings, Smoke Tests'
owner: 'Platform Team'
priority: 'medium'
lastSync: '2025-11-11'
codeRefs: 'src/config/logging.ts, src/server/utils/logger-factory.ts, src/server/utils/log-transports.ts'
runbook: 'logging-pipeline'
status: 'maintained'
testRefs: 'tests/unit/utils/logger-transport.smoke.test.ts'
---

# Logging Pipeline Runbook

## Overview

- All application logs created via `loggerFactory.createLogger(name)` and `loggerFactory.createSecurityLogger()` are routed through the configured transports.
- In development, logs print to console and are bridged to the debug SSE stream used by the in-app log viewer.
- In production, select transports via `LOG_TRANSPORTS` or rely on the default: `http` if `LOG_HTTP_ENDPOINT` is present, otherwise `console`.

## Deploy Checklist

- Set `LOG_TRANSPORTS` according to your destination (e.g., `http,analytics`).
- If using HTTP SIEM:
  - `LOG_HTTP_ENDPOINT` must be reachable from the Worker/Node runtime
  - Optionally set `LOG_HTTP_API_KEY` for Authorization: Bearer
- If using Workers Analytics Engine:
  - Create a dataset and bind it (e.g., bind to `LOGS` in wrangler)
  - Expose it on `globalThis` as `__ANALYTICS__` with `writeDataPoint()` (see below)
- If using R2 Logpush-like storage:
  - Bind an R2 bucket and expose it on `globalThis` as `__R2_LOGS__` with `put(key, body)`

## Bindings (Workers)

- In a Worker entry where `env` is available, you can expose bindings for transports:
  - `globalThis.__ANALYTICS__ = env.LOGS` // analytics_engine dataset binding
  - `globalThis.__R2_LOGS__ = env.R2_LOGS` // R2 bucket binding

## Redaction

- Sensitive keys are redacted using `LOG_CONFIG.filters.sensitiveKeys` (case-insensitive, deep).
- Adjust max string length and depth via `LOG_CONFIG.filters.maxStringLength` and `maxObjectDepth`.

## Smoke Test

- Run unit test `tests/unit/utils/logger-transport.smoke.test.ts`.
- It validates HTTP transport integration and verifies redaction behavior.

## Troubleshooting

- Missing binding: analytics/r2 transports silently no-op when their bindings are not present.
- HTTP errors: transport swallows errors by design to avoid affecting the request flow. Check SIEM endpoint reachability separately.
