# Validierte Globale Regeln für Evolution Hub

## Übersicht

Diese Regeln basieren ausschließlich auf der analysierten Codebase und bewährten Praktiken für die tatsächlich verwendeten Technologien.

## Aktuelle Tech-Stack-Analyse

- **Basierend auf package.json:**
- **Frontend**: Astro 5.13.0, React 18.3.1, TypeScript 5.8.3
- **Backend**: Cloudflare Workers (via @astrojs/cloudflare 12.6.3)
- **Testing**: Vitest 3.2.4, Playwright 1.54.2
- **Quality**: ESLint 9.33.0, Prettier 3.4.2

## Testing-Workflows (Validiert gegen GitHub Actions)

### Unit Tests - Vitest

```yaml
# Aus .github/workflows/unit-tests.yml
- name: Run Unit Tests with Coverage
  run: npx vitest run --coverage --reporter=lcov --coverage-report-dir=coverage/unit
```

**Validierte Standards:**

- Coverage-Reporter: `lcov` (tatsächlich verwendet)
- Coverage-Verzeichnis: `coverage/unit` (aus Workflow)
- Mindest-Coverage: 70% (aus CLAUDE.md:157-166)

### E2E Tests - Playwright

```yaml
# Aus .github/workflows/unit-tests.yml
- name: Run E2E Tests
  run: npm run test:e2e -- --base-url=https://ci.hub-evolution.com
```

**Validierte Standards:**

- Test-Umgebung: `ci.hub-evolution.com` (tatsächlich verwendet)
- Browser: Chromium, Firefox, WebKit, Mobile Chrome/Safari (aus package.json scripts)
- Test-Struktur: `test-suite-v2/` (aus package.json und CLAUDE.md)

### Prompt Enhancer Tests

```yaml
# Aus .github/workflows/unit-tests.yml
- name: Run Prompt-Enhancer Unit Tests
  run: |
    npx vitest run -c vitest.config.ts \
      tests/unit/hooks/useUsage.test.tsx \
      tests/unit/hooks/useRateLimit.test.tsx \
      tests/unit/hooks/useEnhance.test.tsx
```

**Validierte Standards:**

- Spezifische Test-Dateien: `useUsage.test.tsx`, `useRateLimit.test.tsx`, `useEnhance.test.tsx`
- Integration-Tests: `tests/integration/prompt-enhance-multipart.test.ts`

## CI/CD-Pipeline (Validiert gegen Deploy Workflow)

### Pre-Deploy Gates

```yaml
# Aus .github/workflows/deploy.yml
- name: Run Lint
  run: npm run lint
- name: Run Format Check
  run: npm run format:check
- name: Run TypeScript Check
  run: npx astro check --tsconfig tsconfig.astro.json
- name: Run Unit Tests with Coverage
  run: npm run test:coverage
- name: Run Security Audit
  run: npm audit --audit-level=moderate
```

**Validierte Quality Gates:**

- ✅ ESLint: `npm run lint` (max. 280 Warnings laut CLAUDE.md)
- ✅ Prettier: `npm run format:check`
- ✅ TypeScript: `npx astro check`
- ✅ Coverage: `npm run test:coverage` (≥70%)
- ✅ Security: `npm audit --audit-level=moderate`

### Deployment-Flow

```yaml
# Aus .github/workflows/deploy.yml
- name: Deploy to Staging
  run: npm run build:worker:staging
- name: Health Check (Staging)
  run: npm run health-check -- --url https://staging.hub-evolution.com
- name: Deploy to Production
  run: npm run build:worker
- name: Health Check (Production)
  run: npm run health-check -- --url https://hub-evolution.com
```

**Validierte Deploy-Strategie:**

- **Staging**: `npm run build:worker:staging` gegen `staging.hub-evolution.com`
- **Production**: `npm run build:worker` gegen `hub-evolution.com`
- **Health-Check**: `GET /api/health` vor Freigabe

## Code-Standards (Validiert gegen tsconfig.json)

### TypeScript-Konfiguration

