<!-- markdownlint-disable MD051 -->

# PR-Template und Release-Checklist für Coming-Soon Overlay

Dieses Dokument enthält eine PR-Template-Vorlage, eine Checkliste für Reviewer und ein Beispiel-PR-Text, den du verwenden kannst, wenn du Änderungen am Coming-Soon Feature einreichst.

Dateien, die relevant sind:

- [`src/components/ui/ComingSoon.astro`](../../src/components/ui/ComingSoon.astro)

- [`scripts/coming-soon-client.ts`](../../scripts/coming-soon-client.ts)

- [`public/assets/coming-soon-client.js`](../../public/assets/coming-soon-client.js)

- [`src/config/coming-soon.ts`](../../src/config/coming-soon.ts)

- [`src/layouts/BaseLayout.astro`](../../src/layouts/BaseLayout.astro)

- [`src/styles/coming-soon.css`](../../src/styles/coming-soon.css)

PR-Checklist (für Autor)

- [ ] Branch-Name nach Konvention: feature/coming-soon-*

- [ ] Lokale Tests: `npm run dev` startet; eine Seite mit `comingSoon={true}` zeigt Overlay wie erwartet

- [ ] E2E: optionaler Spec grün (falls vorhanden)

- [ ] Accessibility: Fokus-Trap, Escape, aria-attributes überprüft

- [ ] Styles: Dark Mode und Mobile geprüft

- [ ] Lokalisierung: keys in [`src/locales/de.json`](../../src/locales/de.json) und [`src/locales/en.json`](../../src/locales/en.json) ergänzt

- [ ] Keine sensiblen Daten in `public/assets/coming-soon-client.js`

Reviewer-Checklist (für Reviewer)

- [ ] Ist die Aktivierung ausschließlich per Page-Prop (`comingSoon`) umgesetzt? (keine ENV-/Pattern-Aktivierung)

- [ ] Wurde die Overlay-Komponente korrekt in [`src/layouts/BaseLayout.astro`](../../src/layouts/BaseLayout.astro) integriert?

- [ ] Wurde das Client-Script externalisiert und CSP-Compliance geprüft?

- [ ] Wurden Tests angepasst/ergänzt (E2E) und sind sie aussagekräftig?

- [ ] Funktioniert das Entfernen des Overlays (Rollback) ohne Build-Änderungen?

Beispiel-PR-Titel
`feat(coming-soon): add coming-soon overlay + external client script`

Beispiel-PR-Beschreibung (kopierbar)

```markdown
Kurzbeschreibung
Implementiert ein wiederverwendbares Coming-Soon Overlay mit:

- Serverseitiger Integration in BaseLayout

- Externalisiertem Client-Script: [`public/assets/coming-soon-client.js`](../../public/assets/coming-soon-client.js) (Quelle: [`scripts/coming-soon-client.ts`](../../scripts/coming-soon-client.ts))

- i18n-Keys in [`src/locales/de.json`](../../src/locales/de.json) und [`src/locales/en.json`](../../src/locales/en.json)

- E2E Tests (optional) unter `tests/e2e/specs/coming-soon.spec.ts`

Warum
Eine Seite soll publiziert werden, aber vorläufig mit einem Overlay versehen werden. Das Overlay erlaubt schnelles Publizieren ohne unfertige Inhalte preiszugeben.

Wie getestet

- Lokaler Dev-Server: `npm run dev` → Seite mit `comingSoon={true}` geöffnet

- E2E: `npx playwright test tests/e2e/specs/coming-soon.spec.ts` (falls vorhanden)

- Accessibility: Manuelle Prüfung Fokus/Screenreader

Rollout / Entfernen des Overlays

- Entfernen `comingSoon` Frontmatter/Prop in der betroffenen Seite

```text

Release-Notes / Kurzbeschreibung für Release

- Temporäres Coming-Soon Overlay für nicht-finalisierte Seiten, gesteuert ausschließlich per Frontmatter `comingSoon`. (Siehe [`docs/frontend/coming-soon.md`](../../docs/frontend/coming-soon.md))

Troubleshooting

- Wenn Overlay nicht erscheint: prüfe `comingSoon`‑Prop/Frontmatter auf der Seite

- Wenn Skript nicht geladen wird: prüfe `/public/assets/coming-soon-client.js` im gebauten Output und CSP

Ende

```text
