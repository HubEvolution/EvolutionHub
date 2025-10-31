---
trigger: always_on
---

# Zod ↔ OpenAPI (Hybrid)

## Ziel

- Zentrale, strikte Validierung mit Zod.
- OpenAPI bleibt kuratierte, veröffentlichte Spezifikation.
- Drift minimieren, kuratierte Sicherheitstexte bewahren.

## Auto‑Überprüfung (einfach)

- Einfache JSON‑Requests werden über Pilot/Diff geprüft:
  - `npm run openapi:zod:pilot`
  - `npm run openapi:zod:diff` (Diff gegen `openapi.yaml`, Artefakte in `reports/`)

## Manuell kuratiert (komplex)

- Multipart/Form‑Data (z. B. Voice), spezielle Header (CSRF), SSRF‑Hinweise, Provider‑spezifische Texte.

## Guardrails

- Kein Auto‑Overwrite der `openapi.yaml`.
- Bei `.strict()` in Zod → in OpenAPI `additionalProperties: false` setzen.
- Diff prüfen und YAML bewusst aktualisieren (Sicherheitsvermerke nicht verlieren).

## PR‑Check (Kurz)

- Zod‑Schema vorhanden + verwendet (`safeParse` + `formatZodError`)?
- Handler typisiert (`APIContext`), Middleware korrekt?
- `openapi.yaml` aktualisiert (components + requestBody)?
- Tests (valid/invalid) vorhanden?
- `openapi:validate`/`openapi:redoc` grün?

## Code‑Anker

- `src/lib/validation/schemas/*`
- `openapi.yaml`

## Changelog

- 2025‑10‑31: Hybrid‑Leitplanken gefestigt; Pilot/Diff Workflows referenziert.
