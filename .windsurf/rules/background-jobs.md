---
trigger: always_on
scope: infra
extends:
  - infra.md
  - api-and-security.md
  - caching-kv.md
  - testing-and-ci.md
  - observability.md
priority: high
---

# Background Jobs Rules

## Zweck

Zuverlässige Background‑Jobs (Cron‑Worker und serverseitige Queue‑Prozessoren) mit klaren Guardrails: Idempotenz, sichere Trigger, definierter State (KV/R2/D1), Observability und reproduzierbare Tests.

## Muss

- Worker‑Trennung & Ownership
  - Cron-/Maintenance‑Jobs laufen im dedizierten Worker unter `workers/cron-worker/`.
  - App‑Worker (`src/pages/api/**`) darf nur **explizite** Queue/Job‑Endpunkte haben (z. B. Email Queue Processor), aber keine “hidden crons”.

- Trigger & Scheduling
  - Cron‑Schedules sind in `workers/cron-worker/wrangler.toml` definiert (`[triggers].crons`).
  - Jeder Cron‑Tick muss **sicher** sein:
    - deterministische Laufzeit
    - definierter Work‑Cap pro Tick (z. B. `WEB_EVAL_EXEC_MAX_RUNS_PER_TICK`)
    - keine unbounded Loops

- Manuelle Trigger (Break‑Glass / Debug)
  - Cron‑Worker unterstützt manuelle Ausführung über `GET /__cron/run/<task>` (z. B. `pricing`, `auth`, `docs`, `webeval`, `status`).
  - Diese Endpunkte sind **immer** intern zu schützen:
    - Header‑Token: `X-Internal-Health` muss `INTERNAL_HEALTH_TOKEN` matchen
    - Bei fehlendem/invalidem Token: `403 forbidden`
  - Die API‑Antworten bleiben klein (kein Payload‑Dump), nur Status + minimale Diagnostics.

- Idempotenz & State
  - Jobs müssen idempotent sein oder eine klare Idempotenz‑Strategie haben:
    - Status/Checkpointing in KV (z. B. `KV_CRON_STATUS`)
    - Artefakte/Reports in R2 (z. B. `R2_MAINTENANCE`)
    - Persistente Business‑State (wenn nötig) in D1
  - Wiederholte Runs dürfen keine Duplikate/Leaks erzeugen:
    - Keys sind namespaced (z. B. pro `host`, pro Datum) und vermeiden Überschreiben wichtiger Historie
    - “Latest”‑Pointer ist erlaubt, aber muss getrennt von History sein (z. B. `latest.json` + Tagespfade)

- Fehlerbehandlung & Retries
  - Fehler dürfen Jobs nicht “silent” machen:
    - Job schreibt Status nach KV (ok/failed, timestamp, ggf. statusCode)
    - Optional: Healthcheck‑Ping (Start/OK/Fail) über `HC_*` URLs
  - Retries:
    - Cron kann automatisch erneut laufen, daher muss Job selbst retries defensiv behandeln.
    - Bei externen Calls sind Timeouts und kurze Samples (≤512 chars) zulässig, aber keine großen Dumps.

- Gating / Cost Control
  - Kostenintensive Jobs (z. B. Web‑Eval Executor) sind env‑gegated:
    - `WEB_EVAL_EXEC_ENABLE` muss true sein
    - `WEB_EVAL_EXEC_HOSTS` muss den Ziel‑Host explizit erlauben
    - `WEB_EVAL_EXEC_MAX_RUNS_PER_TICK` limitiert die Arbeit pro Tick
  - In Production zusätzliche Schutzsignale erzwingen, wenn Job über App‑APIs läuft (z. B. `x-internal-exec: 1`).

- Observability
  - Cron‑Worker schreibt:
    - Status nach KV (`KV_CRON_STATUS`)
    - Artefakte nach R2 (`R2_MAINTENANCE`) – JSON mit `kind`, `ok`, `status`, `ms`, `at`, `host`
  - App‑seitige Queue‑Processor loggen über das zentrale Logging‑System (siehe [observability.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/observability.md:0:0-0:0)) und dürfen keine PII/Secrets loggen.