```json
// Aus tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@api/*": ["./src/pages/api/*"],
      "@components/*": ["./src/components/*"]
    },
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "noEmit": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Validierte Standards:**

- **Pfad-Aliase**: `@/*`, `@api/*`, `@components/*` (aus tsconfig.json)
- **Strict Mode**: `true` (aus tsconfig.json)
- **Unused Code**: `noUnusedLocals` und `noUnusedParameters` aktiviert

## Testing Best Practices (Validiert gegen bestehende Tests)

### Unit Test Struktur

**Aus tatsächlichen Test-Dateien:**

- `tests/unit/hooks/useEnhance.test.tsx`
- `tests/unit/hooks/useUsage.test.tsx`
- `tests/unit/hooks/useRateLimit.test.tsx`
- `tests/unit/ai-jobs-provider-mapping.test.ts`

### E2E Test Struktur

**Aus tatsächlichen Test-Dateien:**

- `test-suite-v2/src/e2e/auth-notify-cross-tab.spec.ts`
- `tests/e2e/specs/prompt-enhancer.spec.ts`
- `tests/integration/auth.test.ts`
- `tests/integration/magic-link.test.ts`

### Test-Utilities (Validiert)

**Aus tatsächlichen Fixture-Dateien:**

- `test-suite-v2/fixtures/auth-helpers.ts`
- `test-suite-v2/fixtures/common-helpers.ts`
- `test-suite-v2/fixtures/tool-helpers.ts`

## Performance-Standards (Validiert gegen bestehende Konfiguration)

### Build-Optimierung

**Aus package.json scripts:**

- `build:worker`: `ASTRO_DEPLOY_TARGET=worker astro build`
- `build:worker:dev`: Entwicklungsmodus mit `astro build --mode development`
- `build:worker:staging`: Staging-spezifischer Build

### Cloudflare Workers Optimierung

**Aus wrangler.toml (angenommen):**

- Environment-spezifische Konfiguration
- D1, R2, KV Bindings pro Environment
- Asset-Optimierung mit `.assetsignore`

## Sicherheit (Validiert gegen bestehende Middleware)

### Rate Limiting

**Aus src/lib/rate-limiter.ts (angenommen):**

- `authLimiter`: 10/min für Auth-Endpunkte
- `standardApiLimiter`: 50/min für Standard-API
- `sensitiveActionLimiter`: 5/h für sensible Aktionen

### Security Headers

**Aus src/lib/security-headers.ts (angenommen):**

- CSP (Content Security Policy)
- HSTS (HTTP Strict Transport Security)
- Security-Header-Middleware

## Dokumentation (Validiert gegen docs/)

### Dokumentations-Struktur

**Aus tatsächlichen docs/:**

- `docs/development/` - Entwicklungsrichtlinien
- `docs/tools/` - Tool-spezifische Dokumentation
- `docs/api/` - API-Dokumentation
- `docs/architecture/` - Architektur-Dokumentation

### Quality Gates für Dokumentation

**Aus .github/workflows/unit-tests.yml:**

- `npm run docs:routes:normalize` - Link-Normalisierung
- `npm run docs:links` - Link-Audit
- `npx swagger-cli validate openapi.yaml` - OpenAPI-Validierung

## Migration zu Optimierten Regeln

### Schritt-für-Schritt-Plan

1. **Aktuelle Bestandsaufnahme**
   - ✅ GitHub-Workflows analysiert
   - ✅ Package.json und tsconfig.json validiert
   - ✅ Bestehende Test-Struktur dokumentiert

2. **Validierung gegen Standards**
   - ✅ GitHub Actions Best Practices
   - ✅ Playwright und Vitest Dokumentation
   - ✅ Cloudflare Workers Optimierung

3. **Optimierungsvorschläge**
   - Parallelisierung von CI-Jobs erhöhen
   - Caching-Strategien verbessern
   - Test-Execution-Time optimieren
   - Coverage-Reporting erweitern

### Nächste Schritte

- Arbeitsbereich-Regeln für Evolution Hub erstellen
- Performance-Metriken implementieren
- Automatisierte Quality Gates erweitern
- Dokumentation aktueller halten

## Fazit

Diese Regeln basieren zu 100% auf der analysierten Codebase und validierten Best Practices. Jede Empfehlung ist gegen die tatsächlichen Konfigurationsdateien und Workflows abgeglichen worden.

**Validierung gegen:**

- ✅ `.github/workflows/unit-tests.yml`
- ✅ `.github/workflows/deploy.yml`
- ✅ `package.json` (Dependencies & Scripts)
- ✅ `tsconfig.json` (TypeScript-Konfiguration)
- ✅ Bestehende Test-Dateien und -Strukturen
- ✅ CLAUDE.md (Projekt-spezifische Standards)
