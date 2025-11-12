---
description: 'Praxisleitfaden für Cloudflare-Deployments (Staging & Production) — Deploy ausschließlich via Wrangler CLI'
owner: 'Operations Team'
priority: 'high'
lastSync: '2025-11-06'
codeRefs: '.github/workflows/deploy.yml, package.json, wrangler.toml, scripts/deploy.ts'
testRefs: 'test-suite-v2/playwright.config.ts, tests/integration/'
---

<!-- markdownlint-disable MD051 -->

# Deployment Guide — Cloudflare Workers

Wichtige Änderung: Deployments werden nicht mehr über GitHub Actions ausgeführt. GitHub Actions dienen ausschließlich als Pre‑Release Validierung. Der produktive Rollout erfolgt manuell per Wrangler CLI.

## 1. Voraussetzungen & Checks

### 1.1 Lokale Validierung

Führe vor jedem Release lokal bzw. im Feature-Branch folgende Prüfungen aus:

```bash
npm run openapi:validate
npm run lint
npm run format:check
npm run test:once
npm run test:integration:run
npm run test:e2e:chromium  # optional, falls UI-Änderungen
```

> Hinweis: CI führt dieselben Checks im Job `pre-deploy` aus. Lokale Runs beschleunigen den Feedback-Zyklus.

### 1.2 Environment Secrets & Bindings

Stelle sicher, dass alle Secrets und Bindings in `wrangler.toml` und im Cloudflare Dashboard gepflegt sind:

- **Secrets**: `STYTCH_*`, `TURNSTILE_SECRET_KEY`, `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`, `REPLICATE_API_TOKEN`, AI/Voice Flags (`VOICE_STREAM_SSE`, `VOICE_STREAM_POLL`)
- **Bindings**: `DB` (D1), `R2_AI_IMAGES`, `KV_*` (Session, AI, Voice, Rate Limits)
- **Origins**: `APP_ORIGIN`, `PUBLIC_APP_ORIGIN`, optional `ALLOWED_ORIGINS`
- **Pricing**: `PRICING_TABLE`, `PRICING_TABLE_ANNUAL` mit Live-Price-IDs

## 2. Pre‑Release Validierung (GitHub Actions, kein Deploy)

Workflow-Datei: `.github/workflows/deploy.yml` (umbenannt zu Pre‑Release Validation) und `.github/workflows/quality-gate.yml`.

- Läuft ausschließlich manuell (`workflow_dispatch`) oder bei PR/Push als Quality‑Gate.
- Führt read‑only Prüfungen aus: ESLint (no‑warnings), Prettier‑Check, TypeScript‑Checks, Unit/Integration‑Tests, OpenAPI‑Validierung, `npm audit`, CI‑Build.
- Enthält keinen Deploy‑Schritt mehr; dient als Gate vor manuellem Wrangler‑Deploy.

## 3. Manuelle Deployments (Wrangler CLI)

Verbindlicher Weg für Rollouts ist die Wrangler CLI. Voraussetzung: Pre‑Release Validierung grün.

Option A — Reine Wrangler CLI:

```bash
# Staging
wrangler deploy --env staging

# Production
wrangler deploy --env production
```

Option B — Script‑Wrapper (führt Build + Warmup und dann Wrangler aus):

```bash
npm run deploy:staging      # ruft intern npx wrangler deploy --env staging auf
npm run deploy:production   # ruft intern npx wrangler deploy --env production auf
```

Voraussetzungen:

- Cloudflare‑Zugriff lokal konfiguriert (API Token/Account ID bzw. `wrangler login`).
- Secrets/Bindings in `wrangler.toml` gepflegt (siehe Abschnitt 1.2).

## 4. Post-Deploy Verifikation

Unabhängig vom Pfad (CI oder manuell):

1. **Health Checks**
   - `npm run health-check -- --url https://staging.hub-evolution.com`
   - `npm run health-check -- --url https://hub-evolution.com`

