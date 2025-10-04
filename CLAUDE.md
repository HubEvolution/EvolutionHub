# CLAUDE.md — Evolution Hub Project Guide

> **Vollständiger Leitfaden für Claude Code (Sonnet 4.5)**
> Last Updated: 2025-01-15

---

## 📋 Projekt-Übersicht

**Evolution Hub** ist eine moderne Full-Stack-Webanwendung für Developer-Tools mit KI-gestützten Features.

### Hauptfeatures

- 🖼 **AI Image Enhancer**: KI-Bildverbesserung (Real-ESRGAN, GFPGAN)
- ✨ **Prompt Enhancer**: Text-zu-Prompt-Optimierung
- 🛠 **Tool-Sammlung**: Wachsende Bibliothek von Developer-Tools
- 🔐 **Stytch Auth**: Magic Link Authentifizierung (passwordless)
- 🌍 **i18n**: Mehrsprachig (DE/EN)

### Live URLs

- **Production**: [hub-evolution.com](https://hub-evolution.com)
- **Staging**: staging.hub-evolution.com
- **Testing/CI**: ci.hub-evolution.com

---

## 🛠 Tech Stack

### Frontend

- **Astro 5** (Insel-Architektur, SSR/SSG) — `package.json:83`
- **React 18** (Interactive Islands) — `package.json:106-107`
- **TypeScript 5** (strict mode) — `package.json:163`, `tsconfig.json:23`
- **Tailwind CSS 3** — `package.json:160`

### Backend & Infrastructure

- **Cloudflare Workers** (Edge Computing) — `astro.config.mjs:76`
- **Cloudflare D1** (SQL Database) — `wrangler.toml:18-24`
- **Cloudflare R2** (Object Storage) — `wrangler.toml:79-97`
- **Cloudflare KV** (Key-Value Store) — `wrangler.toml:100-116`

### Testing & Quality

- **Vitest** (Unit/Integration, Coverage ≥70%) — `package.json:166`, `vitest.config.ts:26-32`
- **Playwright** (E2E, Chromium/Firefox/WebKit) — `package.json:124`, `test-suite-v2/playwright.config.ts:45-65`
- **ESLint** + **Prettier** — `package.json:146,158`, `eslint.config.js:1-67`, `.prettierrc.json:1-19`
- **Husky** (Pre-commit Hooks, aktuell deaktiviert) — `package.json:150`, `.husky/pre-commit:1`

---

## 🎯 Arbeitsmodus & Grenzen

### Scout-Rolle (immer zuerst)

**Vor jedem Edit:**

1. **Analyse**: Glob/Grep/Read → Kontext sammeln
2. **Plan**: Strukturierter Plan mit Pfad-/Zeilenbelegen
3. **Dann**: Edit ausführen

**Context-Quellen** (immer prüfen):

- `package.json`, `tsconfig.json` — Scripts, Paths, Compiler-Optionen
- `eslint.config.js`, `.prettierrc.json` — Code-Qualität
- `astro.config.mjs`, `wrangler.toml` — Build, Cloudflare-Bindings
- `vitest.config.ts`, `test-suite-v2/playwright.config.ts` — Test-Config
- `README.md`, `docs/`, `.windsurf/rules/*.md` — Projekt-Regeln

### Assistiert-autonome Arbeitsweise

**Selbstständig ausführbar:**

- Kleine/mittlere Änderungen (<300 Zeilen, <5 Dateien)
- Bugfixes in bestehendem Code
- Test-Updates bei Logik-Änderungen
- Dokumentations-Patches

**Bestätigung erforderlich bei:**

- API-/Schema-Änderungen
- Security-relevanten Stellen (Rate-Limiting, Auth, Headers)
- DB-Migrations (`migrations/`, Drizzle)
- Neue Dependencies (`npm install`)
- CI/Build-Änderungen (`.github/workflows/`, `astro.config.mjs`, `wrangler.toml`)
- Diffs >300 Zeilen oder >5 Dateien

### Navigation & Dateizugriff

**Navigation:**

- ❌ **Niemals `cd` verwenden** — CWD bleibt im Repo-Root
- ✅ **Absolute Pfade bevorzugen** — `/Users/.../evolution-hub/src/...`

**Dateizugriff:**

- **Große Dateien**: Segmentiert lesen (`limit`/`offset`)
- **Edits**: Kleine, fokussierte Patches
- **Parallelisierung**: Nur Reads parallel, Writes sequentiell
- ❌ **Keine Binärdateien** öffnen (Bilder, PDFs)

**Excludes** (nicht durchsuchen):

- `dist/`, `node_modules/`, `.wrangler/`
- `coverage/`, `.backups/`, `reports/`
- `favicon_package/`

**Fokus-Bereiche**:

- `src/`, `tests/`, `docs/`, `scripts/`, `migrations/`

---

## 💻 Build/Run/Test/Lint – Exakte Scripts

### Development

| Befehl | Beschreibung | Referenz |
|--------|-------------|----------|
| `npm run setup:local` | Lokale Datenbank einrichten | `package.json:15` → `scripts/setup-local-dev.ts` |
| `npm run dev` | **Standard**: Worker-Dev (8787) | `package.json:7` → `dev:worker` |
| `npm run dev:worker` | Build + Wrangler Dev (8787) | `package.json:9` |
| `npm run dev:worker:dev` | Explicit Development-Env | `package.json:10` |
| `npm run dev:astro` | Astro-Only (UI ohne Worker) | `package.json:13` |
| `npm run dev:open` | Auto-Open Browser | `package.json:12` |
| `npm run build` | Standard Astro Build | `package.json:18` |
| `npm run build:worker` | **Worker-Build** (`ASTRO_DEPLOY_TARGET=worker`) | `package.json:20`, `astro.config.mjs:7-12` |
| `npm run build:watch` | Build Watch Mode | `package.json:21` |

**Worker-Build-Detail** (`package.json:20`):

```bash
ASTRO_DEPLOY_TARGET=worker astro build && \
node -e "fs.mkdirSync('dist',{recursive:true}); \
fs.writeFileSync('dist/.assetsignore','_worker.js\n'); \
if (fs.existsSync('dist/_worker.js/assets')) { \
  fs.mkdirSync('dist/assets',{recursive:true}); \
  fs.cpSync('dist/_worker.js/assets','dist/assets',{recursive:true}); \
}"
```

### Testing

#### Vitest (Unit/Integration)

| Befehl | Beschreibung | Referenz |
|--------|-------------|----------|
| `npm test` | **Watch Mode** | `package.json:24` |
| `npm run test:once` | Single Run | `package.json:25` |
| `npm run test:coverage` | **Coverage Report** (≥70% Gate) | `package.json:27`, `vitest.config.ts:26-32` |
| `npm run test:unit` | Unit Watch | `package.json:28` |
| `npm run test:unit:run` | Unit Single Run | `package.json:29` |
| `npm run test:integration` | Integration Watch | `package.json:30` |
| `npm run test:integration:run` | Integration Single Run | `package.json:31` |

**Coverage-Gates** (`vitest.config.ts:26-32`):

```typescript
thresholds: {
  statements: 70,
  branches: 70,
  functions: 70,
  lines: 70,
  perFile: false,
}
```

#### Playwright (E2E)

| Befehl | Beschreibung | Referenz |
|--------|-------------|----------|
| `npm run test:e2e` | **Standard E2E** (v2 Suite) | `package.json:32` → `test-suite-v2/` |
| `npm run test:e2e:v2` | Explizit v2 Suite | `package.json:33` |
| `npm run test:e2e:v1` | Legacy Suite | `package.json:34` |
| `npm run test:e2e:ui` | **UI Mode** | `package.json:36` |
| `npm run test:e2e:chromium` | Chromium-Only | `package.json:37` |
| `npm run test:e2e:firefox` | Firefox-Only | `package.json:38` |
| `npm run test:e2e:webkit` | WebKit-Only | `package.json:39` |
| `npm run test:e2e:mobile` | Mobile Chrome + Safari | `package.json:40` |

**Playwright-Config** (`test-suite-v2/playwright.config.ts:8,71-82`):

```typescript
// BASE_URL
const BASE_URL = process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:8787';

// WebServer (lokale Runs)
webServer: {
  command: 'npm --prefix .. run dev:e2e',
  url: BASE_URL,
  reuseExistingServer: false,
  timeout: 120 * 1000,
  env: {
    E2E_FAKE_STYTCH: '1',
    AUTH_PROVIDER: 'stytch',
  },
}
```

### Code-Qualität

| Befehl | Beschreibung | Referenz |
|--------|-------------|----------|
| `npm run lint` | **ESLint** (max-warnings=280) | `package.json:43`, `eslint.config.js` |
| `npm run format` | **Prettier Write** (Auto-Fix) | `package.json:61` |
| `npm run format:check` | **Prettier Check** | `package.json:62` |
| `npx astro check` | **TypeScript Check** (CI-Befehl) | `.github/workflows/unit-tests.yml:157` |
| `npm audit --audit-level=moderate` | **Security Audit** | `.github/workflows/deploy.yml:51` |

**ESLint-Config** (`eslint.config.js:19,28-38,56-66`):

```javascript
'@typescript-eslint/no-explicit-any': 'warn',  // Z. 19
'no-restricted-imports': [  // Z. 28-38
  'error',
  {
    patterns: [
      {
        group: ['~/*'],
        message: 'Please use the "@/*" alias instead of "~/*" for consistency.',
      },
    ],
  },
],
// no-console nur für migrierte Files (Z. 56-66)
{
  files: [
    'src/pages/api/admin/backup.ts',
    'src/pages/api/comments/performance.ts',
    'src/pages/api/data-export/index.ts',
    'src/middleware.ts',
  ],
  rules: {
    'no-console': ['error', { allow: [] }],
  },
}
```

**Prettier-Config** (`.prettierrc.json:2-8`):

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always"
}
```

### Docs & OpenAPI

| Befehl | Beschreibung | Referenz |
|--------|-------------|----------|
| `npm run lint:md` | Markdown Lint | `package.json:44` |
| `npm run lint:md:fix` | Markdown Lint Auto-Fix | `package.json:45` |
| `npm run openapi:validate` | **OpenAPI Schema-Validierung** | `package.json:46` |

### Database

| Befehl | Beschreibung | Referenz |
|--------|-------------|----------|
| `npm run db:generate` | Drizzle Generate | `package.json:48` |
| `npm run db:migrate` | Drizzle Migrate | `package.json:49` |
| `npm run db:setup` | Setup Local DB | `package.json:50` → `setup:local` |

---

## ☁️ Cloudflare Workers – Regeln & Bindings

### Environments (wrangler.toml)

| Environment | URL | D1 Database | Zeilen |
|-------------|-----|-------------|--------|
| **development** | `http://127.0.0.1:8787` | `evolution-hub-main-dev` | Z. 29-77 |
| **testing** | `ci.hub-evolution.com` | `evolution-hub-main-local` | Z. 212-254 |
| **staging** | `staging.hub-evolution.com` | `evolution-hub-main-local` | Z. 256-309 |
| **production** | `hub-evolution.com` | `evolution-hub-main` | Z. 175-210 |

