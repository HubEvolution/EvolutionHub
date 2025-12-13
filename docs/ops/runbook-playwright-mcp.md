---
description: Playwright MCP Smokes für Staging & Production
owner: platform
priority: medium
lastSync: 2025-11-30
codeRefs:
  - playwright.config.ts
  - wrangler.toml
  - src/lib/auth-helpers.ts
  - src/pages/api/admin/status.ts
  - src/pages/admin/index.astro
  - tests/e2e/specs
testRefs:
  - tests/e2e/specs
---

# Runbook: Playwright MCP (Staging & Production)

## Zweck

Dieses Runbook beschreibt, wie der Playwright-MCP-Server in Windsurf für **staging** und **production** verwendet wird, inklusive:

- getrennte MCP-Server pro Environment
- dedizierte Test-Accounts
- minimale, rein lesende Smoke-Flows (Admin + User)

## Voraussetzungen

- MCP-Config (lokal, nicht im Repo): `~/.codeium/windsurf/mcp_config.json`
  - **Staging**:
    - `mcp-playwright-staging` → `TEST_BASE_URL="https://staging.hub-evolution.com"`
  - **Production**:
    - `mcp-playwright-prod` → `TEST_BASE_URL="https://hub-evolution.com"`
- Repo-Konfiguration:
  - Playwright-Basis: `playwright.config.ts` (Base-URL via `TEST_BASE_URL || BASE_URL`)
  - D1-Bindings und Envs: `wrangler.toml` (`env.staging`, `env.production`)
- Test-Accounts (Production):
  - **MCP Admin**
    - E-Mail: `mcp-admin-prod@hub-evolution.com`
    - Rolle: `admin` (D1: `users.role = 'admin'`)
  - **MCP Test User**
    - E-Mail: `mcp-test-user-prod@hub-evolution.com`
    - Rolle: `user`

## Server-Auswahl in Windsurf

1. MCP-Panel öffnen.
2. Je nach Environment Server wählen:
   - `mcp-playwright-staging` für Staging-Smokes.
   - `mcp-playwright-prod` für Production-Smokes.
3. Wenn die Tool-Liste (z.B. `browser_navigate`, `browser_click`) erscheint, ist der Server aktiv.

## Login-Setup (einmalig pro Environment)

### Staging

- Über `mcp-playwright-staging` im Browser die Staging-Loginseite öffnen.
- Mit einem Admin-Testaccount einloggen → Session wird für Playwright gespeichert.

### Production

- Über `mcp-playwright-prod` zwei Konten verwenden:
  - `mcp-admin-prod@hub-evolution.com` → für Admin-Flows.
  - `mcp-test-user-prod@hub-evolution.com` → für Endnutzer-Flows.
- Login jeweils über die normale Login-UI; keine DB-Hacks.

## Minimal-Smokes: Production (read-only)

> **Wichtig:** Diese Flows machen **nur GET-Requests** und führen **keine** mutierenden Aktionen aus.

### 1. Admin-Smoke (MCP_ADMIN)

Ziel: prüfen, dass Admin-Rolle + Admin-Dashboard in Production funktionieren.

Ablauf (im `mcp-playwright-prod`-Browser, eingeloggt als `mcp-admin-prod@hub-evolution.com`):

1. **Admin-Status-API**
   - URL: `https://hub-evolution.com/api/admin/status`
   - Erwartung: JSON `{ "success": true, data: { user: { email: "mcp-admin-prod@hub-evolution.com", ... } } }`.
   - Kein `forbidden`, kein Redirect.
2. **Admin-Dashboard-UI**
   - URL: `https://hub-evolution.com/admin`
   - Erwartung:
     - Seite lädt mit Kennzahlen, User Insights etc.
     - Kein Redirect zur Loginseite.

Keine Admin-Aktionen (Ban/Delete/Grants) in Prod-MCP-Smokes ausführen.

### 2. User-Smoke (mcp_test_user_prod)

Ziel: Basis-Nutzerflüsse in Prod validieren.

Ablauf (im `mcp-playwright-prod`-Browser, eingeloggt als `mcp-test-user-prod@hub-evolution.com`):

1. **Dashboard**
   - URL: `https://hub-evolution.com/en/dashboard`
   - Erwartung:
     - Dashboard lädt mit Plan "Starter" und Kontingenten.
     - Keine Fehler im Header/Footer.
2. **Tools-Übersicht**
   - URL: `https://hub-evolution.com/en/tools`
   - Erwartung:
     - Tools-Kacheln (Imag-Enhancer, Prompt-Enhancer, Webscraper, Voice, Video, Web-Eval) erscheinen.
     - Keine 5xx-Fehler.

Optional (nur View, keine Aktionen):

- Einzelne Tool-App-Route öffnen, z.B. `https://hub-evolution.com/en/tools/imag-enhancer/app`.

## Sicherheit & Leitplanken

- **Keine** destruktiven Endpunkte über MCP in Production ansteuern:
  - keine Admin-User-Lifecycle-Aktionen (ban/unban/delete),
  - keine Credit-Grants,
  - keine Billing-/Stripe-Schreiboperationen.
- MCP-Admin-Account (`mcp-admin-prod@…`) nur für Monitoring/Read-Smokes nutzen.
- Test-User (`mcp-test-user-prod@…`) nur für sichere Endnutzer-Flows verwenden.

## Troubleshooting

- Wenn `/api/admin/status` `forbidden` liefert:
  - D1 prüfen: `users.role` des MCP_ADMIN ist tatsächlich `admin`.
  - Session eventuell ungültig → neu einloggen.
- Wenn `/admin` zum Login redirectet:
  - Session-Cookie prüfen (Logout/Login über MCP-Browser wiederholen).
- Bei Username-Kollisionen (`_1`-Suffix):
  - D1 selektiv aufräumen (über `wrangler d1 execute ... --remote`) und nur den gewünschten Test-User behalten.
