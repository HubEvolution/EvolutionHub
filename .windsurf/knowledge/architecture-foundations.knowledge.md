# Architekturgrundlagen — Evolution Hub

- **Titel & Geltungsbereich**
  - Globale Middleware, Build-/Adapter-Konfig, Aliasse, Sicherheits- und Header-Policies, grundlegende Projektstruktur (nur evidenzbasiert).

- **Zentrale Abhängigkeiten & Grenzen**
  - **Globale Middleware** `src/middleware.ts`
    - Export `onRequest` via `defineMiddleware` setzt pro Request `requestId`, Protokollierung, `cspNonce` und Locale-Routing.
    - Sicherheits-/Policy-Header auf HTML-Antworten: `Content-Security-Policy` (DEV relaxed, PROD nonce-basiert, nur bei `ENVIRONMENT === 'production'`), `Strict-Transport-Security`, `Cross-Origin-Opener-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Permissions-Policy`.
    - Locale-Regeln: Neutral → `/en/*` basierend auf Cookie/Referer; `/de/*` wird kanonisiert; `pref_locale`-Cookie gesetzt/gesynct; Splash-/Welcome-Gate nur auf sichtbaren Seiten; Auth-Routen ausgenommen.
    - Auth-Kontext: liest Session-Cookies (`__Host-session` bevorzugt, Fallback `session_id`), ruft `validateSession()` aus `@/lib/auth-v2`, schreibt `locals.user`/`locals.session`.
    - Tool-spezifische Policy: `Permissions-Policy` für Mikrofon auf `/(de|en)?/tools/voice-visualizer(/app)?` geöffnet.
  - **Astro/Adapter** `astro.config.mjs`
    - Adapter `@astrojs/cloudflare` (mode `directory`), `output: 'server'` (Worker-Ziel), `site: 'http://localhost:8787'`.
    - `staticAssetHeaders` setzt DEV-CSP auf prerenderte HTMLs und Content-Types/Cache-Header für `*.css/js/svg/webmanifest`.
    - Vite-Aliasse: `@/lib`, `@/components`, `@api/*` etc. (siehe `vite.resolve.alias`).
  - **TypeScript Aliasse** `tsconfig.json`
    - `paths` definieren `@/*`, `@api/*`, `@components/*`, … (strikter TS: `strict`, `noUnused*`).
  - **Projektstruktur (belegt)**
    - Laufzeitcode unter `src/`: UI (`components/`, `layouts/`, `pages/`), Services `src/lib/services/**`, Middleware `src/middleware.ts`.

- **Cross-Domain-Beziehungen**
  - Middleware beeinflusst alle Routen (Locale, Sicherheits-Header), interagiert mit Auth (`@/lib/auth-v2`) und setzt Policy-Ausnahmen für Voice-Tool.
  - Adapter-Header (CSP/Content-Type/Cache) ergänzen Middleware für statische/prerenderte Inhalte.

- **Bekannte Risiken/Code-Smells (aus Codeanalyse)**
  - **Doppelte Policy-Orte**: CSP/Policy-Header sowohl in `src/middleware.ts` als auch via `astro.config.mjs` (DEV-CSP für statische HTMLs). Abdeckung ist beabsichtigt, erfordert jedoch Sorgfalt, um Konflikte zu vermeiden.
  - **R2-Proxy vorhanden**: `/r2-ai/[...path].ts` existiert und wird in `src/middleware.ts` via `isR2Proxy` von Gates/Redirects ausgenommen; weiter durch Tests absichern (Owner‑Gate, Header, Cache).
  - **Middleware-Komplexität**: Viele Zweige (Locale/Splash/Auth/CSP). Änderungen sollten durch Integration/E2E-Tests abgesichert werden.

- **Empfohlene Best Practices**
  - **Single Source for CSP**: PROD-Nonce-CSP strikt in `src/middleware.ts` halten; DEV-CSP in `astro.config.mjs` nur für statische HTMLs verwenden. Keine zusätzlichen CSPs in API-Antworten (siehe Kommentar in `src/lib/api-middleware.ts`).
  - **Locale-Redirects testen**: E2E-Abdeckung für neutral→EN, `/de/*`-Normalisierung und Splash-Gate sicherstellen.
  - **R2-Proxy prüfen**: Implementierung/Existenz von `src/pages/r2-ai/[...path].ts` o. ä. verifizieren; Route öffentlich halten (Tool-Routen und Proxies dürfen nicht durch Gates blockiert werden).
  - **Aliasse konsistent**: Neue Module unter `@/` registrieren; keine `~/*`-Importe verwenden.
