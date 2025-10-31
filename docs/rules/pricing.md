# Pricing & Stripe Rules

## Zweck

Saubere Billing‑Integration mit verifizierten Webhooks, plan→Entitlements‑Propagation und minimaler PII‑Exposition.

## Muss

- Webhooks
  - Signaturprüfung (Stripe‑Sig) strikt; Idempotency beachten; nur relevante Events verarbeiten.
  - Kein PII‑Logging (nur IDs/Hashes/Request‑IDs); Fehler stark redaktiert.
- Plans/Entitlements
  - `users.plan` (free/pro/premium/enterprise) maßgeblich; Mapping → Limits/Quoten in Entitlements‑Modul.
  - Checkout/Subscription Events setzen/aktualisieren `users.plan`; Server spiegelt Limits in Feature‑Services (z. B. Enhancer).
- Admin Credits APIs
  - `grant`/`deduct`/`usage` nur für Admin; `withAuthApiMiddleware`; sensibel: Double‑Submit CSRF aktivieren.
  - Validierung über Zod; Fehlerformen konsistent.
- OpenAPI
  - Relevante Endpunkte/Schemata gepflegt (Requests/Responses, Fehlerformen, CSRF Header wo nötig).

## Sollte

- Customer metadata nur minimal; keine freien Textfelder persistieren.
- Observability: Korrelation über Request‑ID/Stripe‑Event‑ID; keine Payload‑Dumps.

## Nicht

- Keine API‑Keys im Client.
- Keine stillen Plan‑Änderungen ohne Event/Beleg.

## Checkliste

- [ ] Webhooks: Signatur geprüft; Idempotency sichergestellt?
- [ ] `users.plan` korrekt aktualisiert; Entitlements greifen in Feature‑Services?
- [ ] Admin Credits: Auth + CSRF + Zod‑Validation vorhanden?
- [ ] OpenAPI aktuell; `openapi:validate` grün?
- [ ] Logging ohne PII?

## Code‑Anker

- `src/pages/api/billing/**`
- Entitlements: `src/config/ai-image/entitlements.ts` (und weitere Feature‑Entitlements)
- Admin Credits: `src/pages/api/admin/credits/**`
- OpenAPI: `openapi.yaml`

## CI/Gates

- `npm run openapi:validate`
- `npm run test:integration` (Billing/Admin)
- `npm run lint`

## Referenzen

- Global Rules; API & Security Rules; Zod↔OpenAPI.
- `.windsurf/rules/pricing.md`

## Changelog

- 2025‑10‑31: Webhooks/Plans/Entitlements/Admin‑Credits/PII‑Redaction festgelegt.
