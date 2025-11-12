# AGENTS.md (API)

Geltung: Nur für API‑Routen unterhalb dieses Ordners.

## Handler‑Konventionen

- Ein Route‑Handler pro Datei; extrahiere Geschäftslogik in Services (`src/lib/services/*`) oder Utils.
- Eingaben strikt validieren (Schemas unter `src/lib/validation/schemas/*`); keine stillen Fallbacks.
- Responses gemäß `docs/api/api-guidelines.md` und `docs/api/error-handling.md`; Statuscodes korrekt verwenden.
- Wrapper verpflichtend: `withApiMiddleware` bzw. `withAuthApiMiddleware` einsetzen (`src/lib/api-middleware.ts`).
- Einheitliche JSON‑Shapes nutzen: Erfolg via `createApiSuccess(data)`, Fehler via `createApiError({ type, message, details? })`.
- 405: ausschließlich über `createMethodNotAllowed('GET, POST')` (setzt `Allow`).

## Sicherheit

- AuthN/AuthZ erzwingen (Middleware/Guards). Admin‑Routen besonders restriktiv.
- Rate Limiting anwenden, wo sinnvoll; `src/lib/rate-limiter.ts` respektieren.
- Unsafe Methods (POST/PUT/PATCH/DELETE): Same‑Origin, bei sensiblen Endpunkten Double‑Submit CSRF (`X-CSRF-Token` == Cookie `csrf_token`).
- Sicherheitsheader werden durch Middleware gesetzt (u. a. HSTS, X‑Frame‑Options, Referrer‑Policy, Permissions‑Policy).
- Keine sensiblen Daten im Response‑Body/Logs; PII maskieren.

## Logging

- Kontext: route, requestId, ggf. userId; strukturiert loggen über `logger-utils.ts`.
- Kein übermäßiges Logging im Hot‑Path ohne Feature‑Flag.

## Tests

- Jede neue/angepasste Route bekommt Integrationstests (`tests/integration/api/...`).
- `tests/shared/http.ts` für Requests nutzen; `safeParseJson<T>()` statt direktem `JSON.parse`.
- Same‑Origin + (wo erforderlich) CSRF‑Header in Tests gemäß Baseline setzen.
- Bestehende Fixtures/Seeds wiederverwenden.

## Dokumentation

- `openapi.yaml` und `docs/api/*` bei API‑Änderungen aktualisieren.
