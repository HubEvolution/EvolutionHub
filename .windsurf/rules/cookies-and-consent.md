trigger: always_on
scope: feature
extends:

- api-and-security.md
- auth.md
- project-structure.md

# Cookies & Consent Rules

## Zweck

- Definiert Consent-Quelle, Event-Bridge, Analytics‑Gating und Fallbacks.
- Ergänzt die Baselines aus API & Security und Auth (Session/CSRF/PKCE unverändert).

## Muss

- **Consent‑Engine**: CookieConsent v3 wird im `BaseLayout` initialisiert (CDN JS/CSS).
- **Event‑Bridge**: Bei Änderungen und initialem Zustand wird `cookieconsent:userpreferencesset` mit `{ necessary, analytics, marketing }` dispatcht.
- **Kategorien**: `necessary` ist immer `true`. `analytics` und `marketing` werden getrennt verwaltet.
- **Analytics‑Gating**:
  - Provider (GA/Plausible/CF‑Beacon) laden ausschließlich nach `analytics=true`.
  - Bei `analytics=false` werden Provider aktiv entfernt (Script‑Tags entfernen, globale Funktionen bestmöglich deaktivieren).
  - Bei `marketing=false` wird `fbq('consent','revoke')` aufgerufen (falls vorhanden).
- **Fallback**:
  - Falls die CookieConsent‑API nicht verfügbar ist, wird lokal persistiert:
    - `localStorage.cookieconsent_status ∈ { 'accept', 'accept_specific' }`
    - `localStorage.cookieconsent_preferences` als JSON `{ necessary, analytics, marketing }`
  - In diesem Fall wird das Bridge‑Event manuell dispatcht.
- **Consent‑UI**:
  - Buttons: „Einstellungen speichern“, „Alle akzeptieren“, „Alle ablehnen“.
  - Zusätzlich „Consent zurücksetzen“ (löscht Status/Prefs, zeigt Banner erneut).
- **Inline‑Scripts**:
  - Keine Alias‑Imports (`@/...`) in `type="module"` Inline‑Scripts; nur browser‑kompatibler Code.
- **Security‑Baseline unberührt**:
  - Session‑/CSRF‑/PKCE‑Cookies gemäß Auth & API‑Security; Consent‑UI ändert diese nicht.
- **Öffentliche Routen**:
  - `/r2-ai/**` bleibt öffentlich und darf nicht über Consent/Analytics gegatet werden.

## Sollte

- **GA Consent Mode v2**: Wenn GA aktiv, Consent Mode v2 ergänzen (konfigurierbar).
- **DX/UX**:
  - Schlanke Notify‑API (zuerst `window.notify`, Fallback auf `console`).
  - Minimale, redaktierte Logs (keine PII/Consent‑Inhalte).
- **Robuste Bridge**:
  - `try/catch` beim Dispatch/Parse; defensive Default‑Werte.

## Nicht

- **Kein Preload** von Analytics‑Skripten vor Consent.
- **Keine ungeplanten Storage‑Keys** neben den oben genannten.
- **Keine serverseitige Abhängigkeit** von Consent für Auth/Session‑Flows.

## Checkliste

- **[Bridge]** BaseLayout initialisiert CookieConsent und dispatcht `cookieconsent:userpreferencesset`.
- **[Gating]** AnalyticsCoordinator lädt Provider nur nach `analytics=true`.
- **[Cleanup]** Bei `analytics=false` werden gtag/Plausible/CF‑Beacon entfernt; `providersInitialized=false`.
- **[FBQ]** Bei `marketing=false` → `fbq('consent','revoke')`.
- **[Fallback]** localStorage‑Persistenz + manuelles Bridge‑Event vorhanden.
- **[UI]** „Consent zurücksetzen“ vorhanden (löscht Keys, `reset()`/`show()` + Reload).
- **[Inline]** Keine Alias‑Imports in Inline‑Scripts.
- **[E2E]** Consent‑Smoke (EN/DE): Reject→keine Analytics/CF; Accept→Analytics/CF aktiv.

## Code‑Anker

- [src/layouts/BaseLayout.astro](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/layouts/BaseLayout.astro:0:0-0:0)
- [src/components/scripts/AnalyticsCoordinator.astro](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/components/scripts/AnalyticsCoordinator.astro:0:0-0:0)
- [src/pages/cookie-einstellungen.astro](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/cookie-einstellungen.astro:0:0-0:0)
- [src/pages/en/cookie-settings.astro](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/en/cookie-settings.astro:0:0-0:0)

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
