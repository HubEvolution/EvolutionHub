# Repository Guidelines

## Project Structure & Module Organization
Evolution Hub is an Astro + Cloudflare Workers app. Runtime source lives under `src/` with UI in `components/` and `pages/`, server handlers in `server/` and shared logic in `lib/`, `stores/`, and `utils/`. Content entries are under `src/content/`, locales in `src/locales/`, and styles in `src/styles/`. Automation and migration scripts live in `scripts/` and `migrations/`. End-to-end assets (fixtures, snapshots, reports) sit alongside tests in `tests/` and `test-suite-v2/`. Built worker files output to `dist/`, while static assets resolve from `public/`.

## Build, Test, and Development Commands
Use `npm run dev:remote` for the default Cloudflare-backed dev server, or `npm run dev:worker:dev` when iterating locally without remote services. `npm run build` emits the Astro worker bundle. Run all unit and integration suites with `npm run test`, or scope to `npm run test:unit` / `npm run test:integration`. Launch Playwright end-to-end checks via `npm run test:e2e` and open the HTML report with `npm run test:e2e:report`. `npm run lint` covers TypeScript/Astro linting, and `npm run format:check` validates Prettier formatting.

## Coding Style & Naming Conventions
The repo targets TypeScript with strict module resolution (`tsconfig.json`) and formats via Prettier (2-space indent, single quotes). Components and stores use PascalCase filenames (`ProfileCard.astro`, `UserStore.ts`); shared utilities stay camelCase (`fetchProfile.ts`). React hooks should be prefixed with `use`. Run `npm run format` before submitting; ESLint rules (see `eslint.config.js`) enforce import ordering, unused checks, and Astro template hygiene.

## Testing Guidelines
Place new unit specs next to the target module under `tests/unit/**` using `*.spec.ts` naming. Integration flows belong in `tests/integration/**`, and UI automation extends Playwright configs in `test-suite-v2/`. Seeded fixtures live in `tests/fixtures/`. Execute `npm run test:coverage` to confirm V8 coverage before large changes; Playwright snapshots should be regenerated with `npm run test:e2e:update-snapshots` when UI baselines shift.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`type(scope): summary`), mirroring existing history (e.g., `refactor(logging): consolidate worker adapters`). Include context in the body for migrations or scripts. PRs should summarize intent, list affected routes or services, link related issues, and attach logs or screenshots for UI updates. Ensure lint/test checks pass locally and note any follow-up work in the PR description.
