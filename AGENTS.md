# Evolution Hub – AGENTS Leitfaden

## Ziel & Scope

- Arbeite auf dem Astro 5 + Cloudflare Workers Stack mit React-Inseln und Tailwind als beschriebenes Produktfundament; alle Entscheidungen sollten sich am dokumentierten Feature-Set orientieren (`README.md:27-36`).
- Nutze die vorhandene Projekt-Dokumentation als primäre Quelle bevor du neue Anforderungen definierst oder rätst (`docs/README.md:1-43`).
- Halte Beiträge klein und überprüfbar – das Agent-Setup erwartet assistiert-autonome Änderungen in begrenztem Umfang (`CLAUDE.md:318-335`).

## Build/Run/Test-Laufzettel

- Lokales Setup inkl. Datenbank: `npm run setup:local` (ruft `scripts/setup-local-dev.ts`) und `npm run db:migrate` falls nötig (`package.json:15`,`package.json:49-50`).
- Cloudflare Worker-Dev: `npm run dev:worker` baut zuerst den Worker und startet Wrangler auf Port 8787; `npm run dev:worker:dev` erzwingt das Development-Env (`package.json:9-12`).
- Astro-Only Preview: `npm run dev:astro` für reine UI-Iterationen ohne Wrangler (`package.json:13`).
- Build-Artefakte: `npm run build` für den Standard-Build, `npm run build:worker` erzwingt `ASTRO_DEPLOY_TARGET=worker` und kopiert die Assets in `dist/` (`package.json:18-21`).
- Tests (Vitest): `npm run test`, `npm run test:once`, `npm run test:coverage`, sowie fokussierte Läufe wie `npm run test:unit` und `npm run test:integration` (`package.json:24-31`).
- Playwright E2E: Standard über `npm run test:e2e`/`test:e2e:v2`; verwende `test:e2e:chromium|firefox|webkit|mobile` für projektspezifische Läufe (`package.json:32-41`).
- Coverage-Gate: Vitest erzwingt ≥70 % für Statements/Branches/Functions/Lines (`vitest.config.ts:25-33`).
- Lint & Format: `npm run lint` (ESLint) + `npm run format:check` bzw. `npm run format` für Prettier; Markdownlint verfügbar via `npm run lint:md` (`package.json:43-45`,`package.json:61-62`).
- Type-Checks laufen in CI via `npx astro check --tsconfig tsconfig.astro.json`; führe lokal denselben Befehl, um Pipeline-Fehler zu vermeiden (`.github/workflows/unit-tests.yml:142-158`).

## Arbeitsregeln

- Beginne jede Aufgabe mit Analyse und Plan (Scout-Rolle) und dokumentiere Pfad-/Zeilenbelege, bevor du schreibst (`docs/meta/registry.json:461-505`).
- Folge dem in `CONTRIBUTING` beschriebenen Workflow: Issue wählen, Branch von `main`, implementieren, testen, PR erstellen (`CONTRIBUTING.md:65-74`).
- Fokusbereiche stimmen mit dem TypeScript-Include überein: arbeite primär in `src/**` und `tests/**` (`tsconfig.json:34-35`).
- Behalte Repo-Dokumentation und Konfigurationen als Referenz offen; viele Workflows sind in `docs/development/README.md` hinterlegt (`docs/development/README.md:7-116`).

## Code-Qualität

- TypeScript läuft im Strict-Mode, inklusive `noUnusedLocals` und `noUnusedParameters`; Respektiere diese Guards (`tsconfig.json:23-32`).
- ESLint-Regeln erzwingen u. a. Alias-Nutzung (`@/*`), React-Hooks-Checks und `prettier/prettier` Warnungen – halte dich daran (`eslint.config.js:13-46`).
- Prettier formatiert mit `singleQuote`, `semi`, `printWidth 100`; nutze dieselben Optionen (`.prettierrc.json:2-18`).
- Pre-commit läuft über lint-staged (`eslint --fix` + `prettier --write`), also commite nur saubere Dateien (`.lintstagedrc.json:1-4`).
- CI erwartet `npm audit --audit-level=moderate`, Astro-Typecheck, Lint und Tests – gleiche Checks sind in der Deploy-Pipeline obligatorisch (`.github/workflows/unit-tests.yml:66-175`,`.github/workflows/deploy.yml:38-52`).
- Keine PII oder Secrets loggen; maskiere insbesondere E-Mails und Token wie im Auth-Dokument gefordert (`docs/architecture/auth-migration-stytch.md:63-94`).

## Cloudflare Workers

- Worker-Builds setzen `ASTRO_DEPLOY_TARGET=worker` und legen Assets in `dist/`; halte dazu `npm run build:worker` aktuell (`package.json:20`).
- D1-Datenbank steht als `DB` zur Verfügung, mit separaten IDs je Environment (`wrangler.toml:18-47`,`wrangler.toml:185-229`).
- R2-Buckets (`R2_AVATARS`, `R2_LEADMAGNETS`, `R2_AI_IMAGES`) und KV-Namespaces (`SESSION`, `KV_AI_ENHANCER`, `KV_WEBSCRAPER`) sind pro Env definiert – binde sie exakt nach Config ein (`wrangler.toml:48-116`,`wrangler.toml:200-254`,`wrangler.toml:256-309`).
- Secrets gehören in Wrangler-Variablen/Secrets, nicht in den Code (`wrangler.toml:125-147`).

## Rollen

- **Reviewer**: Prüfe Branch-Konvention, PR-Inhalt und dass Lint, Tests, Coverage und Audit laufen; orientiere dich an den PR-Anforderungen in `CONTRIBUTING` (`CONTRIBUTING.md:150-190`) und den Pflicht-Jobs in CI (`.github/workflows/unit-tests.yml:66-175`).
- **Debugger**: Halte das Debug-Panel aktiv (Astro: 4322, Worker: 8787), überwache Log-Levels und nutze die beschriebenen Troubleshooting-Schritte (`docs/development/debug-panel-usage.md:1-169`).

## PR-Flow

- Branch-Namen folgen dem Schema `feature/*`, `bugfix/*`, `hotfix/*`, `release/*`; nutze Kleinbuchstaben und Bindestriche (`CONTRIBUTING.md:79-101`).
- Commit-Messages nutzen Conventional Commits (`CONTRIBUTING.md:104-126`).
- PR-Bodies müssen Änderungen, Tests, Screenshots (falls nötig) und Verknüpfungen dokumentieren; verwende die bereitgestellte Checkliste (`CONTRIBUTING.md:150-190`).
- Stelle vor dem PR sicher, dass lokale Runs `lint`, `format:check`, `test:coverage`, `test:e2e` (falls betroffen) und `npx astro check` bestehen – sie sind Blocking-Gates in CI/Deploy (`.github/workflows/unit-tests.yml:66-175`,`.github/workflows/deploy.yml:38-125`).
- Deployment-PRs respektieren die Staging→Production-Abfolge inklusive Health-Checks und manuellem Approval (`.github/workflows/deploy.yml:54-148`).
