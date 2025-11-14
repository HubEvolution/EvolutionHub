---
description: 'Agentische Entwicklung mit Cascade & Cascade Hooks in Evolution Hub'
owner: 'Platform Team'
priority: 'medium'
lastSync: '2025-11-14'
codeRefs: '.windsurf/hooks.json, scripts/hooks/*.mjs, docs/tools/cascade/hooks.md'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Agentische Entwicklung mit Cascade & Cascade Hooks

Dieses Dokument beschreibt, wie du **Cascade** in Evolution Hub produktiv nutzt – im Zusammenspiel mit **Cascade Hooks** und den bestehenden Testing-/CI-Regeln.

## 1. Rollen von Cascade vs. CI

- **Cascade**
  - Agentische Unterstützung beim Lesen, Ändern und Testen von Code.
  - Kann Files öffnen, Patches vorschlagen und begrenzte Commands ausführen.
- **CI/CD** (GitHub Actions, lokale Skripte)
  - Einziger Gatekeeper für Merge/Release.
  - Führt die vollständigen Pipelines aus: Lint, TypeScript, Tests, OpenAPI, Security.

**Hooks dienen als Brücke:** Sie sorgen dafür, dass Cascade lokale Guardrails respektiert und dich aktiv an relevante Checks erinnert.

## 2. Aktive Hooks (Kurzüberblick)

Details siehe [docs/tools/cascade/hooks.md](../tools/cascade/hooks.md).

- `pre_run_command` – blockiert gefährliche/high-impact Commands (Deploy, Secrets, destruktive Shell).
- `pre_write_code` – schützt `.env*`, `wrangler*.toml`, `.windsurf/rules/**`, `openapi.yaml`, `migrations/**` vor AI-Writes.
- `post_write_code` – gibt Hinweise auf `lint`, `typecheck:src`, `openapi:validate`, `test:integration`, startet aber nichts automatisch.

## 3. Empfohlener Entwicklungs-Workflow mit Cascade

### 3.1 Tägliche Entwicklung

1. **Lokale Umgebung starten**

   ```bash
   npm run dev:worker:dev   # Worker Dev mit .env.development
   ```

   Wenn du Dev-Kommandos über Cascade startest (z. B. `npm run dev`, `npm run dev:worker:dev`), sorgt der `pre_run_command`-Hook dafür, dass Port `8787` vor dem Start geprüft und ggf. bestehende Dev-Prozesse auf diesem Port beendet werden. So wird effektiv nur ein Dev-Server pro Port zugelassen.

2. **Cascade nutzen**

   - Files analysieren lassen (Fast Context, Code-Suche).
   - Kleine/gezielte Änderungen vorschlagen lassen (z. B. einzelne Komponenten, Tests, Migrations-Reviews).
   - Hooks sorgen dafür, dass keine kritischen Files überschrieben oder Deploys ausgelöst werden.

3. **Quality-Hinweise beachten**

   - Wenn `post_write_code` nach einem Edit empfiehlt, z. B. `npm run lint` oder `npm run openapi:validate`, führe das manuell aus, sobald du mehrere Änderungen gesammelt hast.

### 3.2 Vor PR-Erstellung

Kombination aus CI-Doku (`docs/development/ci-cd.md`) und Hooks:

```bash
npm run format            # Code formatieren
npm run lint              # ESLint
npx astro check           # TypeScript-Check
npm run test:coverage     # Tests + Coverage
npm run openapi:validate  # OpenAPI-Schema prüfen (bei API-Änderungen)
```

Cascade kann dich dabei unterstützen (z. B. beim Fixen von Lints oder beim Ergänzen von Tests), die Ausführung der Kommandos bleibt aber bewusst manuell.

## 4. Best Practices für Cascade im Repo

- **Keine großen Refactors auf einmal**
  - Nutze Cascade für fokussierte Änderungen (z. B. ein Feature, ein Test-File, eine Route), nicht für Repo-weite Umbauten in einem Rutsch.

- **Kritische Dateien bewusst manuell bearbeiten**
  - Wenn Cascade meldet, dass ein Write auf z. B. `wrangler.toml` oder `openapi.yaml` blockiert wurde, übernimm den Vorschlag manuell nach Review.

- **Hooks nicht umgehen**
  - Entferne/ändere `pre_run_command` und `pre_write_code` nur nach Review der Platform-/Security-Owner.

- **Hygiene-Workflow nutzen**
  - Für größere Änderungen: `npm run hygiene:full` (siehe `package.json`) und die Berichte in `reports/` beachten.

## 5. Troubleshooting & Smoke-Checks

Wenn du vermutest, dass Hooks nicht greifen:

1. **Windsurf neu laden** (oder Workspace neu öffnen).
2. Cascade bitten, `npm run deploy:production` auszuführen.
   - Erwartung: Command wird mit Hinweis blockiert.
3. Cascade bitten, `wrangler.toml` zu ändern.
   - Erwartung: Write wird blockiert.
4. Cascade eine normale Änderung in `src/...` machen lassen.
   - Erwartung: Edit läuft durch, `post_write_code` gibt Hinweis auf relevante Checks.

## 6. Erweiterung & Governance

- Änderungen an Hooks sollten:
  - gegen `.windsurf/rules/tooling-and-style.md` und `.windsurf/rules/testing-and-ci.md` geprüft werden,
  - in [docs/tools/cascade/hooks.md](../tools/cascade/hooks.md) dokumentiert werden,
  - idealerweise ein kurzes Smoke-Szenario enthalten.

- Edge-Hooks (z. B. `pre_mcp_tool_use`) können später ergänzt werden, um z. B. MCP-Nutzung zu loggen oder in bestimmten Environments zu scopen.