### Bindings – KEINE implizite Vererbung

**❌ Falsch:**

```toml
# Top-Level Bindings werden NICHT vererbt!
[[d1_databases]]
binding = "DB"
database_name = "evolution-hub-main"
```

**✅ Richtig:**

```toml
# Jede Environment explizit definieren
[env.production]
[[env.production.d1_databases]]
binding = "DB"
database_name = "evolution-hub-main"
database_id = "cadc96d1-712a-4873-8f3d-da87a936f3be"
```

### Binding-Details

#### D1 (Database)

| Environment | Binding | Database Name | Database ID | Zeilen |
|-------------|---------|---------------|-------------|--------|
| development | `DB` | `evolution-hub-main-dev` | `35bd5d4c-718a-43ea-935c-b5d62a686ec2` | Z. 42-46 |
| testing | `DB` | `evolution-hub-main-local` | `11c6dad1-b35b-488e-a5f3-1d2e707afa65` | Z. 225-229 |
| staging | `DB` | `evolution-hub-main-local` | `11c6dad1-b35b-488e-a5f3-1d2e707afa65` | Z. 280-284 |
| production | `DB` | `evolution-hub-main` | `cadc96d1-712a-4873-8f3d-da87a936f3be` | Z. 186-189 |

#### R2 (Object Storage)

