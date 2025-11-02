<!-- markdownlint-disable MD051 -->

# Coming Soon Overlay — Spezifikation, Implementierung und Betrieb (aktualisiert)

Hinweis: Client-Behavior wurde externalisiert. Aktuell eingebundenes Produktions-JS wird unter /public/assets/coming-soon-client.js ausgeliefert; Entwicklungs-Quelle liegt in /scripts/coming-soon-client.ts. Das starke Overlay-Styling kommt aus src/styles/coming-soon.css und wird nur geladen, wenn das Overlay aktiv ist (konditioneller Import in BaseLayout).

## Übersicht

- Komponente: [src/components/ui/ComingSoon.astro](../../src/components/ui/ComingSoon.astro)

- Client script (TS source): [scripts/coming-soon-client.ts](../../scripts/coming-soon-client.ts)

- Client script (prod, genutzt): [public/assets/coming-soon-client.js](../../public/assets/coming-soon-client.js)

- Konfiguration: [src/config/coming-soon.ts](../../src/config/coming-soon.ts)

- Integration: [src/layouts/BaseLayout.astro](../../src/layouts/BaseLayout.astro)

- Lokalisierung: [src/utils/i18n.ts](../../src/utils/i18n.ts)

## Akzeptanzkriterien

1. Overlay wird nur angezeigt, wenn es pro Seite explizit aktiviert ist (`comingSoon: true`).
1. Harte Excludes (z. B. `/datenschutz*`) verhindern die Anzeige immer.
1. Default: Overlay blockiert Interaktion mit Hintergrund (nicht schließbar), CTA führt zur Startseite.
1. Overlay ist i18n‑fähig; Texte stammen aus locale‑keys (`comingSoon.*`).
1. Styling passt zu Dark Mode; responsive auf mobile (zentriert, gut lesbar).
1. Accessibility: `role="dialog"`, `aria-modal="true"`, sinnvolles Label. Bei `dismissible=true` Fokus‑Trap & Escape.

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

- `COMING_SOON_PATTERNS`: bleibt als Referenz im Code erhalten, wird aktuell nicht zur Aktivierung genutzt.

- `isComingSoon(pathname, frontmatter?)`:
  - Harte Excludes haben Vorrang (z. B. `/datenschutz*`).
  - Anzeige nur bei expliziter per‑Page‑Aktivierung (`comingSoon: true`).
  - Keine ENV‑ oder Pattern‑Aktivierung mehr.

## Client‑Script

- Quelle (TypeScript): [scripts/coming-soon-client.ts](../../scripts/coming-soon-client.ts)

- Produktions‑Datei (genutzt): [public/assets/coming-soon-client.js](../../public/assets/coming-soon-client.js)

- Wird nur eingebunden, wenn Overlay aktiv ist:

```html
<script src="/assets/coming-soon-client.js" defer nonce="..."></script>

```text

- Das Script:

  - sperrt body-scroll (body.coming-soon-open)

  - initialisiert Fokus (primärer CTA)

  - optional: Fokus-Trap, Escape zum Schließen, Close-Button Handler

## Deployment / CSP

- Inline-Scripts sind im Repo mit nonces verwendet, aber für prod empfehlen wir externes JS (public) plus strikte CSP (script-src 'self' 'nonce-...').

- Falls Ihr CSP keine nonces erlaubt, muss [public/assets/coming-soon-client.js](../../public/assets/coming-soon-client.js) in der CSP erlaubt werden (z. B. script-src 'self').

## Testanleitung (lokal)

1. Development starten (Wrangler):

   - `npm run dev` (<http://127.0.0.1:8787>)

2. Overlay gezielt prüfen:

   - Auf einer Seite, die `BaseLayout` nutzt, temporär `comingSoon={true}` setzen und Seite laden.

3. E2E/Playwright

   - Führe die existierenden E2E‑Tests aus (z. B. `npx playwright test`) und ergänze bei Bedarf einen Testfall für eine Seite mit `comingSoon={true}`.

## PR‑Checklist (Beispiel)

- [ ] Wurde COMING_SOON deaktiviert für die Seite, bevor PR merged wird?

- [ ] Wurden Änderungen an COMING_SOON_PATTERNS überprüft?

- [ ] Wurde die QA-Checkliste (Accessibility, Kontrast, Mobile) abgehakt?

- [ ] Wurde das externe Script ([public/assets/coming-soon-client.js](public/assets/coming-soon-client.js)) geprüft oder neu gebaut?

## QA‑Checkliste (Kurz)

- [ ] Overlay erscheint ausschließlich via per‑Page‑Enable (`comingSoon`)

- [ ] Kein Interaktionszugriff auf Hintergrund-Inhalte

- [ ] Farbe/Lesbarkeit 4.5:1

- [ ] Screenreader-Lesbarkeit (aria attributes)

- [ ] Mobile Darstellung (small screens)

- [ ] Dark Mode geprüft

- [ ] Dismissible: Close, Escape, Fokus-Zyklen korrekt

## Rollback / Betrieb

- Entferne `comingSoon={true}` aus der betroffenen Seite.

- Harte Excludes (z. B. `/datenschutz*`) bleiben unberührt.

- Bei Problemen: PR revert.

## Dateien zum Review

- [src/components/ui/ComingSoon.astro](../../src/components/ui/ComingSoon.astro)

- [public/assets/coming-soon-client.js](../../public/assets/coming-soon-client.js)

- [src/config/coming-soon.ts](../../src/config/coming-soon.ts)

- [src/layouts/BaseLayout.astro](../../src/layouts/BaseLayout.astro)

- [src/styles/coming-soon.css](../../src/styles/coming-soon.css)

```text
