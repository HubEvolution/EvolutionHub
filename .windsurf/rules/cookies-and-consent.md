---
trigger: always_on
---

scope: feature
extends:

- api-and-security.md
- auth.md
- project-structure.md

# Cookies & Consent Rules

## Zweck

- Definiert Consent‑Quelle, Event‑Bridge, Analytics‑Gating und Fallbacks.
- Ergänzt die Baselines aus API & Security und Auth (Session/CSRF/PKCE unverändert).

## Muss

- Consent‑Engine: CookieConsent v3 wird im `BaseLayout` initialisiert (CDN JS/CSS).
- Event‑Bridge: Bei Änderungen und initialem Zustand wird `cookieconsent:userpreferencesset` mit `{ necessary, analytics, marketing }` dispatcht.
- Kategorien: `necessary` ist immer `true`. `analytics` und `marketing` werden getrennt verwaltet.
- Analytics‑Gating:
  - Provider (GA/Plausible/CF‑Beacon) laden ausschließlich nach `analytics=true`.
  - Bei `analytics=false` werden Provider aktiv entfernt (Script‑Tags entfernen, globale Funktionen bestmöglich deaktivieren).
  - Bei `marketing=false` wird `fbq('consent','revoke')` aufgerufen (falls vorhanden).
- Fallback:
  - Falls die CookieConsent‑API nicht verfügbar ist, wird lokal persistiert:
    - `localStorage.cookieconsent_status ∈ { 'accept', 'accept_specific' }`
    - `localStorage.cookieconsent_preferences` als JSON `{ necessary, analytics, marketing }`
  - In diesem Fall wird das Bridge‑Event manuell dispatcht.
- Consent‑UI:
  - Buttons: „Einstellungen speichern“, „Alle akzeptieren“, „Alle ablehnen“.
  - Zusätzlich „Consent zurücksetzen“ (löscht Status/Prefs, zeigt Banner erneut).
- Inline‑Scripts:
  - Keine Alias‑Imports (`@/...`) in `type="module"` Inline‑Scripts; nur browser‑kompatibler Code.
- Security‑Baseline unverändert; CSP aus Middleware gilt weiterhin.

## Sollte

- Analytics‑Mocks in Tests nur minimal (kein Produktions‑Tracking).
- E2E‑Consent‑Smokes (DE/EN) optional in CI.

## Checkliste

- [Bridge] BaseLayout initialisiert CookieConsent und dispatcht `cookieconsent:userpreferencesset`.
- [Gating] AnalyticsCoordinator lädt Provider nur nach `analytics=true`.
- [Cleanup] Bei `analytics=false` werden gtag/Plausible/CF‑Beacon entfernt; `providersInitialized=false`.
- [FBQ] Bei `marketing=false` → `fbq('consent','revoke')`.
- [Fallback] localStorage‑Persistenz + manuelles Bridge‑Event vorhanden.
- [UI] „Consent zurücksetzen“ vorhanden (löscht Keys, `reset()`/`show()` + Reload).
- [Inline] Keine Alias‑Imports in Inline‑Scripts.
- [E2E] Consent‑Smoke (EN/DE): Reject→keine Analytics/CF; Accept→Analytics/CF aktiv.

## Code‑Anker

- `src/layouts/BaseLayout.astro`
- `src/components/scripts/AnalyticsCoordinator.astro`
- `src/pages/cookie-einstellungen.astro`
- `src/pages/en/cookie-settings.astro`

## CI/Gates

- Optionaler Playwright‑Smoke für Consent‑Flows (nicht‑blockierend).
- Lint/Typecheck wie üblich.

## Referenzen

- Global Rules
- API & Security Rules
- Auth & OAuth Rules
- Testing & CI Rules
- Project Structure Rules

## Changelog

- 2025‑11‑03: Erstfassung (Bridge/Gating/Fallback/Cleanup/Reset).