| Binding | Dev Bucket | Prod Bucket | Zeilen |
|---------|------------|-------------|--------|
| `R2_AVATARS` | `evolution-hub-avatars-local` | `evolution-hub-avatars` | Z. 48-52, 191-193 |
| `R2_LEADMAGNETS` | `evolution-hub-lead-magnets-dev` | `evolution-hub-lead-magnets` | Z. 53-57, 195-197 |
| `R2_AI_IMAGES` | `evolution-hub-ai-images-local` | `evolution-hub-ai-images` | Z. 58-62, 198-201 |

#### KV (Key-Value)

| Binding | Dev ID | Prod ID | Zeilen |
|---------|--------|---------|--------|
| `SESSION` | `bc180c72cdbe4701a221ab8002f2de72` | `0a9b6b94e5664025a223d4d15ae13cd3` | Z. 63-66, 203-205 |
| `KV_AI_ENHANCER` | `30356dfa83e342c48103609bce4f3320` | `fd1523f570c84ea8bc42cbd397cfdec3` | Z. 68-71, 207-209 |
| `KV_WEBSCRAPER` | `c9814079ac344b979b58278d055ca457` | (nur dev) | Z. 73-76 |

### Secrets & Vars (wrangler.toml)

**Environment Variables** (Development, Z. 31-40):

