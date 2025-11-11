# AGENTS.md (API)

Geltung: Nur für API‑Routen unterhalb dieses Ordners.

## Handler‑Konventionen
- Ein Route‑Handler pro Datei; extrahiere Geschäftslogik in Services (`src/lib/services/*`) oder Utils.
- Eingaben strikt validieren (Schemas unter `src/lib/validation/schemas/*`); keine stillen Fallbacks.
- Responses gemäß `docs/api/api-guidelines.md` und `docs/api/error-handling.md`; Statuscodes korrekt verwenden.

## Sicherheit
- AuthN/AuthZ erzwingen (Middleware/Guards). Admin‑Routen besonders restriktiv.
- Rate Limiting anwenden, wo sinnvoll; `src/lib/rate-limiter.ts` respektieren.
- Keine sensiblen Daten im Response‑Body/Logs; PII maskieren.

## Logging
- Kontext: route, requestId, ggf. userId; strukturiert loggen über `logger-utils.ts`.
- Kein übermäßiges Logging im Hot‑Path ohne Feature‑Flag.

## Tests
- Jede neue/angepasste Route bekommt Integrationstests (`tests/integration/api/...`).
- `tests/shared/http.ts` für Requests nutzen; bestehende Fixtures/Seeds wiederverwenden.

## Dokumentation
- `openapi.yaml` und `docs/api/*` bei API‑Änderungen aktualisieren.
