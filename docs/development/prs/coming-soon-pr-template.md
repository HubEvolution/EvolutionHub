# PR-Template und Release-Checklist für Coming-Soon Overlay

Dieses Dokument enthält eine PR-Template-Vorlage, eine Checkliste für Reviewer und ein Beispiel-PR-Text, den du verwenden kannst, wenn du Änderungen am Coming-Soon Feature einreichst.

Dateien, die relevant sind:

- [`src/components/ui/ComingSoon.astro`](src/components/ui/ComingSoon.astro:1)
- [`scripts/coming-soon-client.ts`](scripts/coming-soon-client.ts:1)
- [`public/scripts/coming-soon-client.js`](public/scripts/coming-soon-client.js:1)
- [`src/config/coming-soon.ts`](src/config/coming-soon.ts:1)
- [`src/layouts/BaseLayout.astro`](src/layouts/BaseLayout.astro:1)
- [`src/styles/coming-soon.css`](src/styles/coming-soon.css:1)

PR-Checklist (für Autor)

- [ ] Branch-Name nach Konvention: feature/coming-soon-*
- [ ] Lokale Tests: `npm run dev` startet, Seite /pricing lädt mit Overlay wie erwartet
- [ ] E2E: `npx playwright test tests/e2e/specs/coming-soon.spec.ts` läuft grün
- [ ] Accessibility: Fokus-Trap, Escape, aria-attributes überprüft
- [ ] Styles: Dark Mode und Mobile geprüft
- [ ] Lokalisierung: keys in [`src/locales/de.json`](src/locales/de.json:1) und [`src/locales/en.json`](src/locales/en.json:1) ergänzt
- [ ] Env-Flag: Falls COMING_SOON verwendet wurde, dokumentiert wie es zu toggeln ist
- [ ] Keine sensitive Daten in `public/scripts/coming-soon-client.js`

Reviewer-Checklist (für Reviewer)

- [ ] Sind die Activation-Mechanismen korrekt implementiert? (ENV, Frontmatter, Patterns)
- [ ] Wurde die Overlay-Komponente korrekt in [`src/layouts/BaseLayout.astro`](src/layouts/BaseLayout.astro:1) integriert?
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
- Externalisiertem Client-Script: [`public/scripts/coming-soon-client.js`](public/scripts/coming-soon-client.js:1) (Quelle: [`scripts/coming-soon-client.ts`](scripts/coming-soon-client.ts:1))
- i18n-Keys in [`src/locales/de.json`](src/locales/de.json:1) und [`src/locales/en.json`](src/locales/en.json:1)
- E2E Tests unter `tests/e2e/specs/coming-soon.spec.ts`

Warum
Die Pricing-Seite soll publiziert werden, aber vorläufig mit einem Overlay versehen werden. Das Overlay erlaubt schnelles Publizieren ohne unfertige Inhalte preiszugeben.

Wie getestet
- Lokaler Dev-Server: `npm run dev` → Öffne /pricing
- E2E: `npx playwright test tests/e2e/specs/coming-soon.spec.ts`
- Accessibility: Manuelle Prüfung Fokus/Screenreader

Rollout / Entfernen des Overlays
- Entfernen `comingSoon` Frontmatter in betroffener Seite
- Oder Eintrag aus `src/config/coming-soon.ts` entfernen
- Oder ENV COMING_SOON entfernen
```

Release-Notes / Kurzbeschreibung für Release

- Temporäres Coming-Soon Overlay für nicht-finalisierte Seiten, gesteuert per Frontmatter, zentraler Config oder ENV-Flag. (Siehe [`docs/frontend/coming-soon.md`](docs/frontend/coming-soon.md:1))

Troubleshooting

- Wenn Overlay nicht erscheint: prüfe `COMING_SOON` ENV und `COMING_SOON_PATTERNS`
- Wenn Skript nicht geladen wird: prüfe `/public/scripts/coming-soon-client.js` im gebauten Output und CSP

Ende