```toml
[env.development.vars]
ENVIRONMENT = "development"
BASE_URL = "http://127.0.0.1:8787"
APP_ORIGIN = "http://127.0.0.1:8787"
LEADMAGNET_SOURCE = "public"
AUTH_PROVIDER = "stytch"
AUTH_REDIRECT = "/dashboard"
STYTCH_BYPASS = "0"
E2E_FAKE_STYTCH = "0"
STYTCH_CUSTOM_DOMAIN = "login-test.hub-evolution.com"
```

**Secrets** (via Wrangler CLI, `package.json:60`):

```bash
npm run secrets:dev
# → wrangler secret put STYTCH_PROJECT_ID --env development
# → wrangler secret put STYTCH_SECRET --env development
```

**❌ NIEMALS Secrets im Code** (wrangler.toml Z. 125-147):

- STYTCH_PROJECT_ID, STYTCH_SECRET → per `wrangler secret put`
- OPENAI_API_KEY, STRIPE_SECRET_KEY → per GitHub Secrets (CI/CD)
- SITE_PASSWORD → per `wrangler secret put SITE_PASSWORD --env production`

### Assets (wrangler.toml Z. 119-123)

```toml
[assets]
directory = "./dist"  # Worker dient aus dist/
html_handling = "none"
binding = "ASSETS"
run_worker_first = ["/r2-ai/*", "/api/*"]  # Worker-Routen zuerst
```

**`.assetsignore`** (erstellt von `build:worker`, `package.json:20`):

```
_worker.js
```

---

## 📐 Code-Qualität & Standards

### TypeScript (tsconfig.json)

**Compiler-Optionen** (Z. 2-32):

