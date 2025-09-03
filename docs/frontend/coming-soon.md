# Coming Soon Overlay — Spezifikation, Implementierung und Betrieb (aktualisiert)

Hinweis: Client-Behavior wurde externalisiert. Aktuell eingebundenes Produktions-JS wird unter /assets/coming-soon-client.js ausgeliefert; Entwicklungs-Quelle liegt in /scripts/coming-soon-client.ts. Das starke Overlay-Styling kommt aus src/styles/coming-soon.css und wird nur geladen, wenn das Overlay aktiv ist (konditioneller Import in BaseLayout).

## Übersicht

- Komponente: [src/components/ui/ComingSoon.astro](src/components/ui/ComingSoon.astro)
- Client script (TS source): [scripts/coming-soon-client.ts](scripts/coming-soon-client.ts)
- Client script (prod, genutzt): [public/assets/coming-soon-client.js](public/assets/coming-soon-client.js)
- Konfiguration: [src/config/coming-soon.ts](src/config/coming-soon.ts)
- Integration: [src/layouts/BaseLayout.astro](src/layouts/BaseLayout.astro)
- Lokalisierung: [src/utils/i18n.ts](src/utils/i18n.ts)

## Akzeptanzkriterien

1. Overlay wird angezeigt, wenn gilt: ENV override OR page frontmatter OR pattern match (siehe config).
2. Default: Overlay blockiert Interaktion mit Hintergrund (nicht schließbar), CTA führt zur Startseite.
3. Overlay ist i18n-fähig; Texte stammen aus locale-keys (comingSoon.*).
4. Styling passt zu Dark Mode; responsive auf mobile (centered, readable).
5. Accessibility: role dialog, aria-modal true, aria-labelledby oder aria-label gesetzt. Bei dismissible=true Focus-Trap & Escape unterstützt.

## Wichtige Frontmatter-Keys (konkret)

- comingSoon: boolean — aktiviert Overlay
- comingSoonTitleKey: string (optional) — i18n-key für Titel
- comingSoonDescriptionKey: string (optional)
- comingSoonPrimaryCtaKey: string (optional)
- comingSoonPrimaryCtaHref: string (optional)
- comingSoonSecondaryCtaKey: string (optional)
- comingSoonSecondaryCtaHref: string (optional)
- comingSoonDismissible: boolean (optional)

## Zentrale Config

Datei: [src/config/coming-soon.ts](src/config/coming-soon.ts)

- COMING_SOON_PATTERNS: string[] — unterstützt Suffix '*' für Präfix-Matching, z. B. '/pricing*'.
- isComingSoon(pathname, frontmatter?): boolean — Priorität: ENV Override > frontmatter.comingSoon > pattern match.

### Aktive Pattern-Liste (locale‑agnostisch)

Die folgenden Pfade zeigen aktuell das Coming‑Soon Overlay (wirken für /[locale]/... gleichermaßen):

- /login
- /register
- /forgot-password
- /reset-password
- /verify-email
- /email-verified
- /auth/password-reset-sent
- /auth/password-reset-success
- /docs
- /kontakt
- /agb
- /impressum
- /dashboard
- /tools
- /pricing
- /account/settings
- /debug

## Client-Script

- Quelle (TypeScript): [scripts/coming-soon-client.ts](scripts/coming-soon-client.ts)
- Produktions-Datei (genutzt): [public/assets/coming-soon-client.js](public/assets/coming-soon-client.js)
- Wird nur eingebunden, wenn Overlay aktiv ist:

```html
<script src="/assets/coming-soon-client.js" defer nonce="..."></script>

```

- Das Script:
  - sperrt body-scroll (body.coming-soon-open)
  - initialisiert Fokus (primärer CTA)
  - optional: Fokus-Trap, Escape zum Schließen, Close-Button Handler

## Deployment / CSP

- Inline-Scripts sind im Repo mit nonces verwendet, aber für prod empfehlen wir externes JS (public) plus strikte CSP (script-src 'self' 'nonce-...').
- Falls Ihr CSP keine nonces erlaubt, muss [public/assets/coming-soon-client.js](public/assets/coming-soon-client.js) in der CSP erlaubt werden (z. B. script-src 'self').

## Testanleitung (lokal)

1. Development starten (Wrangler):
   - npm run dev (<http://127.0.0.1:8787>)
2. Overlay auf ausgewählten Routen prüfen (Beispiele, jeweils DE/neutral und EN):
   - <http://127.0.0.1:8787/login> und <http://127.0.0.1:8787/en/login>
   - <http://127.0.0.1:8787/docs> und <http://127.0.0.1:8787/en/docs>
   - <http://127.0.0.1:8787/dashboard> und <http://127.0.0.1:8787/en/dashboard>
   - <http://127.0.0.1:8787/tools> und <http://127.0.0.1:8787/en/tools>
   - <http://127.0.0.1:8787/pricing> und <http://127.0.0.1:8787/en/pricing>
3. Optional: Globales Forcieren über ENV
   - Setze COMING_SOON=true und öffne eine beliebige Seite (wirkt global).
4. E2E/Playwright
   - Führe die existierenden E2E-Tests aus (z. B. npx playwright test) und erweitere Tests bei Bedarf für die oben genannten Pfade.

## PR-Checklist (Beispiel)

- [ ] Wurde COMING_SOON deaktiviert für die Seite, bevor PR merged wird?
- [ ] Wurden Änderungen an COMING_SOON_PATTERNS überprüft?
- [ ] Wurde die QA-Checkliste (Accessibility, Kontrast, Mobile) abgehakt?
- [ ] Wurde das externe Script ([public/assets/coming-soon-client.js](public/assets/coming-soon-client.js)) geprüft oder neu gebaut?

## QA Checkliste (Kurz)

- [ ] Overlay erscheint via ENV, Frontmatter, Pattern
- [ ] Kein Interaktionszugriff auf Hintergrund-Inhalte
- [ ] Farbe/Lesbarkeit 4.5:1
- [ ] Screenreader-Lesbarkeit (aria attributes)
- [ ] Mobile Darstellung (small screens)
- [ ] Dark Mode geprüft
- [ ] Dismissible: Close, Escape, Fokus-Zyklen korrekt

## Rollback / Betrieb

- Entfernen/Anpassen betroffener Pfade in COMING_SOON_PATTERNS oder Entfernen von comingSoon: true aus Frontmatter
- ENV COMING_SOON leeren, um globale Aktivierung zu deaktivieren
- Bei Problemen: PR revert oder COMING_SOON_PATTERNS kurzfristig entschärfen

## Dateien zum Review

- [src/components/ui/ComingSoon.astro](src/components/ui/ComingSoon.astro)
- [public/assets/coming-soon-client.js](public/assets/coming-soon-client.js)
- [src/config/coming-soon.ts](src/config/coming-soon.ts)
- [src/layouts/BaseLayout.astro](src/layouts/BaseLayout.astro)
- [src/styles/coming-soon.css](src/styles/coming-soon.css)