2. **Logs & Monitoring**
   - `npm run tail:staging` oder `npm run tail:prod`
   - UptimeRobot & Healthchecks.io (siehe [Monitoring & Runbook](./monitoring.md))

3. **Functional Smoke** (Production)
   - Magic Link Request (Turnstile aktiv) → `POST /api/auth/magic/request`
   - Image Enhancer Generate/Jobs → `{ success: true }`, Rate Limits korrekt
   - R2 Proxy: Upload + Result URL funktionieren für erlaubte Nutzer, Fremde erhalten 403

4. **Security Spot Checks**
   - Response-Header: HSTS, Referrer-Policy, Permissions-Policy
   - 405-Antworten enthalten `Allow`
   - CSRF-geschützte Endpunkte prüfen `enforceCsrfToken`

## 5. Visuelle Referenzen & Runbook-Ausschnitte

- ![GitHub Actions Deploy Workflow Übersicht](../media/evolution-hub-tools.png)
  - Markierungen: `pre-deploy`, `deploy-staging`, `staging-smokes`, `deploy-production` — helfen beim Troubleshooting, wenn ein Gate hängt.
- Image-Enhancer UI Smoke (Production) – Referenz: ![Image Enhancer Smoke Test](../media/imag-enhancer-preview.png)
  - Erwarteter Zustand nach Deploy: Vergleichsansicht mit Original/Resultat, keine UI-Errors.
- CLI-Runbookauszug (aus [Runbook: Image Enhancer Go-Live](./runbook-image-enhancer-go-live.md)):

  ```bash
  # CSRF-geschütztes Generieren (Ausschnitt aus Abschnitt "Smoke Tests")
  CSRF=$(LC_ALL=C tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
  curl -sS -D headers.txt -o resp.json \
    -H "Origin: $APP_ORIGIN" \
    -H "Cookie: guest_id=$GUEST_ID; csrf_token=$CSRF" \
    -H "X-CSRF-Token: $CSRF" \
    -F "image=@/tmp/eh_test.jpg" \
    --form-string "model=@cf/runwayml/stable-diffusion-v1-5-img2img" \
    "$APP_ORIGIN/api/ai-image/generate"
  ```

  > Erwartung: HTTP 200, `success: true`, Rate-Limit-Header im Normalbereich.

## 5. Rollback & Incident Response

- **Rollback**: Vorheriges Tag via GitHub Release oder `wrangler deploy --env production --branch <tag>`
- **Stripe Webhooks**: Bei Störungen vorübergehend pausieren, nach Fix wieder aktivieren
- **Kommunikation**: Incident-Note erstellen, Status Page (falls vorhanden) aktualisieren

## 6. Häufige Fehlerquellen

| Bereich             | Symptom                                   | Maßnahme                                                                                 |
| ------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| Secrets             | 5xx beim Enhancer, fehlende Stytch-Logins | Secrets in `wrangler.toml` + Dashboard prüfen                                            |
| Staging-Smokes      | Playwright schlägt fehl                   | `npm run test:e2e:chromium` lokal ausführen, Logs checken                                |
| Origin Checks       | `forbidden` bei POST                      | `Origin`-Header und Allowlist (`APP_ORIGIN`, `ALLOWED_ORIGINS`) abgleichen               |
| Stripe Plan Mapping | Nutzerplan bleibt `free`                  | `PRICING_TABLE*` mit Live-IDs aktualisieren, Webhook-Logs prüfen                         |
| Rate Limits         | Spikes in 429                             | Monitor `KV_RATE_LIMIT` (falls KV-Limiter aktiviert) oder Skalenentscheid W1 (Checklist) |

- [Monitoring & Runbook](./monitoring.md)
- [Runbook: Image Enhancer Go-Live](./runbook-image-enhancer-go-live.md)
- [.github/workflows/deploy.yml](../..//.github/workflows/deploy.yml)
- `package.json` (Deploy- und Build-Skripte)

---

**Letzte Aktualisierung:** 2025-11-06 — Überprüfung empfohlen nach Änderungen an Deploy-Workflows oder Infrastruktur.