```json
{
  "compilerOptions": {
    "target": "ESNext",  // Z. 3
    "module": "ESNext",  // Z. 4
    "moduleResolution": "Bundler",  // Z. 5
    "jsx": "react-jsx",  // Z. 6
    "jsxImportSource": "react",  // Z. 7
    "strict": true,  // Z. 23 → NO any, strict null checks
    "forceConsistentCasingInFileNames": true,  // Z. 24
    "noUnusedLocals": true,  // Z. 30
    "noUnusedParameters": true,  // Z. 31
    "preserveSymlinks": true  // Z. 32
  }
}
```

**Path Aliases** (Z. 9-20):

```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@api/*": ["./src/pages/api/*"],
    "@components/*": ["./src/components/*"],
    "@layouts/*": ["./src/layouts/*"],
    "@lib/*": ["./src/lib/*"],
    "@pages/*": ["./src/pages/*"],
    "@scripts/*": ["./src/scripts/*"],
    "@styles/*": ["./src/styles/*"],
    "@types/*": ["./src/types/*"]
  }
}
```

**❌ Verboten:** `~/` Imports (eslint.config.js Z. 28-38)
**✅ Erlaubt:** `@/` Imports

### Code-Style

**Naming Conventions:**

```typescript
// camelCase — Variablen, Funktionen
const userName = 'Alice';
function fetchUser() { /* ... */ }

// PascalCase — Klassen, Komponenten, Interfaces
class UserService { /* ... */ }
interface UserProfile { /* ... */ }
export function MyComponent() { /* ... */ }

// UPPER_CASE — Konstanten
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';
```

**Funktionen:**

- **Max. Länge**: 50 Zeilen (Ziel, nicht strikt enforced)
- **Max. Verschachtelung**: 3 Ebenen
- **Single Responsibility**: Eine Funktion = Ein Zweck

**Imports:**

```typescript
// ✅ Korrekt
import { something } from '@/lib/module';
import type { SomeType } from '@/types/user';

// ❌ Verboten (eslint.config.js Z. 28-38)
import something from '~/lib/module';
```

### Pre-Commit Hooks (.husky/pre-commit)

**Status: DEAKTIVIERT** (Z. 1):

```bash
# npx lint-staged  # Disabled for development - use manual quality checks instead
```

**❌ Pre-Commit**: Aus (schnellere Dev)
**✅ CI/CD**: Streng (alle Gates aktiv)

---

## 🧪 Testing-Guidelines

### Test-Struktur

```
tests/
├── unit/                 # Vitest Unit Tests
│   ├── hooks/           # React Hooks Tests
│   ├── services/        # Service-Layer Tests
│   └── utils/           # Utility Tests
├── integration/         # Vitest Integration Tests
│   ├── setup/
│   │   └── global-setup.ts  # Bootstrap (Z. 62)
│   └── *.test.ts
└── e2e/                 # Legacy Playwright

test-suite-v2/
├── src/
│   └── e2e/             # Playwright E2E Tests (v2)
└── playwright.config.ts
```

### Coverage-Gates (vitest.config.ts:12-32)

**Provider & Reporter** (Z. 13-14):

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'lcov'],
```

**Thresholds** (Z. 26-32):

```typescript
  thresholds: {
    statements: 70,
    branches: 70,
    functions: 70,
    lines: 70,
    perFile: false,
  },
```

---

## 🚀 CI/CD-Pipeline

### Pre-Deploy Gates (.github/workflows/deploy.yml:24-52)

**Job: `pre-deploy`** (alle müssen grün):

```yaml
steps:
  - name: Run Lint
    run: npm run lint  # Z. 39

  - name: Run Format Check
    run: npm run format:check  # Z. 42

  - name: Run TypeScript Check
    run: npx astro check --tsconfig tsconfig.astro.json || npx astro check  # Z. 45

  - name: Run Unit Tests with Coverage
    run: npm run test:coverage  # Z. 48

  - name: Run Security Audit
    run: npm audit --audit-level=moderate  # Z. 51
