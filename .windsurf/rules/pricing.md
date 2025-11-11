trigger: always_on
scope: feature
extends:
  - api-and-security.md
  - zod-openapi.md

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

- Admin Plan Overrides (Set‑Plan)
  - Endpoint: `POST /api/admin/users/set-plan`.
  - Orchestriert Stripe‑Abo‑Änderungen (Upgrade/Downgrade); aktualisiert NICHT direkt `users.plan`.
  - Quelle der Wahrheit: `users.plan` wird durch Stripe‑Webhook (`/api/billing/stripe-webhook`) bzw. `/api/billing/sync` gesetzt.
  - Price‑Mapping per Env:
    - `PRICING_TABLE` (monthly), `PRICING_TABLE_ANNUAL` (annual) — JSON‑String oder Objekt (`plan` → `priceId`).
  - Optionen im Request (Zod + OpenAPI abbilden):
    - `interval`: `monthly | annual`
    - `prorationBehavior`: `create_prorations | none`
    - `cancelAtPeriodEnd`: boolean (Downgrade‑Standard: true)
    - `cancelImmediately`: boolean (nur explizit)
  - Sicherheit: `withAuthApiMiddleware`, Same‑Origin + Double‑Submit CSRF, `sensitiveActionLimiter` (Preset).
  - Stripe‑Secret Pflicht für aktive Orchestrierung: `STRIPE_SECRET`, Webhook: `STRIPE_WEBHOOK_SECRET`.

- OpenAPI
  - Relevante Endpunkte/Schemata gepflegt (Requests/Responses, Fehlerformen, CSRF Header wo nötig).
  - AdminSetPlanRequest enthält `interval`, `prorationBehavior`, `cancelAtPeriodEnd`, `cancelImmediately`. Zod↔OpenAPI synchron halten.

## Sollte

- Customer metadata nur minimal; keine freien Textfelder persistieren.
- Observability: Korrelation über Request‑ID/Stripe‑Event‑ID; keine Payload‑Dumps.

## Nicht

- Keine API‑Keys im Client.
- Keine stillen Plan‑Änderungen ohne Event/Beleg.

## Checkliste

- [ ] Webhooks: Signatur geprüft; Idempotency sichergestellt?
- [ ] `users.plan` korrekt über Webhook/Sync aktualisiert; Entitlements greifen in Feature‑Services?
- [ ] Admin Credits: Auth + CSRF + Zod‑Validation vorhanden?
- [ ] Admin Set‑Plan: Stripe‑Orchestrierung aktiv; kein direktes DB‑Update von `users.plan`; Interval/Proration/Cancel‑Flags abgedeckt; `PRICING_TABLE[_ANNUAL]` konfiguriert?
- [ ] OpenAPI aktuell; `openapi:validate` grün?
- [ ] Logging ohne PII?

## Code‑Anker

- `src/pages/api/billing/**`
- [src/pages/api/billing/stripe-webhook.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/api/billing/stripe-webhook.ts:0:0-0:0)
- [src/pages/api/admin/users/set-plan.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/api/admin/users/set-plan.ts:0:0-0:0)
- Entitlements: `src/config/ai-image/entitlements.ts`
- OpenAPI: `openapi.yaml`

## CI/Gates

- `npm run openapi:validate`
- `npm run test:integration` (Billing/Admin; Stripe‑abhängige Tests env‑guarded)
- `npm run lint`

## Referenzen

- Global Rules; API & Security Rules; Zod↔OpenAPI.
- `.windsurf/rules/pricing.md`

## Changelog

- 2025‑11‑02: Admin Set‑Plan (Interval/Proration/Cancel), Webhook SoT, Env‑Mapping + Tests ergänzt.
- 2025‑10‑31: Webhooks/Plans/Entitlements/Admin‑Credits/PII‑Redaction festgelegt.
