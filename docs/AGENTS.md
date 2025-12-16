# AGENTS.md (Docs)

Geltung: `docs/**` (Guides, Runbooks, Architecture, API-Docs).

## Baseline-Rules

- `.windsurf/rules/docs-documentation.md` (Frontmatter, Link-Checks, Struktur)
- `.windsurf/rules/tooling-and-style.md` (Markdown/Prettier, keine neuen any)
- `.windsurf/rules/content.md` (falls Content-Typen berührt werden)
- `.windsurf/rules/i18n.md` (wenn Lokalisierung/Locale-Referenzen relevant)

## Richtlinien

- Frontmatter pflegen (Title/Description/Tags), wenn Datei dies nutzt; konsistente Überschriften-Hierarchie.
- Keine toten Links: interne Pfade prüfen; externe Links bevorzugt mit HTTPS.
- Keine Secrets/PII in Beispielen oder Logs.
- Bei API-Änderungen: `openapi.yaml` und `docs/api/*` synchron halten; Fehlerformen gemäß API-Guidelines.
- Changelog/Last-Updated in den jeweiligen Docs aktualisieren, wenn üblich.

## Checks

- Markdownlint/Prettier beachten; keine manuelle TOC-Generierung, falls automatisiert.
- Link-Checks (z. B. `npm run docs:links`) ausführen, wenn betroffen.