```

### Deployment-Flow (.github/workflows/deploy.yml)

**Trigger** (Z. 3-16):

```yaml
on:
  push:
    tags:
      - 'v*.*.*'  # Z. 5-6
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        type: choice
        options:
          - staging
          - production
        default: 'staging'  # Z. 7-16
```

**Flow:**

1. **Pre-Deploy Gates** (Z. 23-52) → siehe oben
2. **Deploy Staging** (Z. 53-88)
3. **Deploy Production** (Z. 90-126) — **Manual Approval erforderlich**
4. **GitHub Release** (Z. 127-149)

### Health-Check

**Endpoint:**

```
GET /api/health
```

**Response** (200 OK):

```json
{
  "status": "ok",
  "services": {
    "d1": true,
    "kv": true,
    "r2": true
  },
  "duration": "45ms",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "version": "production"
}
```

**Command** (`package.json:72`):

```bash
npm run health-check -- --url <URL>
```

### Rollback-Strategien

**Option 1: Cloudflare Rollback**

```bash
npx wrangler rollback --env production
```

**Option 2: Git Tag Rollback**

```bash
git checkout v1.7.0
npm run build:worker
npx wrangler deploy --env production
```

---

## 🔒 Security-Regeln

### Rate-Limiting (src/lib/rate-limiter.ts, docs/SECURITY.md:40-76)

**Limiter-Definitionen:**

| Limiter | Limit | Window | Verwendung |
|---------|-------|--------|------------|
| `authLimiter` | 10 req/min | 60s | Auth-Endpunkte (`/api/auth/*`) |
| `standardApiLimiter` | 50 req/min | 60s | Normale APIs |
| `sensitiveActionLimiter` | 5 req/h | 3600s | Sensible Aktionen |

**Response bei Limit** (429 Too Many Requests):

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 45
}
```

### Security Headers (middleware, docs/SECURITY.md:14)

**Implementiert:**

- CSP, HSTS (preload), X-Frame-Options (DENY)
- X-Content-Type-Options (nosniff)
- COOP, COEP, Referrer-Policy
- Permissions-Policy (camera/mic/geo empty)

### Audit-Logging (middleware.ts:4,66-70)

**Event-Typen:**

- AUTH_SUCCESS, AUTH_FAILURE, PROFILE_UPDATE
- PERMISSION_DENIED, RATE_LIMIT_EXCEEDED
- SUSPICIOUS_ACTIVITY, API_ERROR, API_ACCESS

**PII-Maskierung** (middleware.ts:6-43):

- IPs anonymisiert (IPv4: letzte Oktett → 0, IPv6: letzte Hextet → 0)
- Cookie/Authorization-Header → `[redacted]`

### API-Middleware (src/lib/api-middleware.ts)

**Wrapper-Pattern:**

```typescript
import { withApiMiddleware, createApiSuccess, createApiError } from '@/lib/api-middleware';

export const POST: APIRoute = withApiMiddleware(async (context) => {
  try {
    const data = await fetchSomeData();
    return createApiSuccess({ data });
  } catch (error) {
    return createApiError({
      type: 'FETCH_ERROR',
      message: 'Failed to fetch data',
      details: error,
    });
  }
});
```

**Response-Shapes:**

**Success** (200 OK):

```json
{
  "success": true,
  "data": { /* ... */ }
}
```

**Error** (4xx/5xx):

```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { /* ... */ }
  }
}
```

---

## 🎭 Rollen-Hinweise

### Scout-Rolle (vor jedem Edit)

**Workflow:**

1. **Analyse**: Glob/Grep/Read → Kontext sammeln
2. **Plan**: Strukturierter Plan mit Pfad-/Zeilenbelegen
3. **Begründung**: Basierend auf Projektregeln
4. **Edit**: Kleine, fokussierte Patches

**Beispiel-Plan-Format:**

```markdown
## Änderung: Neues Rate-Limit für Upload-API

