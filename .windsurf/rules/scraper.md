---
trigger: always_on
---

# Webscraper Rules

## Zweck

SSRF‑harter Webscraper mit klaren Netz‑ und Inhalts‑Guardrails, strikter Validierung, Rate‑Limits und aussagekräftigen Fehlern.

## Muss

- SSRF‑Schutz
  - Private/Link‑Local/Loopback IPs blockieren (RFC1918/4193, 127.0.0.0/8, ::1, fe80::/10, etc.).
  - Nur erlaubte Ports (z. B. 80/443) zulassen; exotische/hochriskante Ports blocken.
  - Host‑Namen auflösen und finalen Ziel‑IP‑Bereich prüfen (CNAME/Weiterleitungen beachten).
  - Download‑Timeout & Max‑Size setzen; harte Abbrüche loggen.
- Inhalts‑Validierung
  - Content‑Type Allowlist (z. B. text/html, text/plain, application/json; projektspezifisch ergänzen).
  - Länge/Encoding prüfen; HTML‑Parser nicht auf binäre Daten loslassen.
- Limits & Sicherheit
  - Rate‑Limit strikt (Preset aus `src/lib/rate-limiter.ts`).
  - Same‑Origin/CSRF für unsafe Methods, falls POST verwendet wird.
- Fehlerformen
  - Einheitliche JSON‑Fehler via `createApiError(type, message, details?)`.

## Sollte

- Robots/No‑fetch: Im MVP dokumentieren, ob respektiert; Server entscheidet.
- Dedizierte Fehlertypen für SSRF‑Verstöße (`forbidden`) vs. Validierungsfehler (`validation_error`).

## Nicht

- Keine ungeprüften Weiterleitungen zu internen Adressen.
- Keine große Binärdownloads (ohne expliziten Scope) zulassen.

## Checkliste

- [ ] Interne/Link‑Local/Loopback Ziele zuverlässig blockiert?
- [ ] Port‑Allowlist aktiv?
- [ ] Timeout/Max‑Size greifen?
- [ ] Content‑Type Allowlist enforced?
- [ ] Rate‑Limit/CSRF (falls POST) aktiv?
- [ ] Fehler‑Mapping stimmig (`forbidden` vs. `validation_error`)?

## Code‑Anker

- `src/lib/validation/schemas/webscraper.ts`
- API‑Route(n) unter `src/pages/api/**`
- `src/lib/rate-limiter.ts`

## CI/Gates

- `npm run openapi:validate` (Header/Hinweise dokumentiert)
- `npm run test:integration` (SSRF negative tests)
- `npm run lint`

## Referenzen

- Global Rules; API & Security Rules; Zod↔OpenAPI.
- `.windsurf/rules/scraper.md`

## Changelog

- 2025‑10‑31: SSRF‑Guardrails/Allowlists/Timeouts/Fehlerformen festgelegt.
