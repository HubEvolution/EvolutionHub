---
description: 'Styleguide für Dokumentationsstruktur, Frontmatter und CI-Checks'
owner: 'Documentation Team'
priority: 'high'
lastSync: '2025-11-03'
codeRefs: 'docs/, scripts/'
---

<!-- markdownlint-disable MD051 -->

# Documentation Style Guide

This guide defines conventions for authoring and maintaining docs in Evolution Hub.

## Routes and Links

- Use code spans for file paths and routes: `src/pages/index.astro`, `/api/auth/magic/request`.

- Do not append line suffixes to links (avoid `(path:1)`).

- Prefer relative links that resolve from the current doc. Example:

  - `../../src/pages/index.astro` from a doc in `docs/frontend/`.

- Legacy UI routes are forbidden in docs text and examples:

  - Disallow: `/auth/login`, `/auth/password-*`, `/reset-password` (UI).

  - Allowed: Deprecated API references under `/api/auth/*` with 410 Gone context.

## Auth flow

- Current auth is Magic Link only. Reference:

  - `POST /api/auth/magic/request`

  - `GET /api/auth/callback`

- When mentioning deprecated endpoints, explicitly state 410 Gone and include `details.Allow` where relevant.

## Markdown formatting

- Headings should be sentence case and consistent with the ToC anchors.

- Surround lists and fenced code blocks with blank lines (markdownlint MD031/MD032).

- Specify a language for fenced code blocks (MD040). Use `mermaid` for diagrams.

- Escape tokens that look like links: write `/[locale]/...` in backticks.

## Diagrams

- Mermaid blocks must start with ` ```mermaid` on its own line.

- Keep diagrams logically synced with the codebase. If a diagram becomes historical, add a note: "Hinweis (historisch): ..." and link to the current flow doc.

## CI enforcement

- `docs:routes:normalize` keeps `routes.md` link targets normalized.

- `scripts/docs-link-audit.mjs` blocks disallowed legacy links and `localhost:4321`.

## Template Standards

### Standard-README-Struktur

Jede Kategorie-README muss folgende Sektionen enthalten:

- **Scope** — Klare Abgrenzung und Zielgruppe

- **Primärdokumente** — Hauptinhalte mit Beschreibungen

- **Cross-Referenzen** — Verwandte Kategorien

- **Ownership & Maintenance** — Owner, Update-Frequenz, Review-Prozess

- **Standards & Konventionen** — Format- und Sync-Regeln

### Frontmatter-Requirements

```yaml
---
description: 'Kurzbeschreibung der Kategorie'
owner: 'Name/Team'
priority: 'high|medium|low'
lastSync: 'YYYY-MM-DD'
codeRefs: 'src/verzeichnis, src/api/endpunkte'
testRefs: 'tests/unit, test-suite-v2'
---

```text

### CI-Prüfungen

- Markdownlint auf gesamten `docs/`-Ordner

- Frontmatter-Validierung (Pflichtfelder)

- Link-Audit (verbotene Legacy-Routen, siehe unten)

- Registry-Konsistenz (Dokumente müssen in `docs/meta/registry.json` verzeichnet sein)

## Legacy Routes (Verboten)

Folgende UI-Routen dürfen **nicht** in Dokumentationstext oder -beispielen verwendet werden:

- `/auth/login`, `/auth/password-*`, `/reset-password` (UI)

- `/register`, `/forgot-password`, `/verify-email` (deprecated UI)

- `localhost:4321` (Dev-Server-Referenzen)

**Erlaubt:** API-Referenzen unter `/api/auth/*` mit explizitem 410-Gone-Kontext.

## Registry-Sync

- Alle Dokumente müssen in `docs/meta/registry.json` verzeichnet sein

- Bei neuen Dokumenten: Registry via `scripts/doc-inventory.mjs` aktualisieren

- CI blockiert bei Registry-Inkonsistenzen

## Markdown-Frontmatter

### Pflichtfelder pro Dokumenttyp

#### Kategorie-READMEs

```yaml
---
description: 'Scope und Zielgruppe'
owner: 'Verantwortlicher'
priority: 'Kritikalität'
lastSync: 'Code-Sync-Datum'
codeRefs: 'Betroffene Code-Pfade'
---
```

#### Feature-Dokumente

```yaml
---
feature: 'Feature-Name'
status: 'implemented|deprecated|planned'
apiRefs: '/api/endpunkte'
testRefs: 'Test-Suites'
---

```text

#### ADR-Dokumente

```yaml
---
status: 'active|deprecated|superseded'
date: 'YYYY-MM-DD'
supersededBy: 'ADR-XXXX' # falls zutreffend
---
```

## Automatisierte CI-Checks

### Pflicht-Frontmatter-Prüfung

```yaml

# docs/.github/workflows/docs-lint.yml

name: Docs Lint
on:
  push:
    paths:

      - 'docs/**'
  pull_request:
    paths:

      - 'docs/**'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:

      - uses: actions/checkout@v3

      - name: Check README Structure
        run: |
          # Prüfe alle README.md auf Standard-Sektionen
          find docs -name "README.md" -exec python scripts/check-readme-structure.py {} \;

      - name: Validate Frontmatter
        run: |
          # Prüfe Pflichtfelder in Frontmatter
          python scripts/validate-frontmatter.py docs/

      - name: Check Legacy Routes
        run: |
          # Verbiete Legacy-UI-Routen in Dokumentation
          python scripts/check-legacy-routes.py docs/

```bash

### Registry-Sync-Validierung

```bash
# scripts/update-docs-registry.sh
#!/bin/bash
# Aktualisiert docs/meta/registry.json mit allen Dokumenten
find docs -name "*.md" -not -path "*/node_modules/*" | \
  scripts/doc-inventory.mjs > docs/meta/registry.json.tmp
mv docs/meta/registry.json.tmp docs/meta/registry.json
```

### Link-Audit-Erweiterung

```bash

# Erweiterte Link-Prüfungen

- Relative Links müssen funktionieren

- Keine Broken Links zu externen Ressourcen

- Keine verbotenen Legacy-Routen (/auth/login, etc.)

- Registry-Konsistenz (alle Docs verzeichnet)

```text

## Maintenance & Review

### Monatliche Reviews

- **Inhaltliche Konsistenz:** Code-Änderungen → Doc-Updates

- **Link-Integrität:** Automatische Broken-Link-Prüfungen

- **Standards-Compliance:** Markdownlint + Custom-Checks

- **Owner-Verifikation:** Frontmatter-Owner stimmen mit Teams überein

### Dokumentations-Debts

- **Technische Debts:** TODOs in Dokumentation tracken

- **Code-Doc-Gaps:** Automatische Erkennung fehlender Dokumentation

- **Archivierung:** Regelmäßige Bereinigung veralteter Dokumente

```text