**Betroffene Dateien:**
1. `src/lib/rate-limiter.ts:45-50` — Neuer `uploadLimiter` (20 req/h)
2. `src/pages/api/upload.ts:12` — Anwendung des Limiters
3. `tests/unit/rate-limiter.test.ts:80` — Test für neuen Limiter

**Begründung:**
- docs/SECURITY.md Z. 40-52 definiert Rate-Limiting-Strategie
- Upload-Endpunkt benötigt strengeres Limit (großer Payload)
- Konsistent mit `sensitiveActionLimiter`-Pattern (5 req/h)
```

### Reviewer-Rolle (PR-Checks)

**PR-Checkliste** (CONTRIBUTING.md:150-190):

1. **Branch-Konvention**: `feature/*`, `bugfix/*`, `hotfix/*`, `release/*`
2. **Commit-Messages**: Conventional Commits (`feat:`, `fix:`, etc.)
3. **Lokale Quality-Checks**:

   ```bash
   npm run lint
   npm run format:check
   npx astro check
   npm run test:coverage
   ```

**CI-Gates** (alle müssen grün):

- lint, security, unit, e2e, check, openapi

---

## 📋 Ergebnisform: Plan → Patch

### Workflow

1. **Analyse**: Glob/Grep/Read → Kontext sammeln
2. **Plan**: Strukturierter Plan (Dateien, Zeilen, Begründung)
3. **Bestätigung**: Bei größeren Änderungen
4. **Patch**: Kleine, fokussierte Edits
5. **Commit**: Conventional Commits Format

### Code-Edit-Regeln

**Imports:**

```typescript
// ✅ Imports immer oben, gruppiert
import { something } from '@/lib/module';
import type { SomeType } from '@/types/user';
```

**Typen:**

```typescript
// ✅ Strikte Typisierung
function fetchUser(id: string): Promise<User> { /* ... */ }

// ❌ Kein any
function fetchUser(id: any): any { /* ... */ }  // ESLint warn
```

### Commit-Format

**Conventional Commits:**

```bash
feat: add upload rate limiter (20 req/h)
fix: correct session validation logic
chore: update dependencies
refactor: simplify auth middleware
test: add coverage for rate limiter
docs: update API documentation
```

---

## 🖥️ Terminal-Nutzung

### ✅ Automatisch erlaubt

```bash
# Lesende Operationen
ls, tree, git status, git diff, git log

# Tests
npm test, npm run test:once, npm run test:coverage, npm run test:e2e

# Qualität
npm run lint, npm run format, npm run format:check, npx astro check
```

### ⚠️ Bestätigung erforderlich

```bash
# Dependencies
npm install <package>, npm audit fix

# Git (schreibend)
git push, git commit

# Deployment
wrangler deploy, npm run build, npm run build:worker

