# AGENTS.md (Windsurf Rules)

Geltung: `.windsurf/**` (Rules, Templates, Docs).

## Arbeitsprinzipien
- `.windsurf/rules/_README.md` ist Index/Quelle für Kaskade; `_SUMMARY.md` nur Kurzlage.
- Neue/angepasste Rules: Changelog-Abschnitt aktualisieren; Cross-References (`extends`, Links) prüfen.
- Keine Auto-Overwrite-Tools für Rules; Änderungen manuell und minimal-invasiv halten.
- Umfang beschränken: nur repo-relevante Leitplanken, keine generischen Handbücher.

## Format & Qualität
- Klarer Frontmatter-Scope (`scope`, `extends`), konsistente Überschriften.
- Verweise auf Codepfade aktuell halten; keine toten Links.
- Keine Secrets/PII; keine Lizenz-Header hinzufügen.
- Linting/Konsistenz: Markdown-Regeln aus `.windsurf/rules/docs-documentation.md` beachten.

## Tests/Checks
- Bei Regel-Änderungen relevante automatisierte Checks/Docs-Tasks im Blick behalten (`npm run docs:lint`, `docs:links`, falls betroffen).
