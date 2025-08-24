# Coming Soon Overlay — Spezifikation, Implementierung und Betrieb (aktualisiert)

Hinweis: Client-Behavior wurde externalisiert. Produktions-JS ist unter /scripts/coming-soon-client.js; Entwicklungs-Quelle liegt in /scripts/coming-soon-client.ts.

Übersicht
--------
- Komponente: [`src/components/ui/ComingSoon.astro`](src/components/ui/ComingSoon.astro:1)
- Client script (TS source): [`scripts/coming-soon-client.ts`](scripts/coming-soon-client.ts:1)
- Client script (prod): [`public/scripts/coming-soon-client.js`](public/scripts/coming-soon-client.js:1)
- Konfiguration: [`src/config/coming-soon.ts`](src/config/coming-soon.ts:1)
- Integration: [`src/layouts/BaseLayout.astro`](src/layouts/BaseLayout.astro:1)
- Lokalisierung: [`src/locales/de.json`](src/locales/de.json:1), [`src/locales/en.json`](src/locales/en.json:1)

Akzeptanzkriterien
------------------
1. Overlay wird angezeigt, wenn gilt: ENV override OR page frontmatter OR pattern match (siehe config).
2. Default: Overlay blockiert Interaktion mit Hintergrund (nicht schließbar), CTA führt zur Startseite.
3. Overlay ist i18n-fähig; Texte stammen aus locale-keys (comingSoon.*).
4. Styling passt zu Dark Mode; responsive auf mobile (centered, readable).
5. Accessibility: role dialog, aria-modal true, aria-labelledby oder aria-label gesetzt. Bei dismissible=true Focus-Trap & Escape unterstützt.

Wichtige Frontmatter-Keys (konkret)
----------------------------------
- comingSoon: boolean — aktiviert Overlay
- comingSoonTitleKey: string (optional) — i18n-key für Titel
- comingSoonDescriptionKey: string (optional)
- comingSoonPrimaryCtaKey: string (optional)
- comingSoonPrimaryCtaHref: string (optional)
- comingSoonSecondaryCtaKey: string (optional)
- comingSoonSecondaryCtaHref: string (optional)
- comingSoonDismissible: boolean (optional)

Zentrale Config
--------------
Datei: [`src/config/coming-soon.ts`](src/config/coming-soon.ts:1)
- COMING_SOON_PATTERNS: string[] — unterstützt Suffix '*' für Präfix-Matching, z. B. '/pricing*'.
- isComingSoon(pathname, frontmatter?): boolean — Priorität: ENV Override > frontmatter.comingSoon > pattern match.

Client-Script
-------------
- Quelle (TypeScript): `scripts/coming-soon-client.ts`
- Produktions-Datei: `public/scripts/coming-soon-client.js`
- Wird nur eingebunden, wenn Overlay aktiv ist: `<script src="/scripts/coming-soon-client.js" defer nonce=...></script>`
- Das Script:
  - sperrt body-scroll (body.coming-soon-open)
  - initialisiert Fokus (primärer CTA)
  - optional: Fokus-Trap, Escape zum Schließen, Close-Button Handler

Deployment / CSP
----------------
- Inline-Scripts sind im Repo mit nonces verwendet, aber für prod empfehlen wir externes JS (public) plus strikte CSP (script-src 'self' 'nonce-...').
- Falls Ihr CSP keine nonces erlaubt, muss `public/scripts/coming-soon-client.js` in der CSP erlaubt werden (z. B. script-src 'self').

Testanleitung (lokal)
---------------------
1. Development starten:
   - npm run dev
2. Seite mit Overlay öffnen (Pricing):
   - http://localhost:8787/pricing
   - oder setze ENV COMING_SOON=true und öffne jede Seite
3. E2E Tests:
   - npx playwright test tests/e2e/specs/coming-soon.spec.ts

PR-Checklist (Beispiel)
------------------------
- [ ] Wurde `COMING_SOON` deaktiviert für die Seite, bevor PR merged wird?
- [ ] Wurden Änderungen an COMING_SOON_PATTERNS überprüft?
- [ ] Wurde die QA-Checkliste (Accessibility, Kontrast, Mobile) abgehakt?
- [ ] Wurde das externe Script (`public/scripts/coming-soon-client.js`) geprüft oder neu gebaut?

QA Checkliste (Kurz)
--------------------
- [ ] Overlay erscheint via ENV, Frontmatter, Pattern
- [ ] Kein Interaktionszugriff auf Hintergrund-Inhalte
- [ ] Farbe/Lesbarkeit 4.5:1
- [ ] Screenreader-Lesbarkeit (aria attributes)
- [ ] Mobile Darstellung (small screens)
- [ ] Dark Mode geprüft
- [ ] Dismissible: Close, Escape, Fokus-Zyklen korrekt

Rollback / Betrieb
------------------
- Entfernen von `/pricing*` aus `COMING_SOON_PATTERNS` oder Entfernen von `comingSoon: true` aus Frontmatter
- Leeren des ENV COMING_SOON für globale Aktivierung
- Bei Problemen: PR revert oder COMING_SOON patterns anpassen

Dateien zum Review
------------------
- [`src/components/ui/ComingSoon.astro`](src/components/ui/ComingSoon.astro:1)
- [`scripts/coming-soon-client.ts`](scripts/coming-soon-client.ts:1)
- [`public/scripts/coming-soon-client.js`](public/scripts/coming-soon-client.js:1)
- [`src/config/coming-soon.ts`](src/config/coming-soon.ts:1)
- [`src/layouts/BaseLayout.astro`](src/layouts/BaseLayout.astro:1)
- [`src/styles/coming-soon.css`](src/styles/coming-soon.css:1)