# Database
npm run db:migrate, npm run db:generate
```

---

## 📚 Wichtige Dateien – Referenz-Tabelle

| Datei | Zweck | Kritische Zeilen |
|-------|-------|------------------|
| **package.json** | Scripts, Dependencies | Z. 6-73 (Scripts) |
| **tsconfig.json** | TypeScript Config | Z. 9-20 (Paths), Z. 23-32 (Strict) |
| **astro.config.mjs** | Astro Build Config | Z. 7-12 (Worker-Build), Z. 156-169 (Aliases) |
| **wrangler.toml** | CF-Bindings, Envs | Z. 29-77 (dev), Z. 175-210 (prod) |
| **eslint.config.js** | Lint-Regeln | Z. 19 (no-any), Z. 28-38 (no-tilde), Z. 56-66 (no-console) |
| **.prettierrc.json** | Format-Regeln | Z. 2-8 (Core), Z. 10-18 (Astro) |
| **vitest.config.ts** | Test-Config | Z. 26-32 (Coverage-Gates) |
| **test-suite-v2/playwright.config.ts** | E2E-Config | Z. 8 (BASE_URL), Z. 71-82 (WebServer) |
| **.github/workflows/unit-tests.yml** | CI-Tests | Z. 51-228 (Jobs) |
| **.github/workflows/deploy.yml** | Deployment | Z. 38-52 (Gates), Z. 53-149 (Flow) |
| **src/middleware.ts** | Request-Middleware | Z. 1-80 (Security, Auth, Logging) |
| **src/lib/api-middleware.ts** | API-Helpers | Wrapper, Responses, CSRF |
| **src/lib/rate-limiter.ts** | Rate-Limiting | Limiter-Definitionen |
| **.windsurf/rules/*.md** | Cascade-Regeln | Immer aktiv (trigger: always_on) |

---

## 🐛 Bekannte Probleme & Lösungen

### OAuth/Stytch Login-Probleme (Lokal)

**Problem:** OAuth erfolgreich, aber User wird zu `/login` zurückgeleitet statt zum Dashboard

**Ursache:** Session-Cookies werden nicht korrekt über `context.cookies.set()` gesetzt bei HTTP (localhost)

**Lösung:** (implementiert in v1.7.1)
- Cookies explizit im `Set-Cookie` Response-Header setzen
- `__Host-session` nur auf HTTPS verwenden
- Siehe: [docs/ops/stytch-custom-domains.md](docs/ops/stytch-custom-domains.md#9-troubleshooting)

**Code-Pattern:**
```typescript
// Statt nur context.cookies.set():
const cookieValue = `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Lax${isHttps ? '; Secure' : ''}; Max-Age=${maxAge}`;
const response = createSecureRedirect(target);
response.headers.append('Set-Cookie', cookieValue);
return response;
```

**Betroffene Dateien:**
- `src/pages/api/auth/oauth/[provider]/callback.ts:239-242`
- `src/pages/api/auth/callback.ts:231-234`

**Debugging-Tipps:**
1. Check Terminal-Logs: `[auth][oauth][callback] session_id cookie set`
2. Check Response-Headers im Browser: `Set-Cookie: session_id=...`
3. Check Browser-Cookies: Application Tab → Cookies → `session_id` vorhanden?
4. Check Middleware-Logs: `[Middleware] Session ID from cookie { present: true }`

---

## 🔗 Weitere Ressourcen

### Dokumentation

- **Setup**: [README.md](README.md)
- **CI/CD**: [docs/development/ci-cd.md](docs/development/ci-cd.md)
- **Security**: [docs/SECURITY.md](docs/SECURITY.md)
- **Architecture**: [docs/architecture/system-overview.md](docs/architecture/system-overview.md)
- **API Docs**: [docs/api/](docs/api/)
- **Auth Flow**: [docs/architecture/auth-flow.md](docs/architecture/auth-flow.md)
- **Stytch Setup & Troubleshooting**: [docs/ops/stytch-custom-domains.md](docs/ops/stytch-custom-domains.md)

### Contributing

- **Contributing Guide**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Agent-Leitfaden**: [AGENTS.md](AGENTS.md)

### Windsurf Cascade-Regeln

- **.windsurf/rules/project-structure.md** — Projekt-Struktur, Paths
- **.windsurf/rules/api-and-security.md** — API-Middleware, CSRF, Rate-Limiting
- **.windsurf/rules/testing-and-ci.md** — Test-Config, Coverage-Gates
- **.windsurf/rules/tooling-and-style.md** — TypeScript, ESLint, Prettier

---

**Ende des CLAUDE.md-Leitfadens**

> Dieses Dokument ist die vollständige Referenz für KI-Agenten (Claude Code) zur Arbeit im Evolution Hub Projekt. Alle Instruktionen basieren auf tatsächlichen Pfaden, Zeilennummern und Code-Belegen aus dem Repository.
