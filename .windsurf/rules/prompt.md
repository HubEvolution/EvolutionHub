# Prompt Enhancer Rules

## Zweck

Konsistente und sichere Prompt‑Enhance‑API: strikte Validierung, Same‑Origin/CSRF, Quoten/Rate‑Limits, klare Fehlerformen.

## Muss

- Middleware & Sicherheit
  - Unsafe Methods: Same‑Origin Pflicht; Double‑Submit CSRF für Endpunkte mit `csrf_token`.
  - Einheitliche JSON‑Antworten: `createApiSuccess` / `createApiError(type, message, details?)`.
- Validierung
  - Zod‑Schemas nutzen (z. B. `src/lib/validation/schemas/prompt.ts`), `safeParse` + `formatZodError` bei Fehlern.
- Limits
  - Rate‑Limit anwenden (Preset aus `src/lib/rate-limiter.ts`, z. B. `apiRateLimiter` oder strenger bei Bedarf).
  - Quoten serverseitig prüfen (kein UI‑Enforce).

## Sollte

- Inputs begrenzen (Länge/Token‑Budget) und explizite Verbote (PII/unsafe) in Validation aufnehmen.
- Observability: minimale, redaktierte Logs; keine Prompts im Klartext persistieren.

## Nicht

- Keine manuellen if/else‑Validierungen statt Zod.
- Keine Provider‑Keys im Client.

## Checkliste

- [ ] Same‑Origin/CSRF korrekt für POST?
- [ ] Zod‑Schema aktiv; Fehler → `validation_error` mit Details.
- [ ] Rate‑Limit aktiv; 429 mit `Retry-After`.
- [ ] Quotenprüfung serverseitig vorhanden (falls Scope verlangt).

## Code‑Anker

- `src/lib/validation/schemas/prompt.ts`
- `src/lib/rate-limiter.ts`
- OpenAPI: `openapi.yaml`

## CI/Gates

- `npm run openapi:validate`
- `npm run test:integration` (API)
- `npm run lint`

## Referenzen

- Global Rules; API & Security Rules; Zod↔OpenAPI.
- `.windsurf/rules/prompt.md`

## Changelog

- 2025‑10‑31: Baseline für Middleware/Validierung/Rate‑Limits/Quoten ergänzt.