## Sollte

- Einheitliche Status‑Keys
  - KV‑Keys sollten pro Task konsistent sein, z. B.:
    - `pricing:last:<host>`
    - `prod-auth:last:<host>`
    - `webeval:last:<host>`
    - `docs-registry:last`
  - Eine “Status‑API” (`/__cron/run/status`) soll nur diese Keys lesen und als JSON ausgeben.

- Fan‑out Targets
  - Zielhosts für Health/Smokes werden über `BASE_URLS` (JSON‑Array) gesteuert.
  - Hosts werden defensiv geparst; invalid URLs dürfen den gesamten Tick nicht crashen.

- App‑seitige Queue‑Verarbeitung
  - Queue‑Processor Endpunkte (z. B. Email‑Processing) sollen:
    - Auth‑geschützt sein (`withAuthApiMiddleware`)
    - Same‑Origin enforced (unsafe methods)
    - Einen `limit` akzeptieren und serverseitig clampen (z. B. 1..50)

- Tests
  - Für jede neue Cron‑Task sollte es mindestens geben:
    - Ein “smoke” über manuelle Trigger (lokal/staging) oder Integrationstest‑Coverage, wo sinnvoll.
  - Idempotenz-/Gating‑Pfad (disabled, forbidden, rate_limited) sollte testbar sein.

## Nicht

- Keine offenen Cron‑Trigger ohne Token‑Guard (niemals öffentlich).
- Keine unbounded Loops pro Tick.
- Keine Speicherung von Secrets/PII in KV/R2 Status‑Artefakten.
- Keine “kostenintensiven Default‑Crons” in Production ohne Env‑Gating + Work‑Caps.

## Checkliste

- [ ] Cron‑Schedule ist in `workers/cron-worker/wrangler.toml` definiert.
- [ ] Manuelle Trigger sind via `X-Internal-Health` + `INTERNAL_HEALTH_TOKEN` geschützt.
- [ ] Job ist idempotent (KV‑Status + R2‑Artefakte + kein Duplicate‑Spam).
- [ ] Work‑Caps pro Tick sind gesetzt (z. B. `*_MAX_RUNS_PER_TICK`).
- [ ] Errors werden in KV/Healthcheck sichtbar; keine großen Payload‑Dumps.
- [ ] Logs sind redacted (keine Cookies/Auth Header/PII).

## Code‑Anker

- Cron Worker:
  - `workers/cron-worker/src/index.ts`
  - `workers/cron-worker/wrangler.toml`
- App‑seitige Queue/Jobs (Beispiele):
  - `src/pages/api/notifications/queue/process.ts`
  - `src/pages/api/testing/evaluate/next/run.ts` (Web‑Eval Runner/Claim/Execution Trigger)
- KV/R2:
  - [.windsurf/rules/caching-kv.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/caching-kv.md:0:0-0:0)
  - [src/lib/kv/usage.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/kv/usage.ts:0:0-0:0) (Usage/Quota Patterns)
- Observability:
  - [.windsurf/rules/observability.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/observability.md:0:0-0:0)

## CI/Gates

- `npm run lint`
- `npm run test`
- Bei Änderungen an Queue-/Job‑APIs:
  - `npm run test:integration`

## Referenzen

- [.windsurf/rules/infra.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/infra.md:0:0-0:0)
- [.windsurf/rules/api-and-security.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/api-and-security.md:0:0-0:0)
- [.windsurf/rules/caching-kv.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/caching-kv.md:0:0-0:0)
- [.windsurf/rules/observability.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/observability.md:0:0-0:0)

## Changelog

- 2025-12-16: Erstfassung Background Jobs (Cron‑Worker, manuelle Trigger, Gating, KV/R2 Status, Idempotenz).
