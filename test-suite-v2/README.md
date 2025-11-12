# Test-Suite v2 - Umfassende Test-Infrastruktur

Eine vollständig neue, skalierbare und wartbare Test-Suite für die Evolution Hub Anwendung, entwickelt parallel zur bestehenden Test-Infrastruktur.

## 📋 Übersicht

Diese Test-Suite v2 bietet eine moderne, typisierte und umfassende Test-Infrastruktur mit folgenden Hauptmerkmalen:

- **🏗️ Modulare Architektur** - Klare Trennung zwischen Unit-, Integration- und E2E-Tests
- **🔧 Umfassende Utilities** - Wiederverwendbare Helper für Datenbank, Server und Logging
- **📊 Intelligente Berichterstattung** - Mehrere Formate (HTML, JSON, XML, Markdown)
- **🎯 Typisierte Testdaten** - Strukturiertes Management von Test-Fixtures
- **⚡ Parallele Ausführung** - Optimierte Performance durch Parallelisierung
- **🔒 Sicherheits-Tests** - Integrierte Sicherheitstests und Validierungen
- **📈 Performance-Monitoring** - Detaillierte Performance-Metriken
- **🔄 CI/CD Integration** - Vollständige GitHub Actions Pipeline

## 📁 Projektstruktur

```
test-suite-v2/
├── config/                 # Zentrale Konfiguration
│   ├── test-config.ts     # Hauptkonfiguration
│   ├── test-setup.ts      # Globale Test-Setup
│   ├── vitest.config.ts   # Vitest-Konfiguration
│   └── playwright.config.ts # Playwright-Konfiguration
├── src/                   # Test-Quellcode
│   ├── unit/             # Unit-Tests
│   │   └── utils/        # Utility-Tests
│   ├── integration/      # Integration-Tests
│   │   └── auth/         # Authentifizierungs-Tests
│   └── e2e/              # E2E-Tests
│       └── auth/         # E2E Authentifizierungs-Tests
├── data/                  # Testdaten-Management
│   └── test-data-manager.ts # Daten-Manager
├── utils/                 # Gemeinsame Utilities
│   ├── logger.ts         # Logging-System
│   ├── database-helpers.ts # DB-Helper
│   └── server-helpers.ts # Server-Mocking
├── scripts/               # Build- und Utility-Scripts
│   └── generate-report.ts # Berichts-Generator
├── fixtures/              # Statische Test-Fixtures
├── reports/               # Generierte Berichte
├── coverage/              # Coverage-Berichte
├── types/                 # TypeScript-Typen
└── .github/workflows/     # CI/CD-Pipelines
    └── ci.yml            # GitHub Actions Workflow
```

## 🚀 Schnellstart

### Voraussetzungen

- Node.js 18+
- npm oder yarn
- PostgreSQL (für Integration-Tests)
- Git

### Installation

```bash
# Repository klonen
git clone <repository-url>
cd evolution-hub

# In Test-Suite-Verzeichnis wechseln
cd test-suite-v2

# Abhängigkeiten installieren
npm install

# TypeScript kompilieren
npm run build

# Tests ausführen
npm test
```

### Erste Tests ausführen

```bash
# Alle Tests ausführen
npm run test:ci

# Nur Unit-Tests
npm run test:unit

# Nur Integration-Tests
npm run test:integration

# Nur E2E-Tests
npm run test:e2e

# Mit Coverage
npm run test:coverage
```

## 🧪 Test-Typen

### Unit-Tests

Testen einzelne Funktionen und Module isoliert:

```typescript
import { describe, it, expect } from 'vitest';
import { TestLogger } from '../../../utils/logger';

describe('TestLogger', () => {
  it('sollte Nachrichten korrekt loggen', () => {
    const logger = new TestLogger();
    logger.info('Test message');

    expect(logger.getLogs()).toHaveLength(1);
  });
});
```

### Integration-Tests

Testen die Interaktion zwischen mehreren Komponenten:

```typescript
import { describe, it, expect } from 'vitest';
import { setupTestDatabase, makeTestRequest } from '../../../utils/database-helpers';
// ... weitere Imports

describe('Authentifizierung - Integration', () => {
  it('sollte vollständigen Auth-Flow unterstützen', async () => {
    // Setup
    const testDb = await setupTestDatabase();
    const testServer = await setupTestServer();

    // Test
    const response = await makeTestRequest(testServer, 'POST', '/api/auth/login', {
      body: { email: 'admin@test-suite.local', password: 'AdminPass123!' },
    });

    // Assertions
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');

    // Cleanup
    await teardownTestServer(testServer);
    await teardownTestDatabase(testDb);
  });
});
```

### E2E-Tests

Testen komplette User-Flows im Browser:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Benutzer-Authentifizierung', () => {
  test('sollte erfolgreichen Login ermöglichen', async ({ page }) => {
    await page.goto('/de/login');

    await page.fill('input[name="email"]', 'admin@test-suite.local');
    await page.fill('input[name="password"]', 'AdminPass123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('**/dashboard');
    await expect(page.locator('text=/dashboard|übersicht/')).toBeVisible();
  });
});
```

## 📊 Testdaten-Management

### Factory-Pattern für dynamische Daten

```typescript
import { testDataHelpers } from '../data/test-data-manager';

// Zufälligen Benutzer erstellen
const user = testDataHelpers.createRandomUser({
  role: 'admin',
  verified: true,
});

// Mehrere Projekte erstellen
const projects = testDataHelpers.createRandomProjects(5, [
  { status: 'active' },
  { status: 'completed' },
]);
```

### DataSets für statische Daten

```typescript
import { getTestDataManager } from '../data/test-data-manager';

const dataManager = getTestDataManager();

// DataSet laden
const authData = dataManager.loadDataSet('auth-basic');

// Neue Daten generieren
const userProfile = dataManager.generateFromTemplate('user-profile', {
  role: 'premium',
  verified: true,
});
```

## 📈 Berichterstattung

### Automatische Berichts-Generierung

```bash
# Berichte generieren
npm run report:generate

# Mit spezifischen Formaten
npm run report:generate -- --formats html,json,markdown
```

### Berichts-Formate

- **HTML**: Interaktive Web-Berichte mit Diagrammen
- **JSON**: Maschinenlesbare Daten für CI/CD
- **XML**: JUnit-kompatibel für Test-Tools
- **Markdown**: Dokumentations-freundlich

### Beispiel-Bericht

```bash
📊 Test-Suite v2 - Zusammenfassungsbericht

## Gesamtübersicht
- Generiert am: 28.08.2025, 14:17
- Anzahl Suites: 3
- Gesamtdauer: 1247ms

## Gesamtergebnisse
| Metrik | Wert |
|--------|------|
| Gesamt Tests | 47 |
| Bestanden | 45 ✅ |
| Fehlgeschlagen | 2 ❌ |
| Erfolgsrate | 95.74% |

## Empfehlungen
✅ Alle Tests sind bestanden
```

## ⚙️ Konfiguration

### Umgebungsvariablen

```bash
# Basis-Konfiguration
NODE_ENV=test
TEST_BASE_URL=http://localhost:3000
TEST_API_URL=http://localhost:3000/api

# Datenbank
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/test_db

# JWT
TEST_JWT_SECRET=test-jwt-secret-key

# Timeouts
TEST_API_TIMEOUT=10000
TEST_PAGE_TIMEOUT=30000

# Coverage
TEST_COVERAGE_ENABLED=true
TEST_COVERAGE_GLOBAL=80

# Reporting
TEST_REPORTING_ENABLED=true
TEST_REPORT_FORMATS=html,json,markdown

# Parallelisierung
TEST_PARALLEL_ENABLED=true
TEST_PARALLEL_WORKERS=4
```

### Konfigurationsdatei

```typescript
// config/test-config.ts
export const testConfig = {
  environment: {
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
    // ... weitere Konfiguration
  },
  timeouts: {
    api: 10000,
    page: 30000,
    // ... weitere Timeouts
  },
  // ... weitere Konfiguration
};
```

## 🔧 Entwicklung

### Neue Tests hinzufügen

1. **Unit-Test**: `src/unit/[module]/[test].test.ts`
2. **Integration-Test**: `src/integration/[feature]/[test].test.ts`
3. **E2E-Test**: `src/e2e/[feature]/[test].spec.ts`

### Test-Utilities erweitern

```typescript
// utils/custom-helpers.ts
export class CustomTestHelper {
  static async setupCustomEnvironment() {
    // Custom setup logic
  }

  static async teardownCustomEnvironment() {
    // Custom cleanup logic
  }
}
```

### Neue Testdaten hinzufügen

```typescript
// data/custom-data.ts
import { getTestDataManager } from './test-data-manager';

const dataManager = getTestDataManager();

// Neue Factory registrieren
dataManager.registerFactory('custom-entity', {
  create: (overrides = {}) => ({
    id: faker.number.int(),
    name: faker.company.name(),
    ...overrides,
  }),
  createMany: (count) => Array.from({ length: count }, () => factory.create()),
  reset: () => faker.seed(12345),
});
```

## 🚀 CI/CD Integration

### GitHub Actions Workflow

Die Test-Suite ist vollständig in GitHub Actions integriert:

```yaml
# .github/workflows/ci.yml
name: Test Suite v2 CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    # Unit-Test-Job
  integration-tests:
    # Integration-Test-Job
  e2e-tests:
    # E2E-Test-Job
  quality-gate:
    # Qualitäts-Validierung
```

### Quality Gates

- **Coverage Threshold**: Mindestens 80% Code-Coverage
- **Test Success Rate**: Mindestens 95% der Tests müssen bestehen
- **Performance Benchmarks**: Response-Zeiten unter definierten Grenzwerten
- **Security Scans**: Keine kritischen Sicherheitslücken

## 📚 Best Practices

### Test-Struktur

```typescript
describe('Feature: User Authentication', () => {
  describe('Happy Path', () => {
    it('should authenticate valid user', async () => {
      // Test logic
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid credentials', async () => {
      // Test logic
    });

    it('should handle expired tokens', async () => {
      // Test logic
    });
  });

  describe('Error Scenarios', () => {
    it('should handle network errors', async () => {
      // Test logic
    });
  });
});
```

### Testdaten-Handling

```typescript
// ❌ Schlecht: Hartkodierte Daten
const user = { email: 'test@example.com', password: '123456' };

// ✅ Gut: Dynamische Testdaten
const user = testDataHelpers.createRandomUser({
  verified: true,
  role: 'user',
});
```

### Assertions

```typescript
// ❌ Schlecht: Mehrere Assertions in einem Test
it('should validate user', () => {
  expect(user.email).toBe('test@example.com');
  expect(user.name).toBe('Test User');
  expect(user.role).toBe('admin');
});

// ✅ Gut: Klare, spezifische Assertions
describe('User Validation', () => {
  it('should have valid email', () => {
    expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('should have required name', () => {
    expect(user.name).toBeTruthy();
    expect(user.name.length).toBeGreaterThan(1);
  });

  it('should have valid role', () => {
    expect(['user', 'admin', 'premium']).toContain(user.role);
  });
});
```

## 🔍 Debugging

### Test-Fehlersuche

```bash
# Einzelnen Test ausführen
npm run test:unit -- src/unit/utils/logger.test.ts

# Mit Debug-Ausgabe
DEBUG=test-suite:* npm run test:unit

# Coverage für spezifischen Test
npm run test:unit -- --coverage src/unit/utils/logger.test.ts
```

### E2E-Test Debugging

```bash
# Playwright UI öffnen
npm run test:e2e -- --ui

# Screenshots bei Fehlern
npm run test:e2e -- --screenshot only-on-failure

# Videos aufzeichnen
npm run test:e2e -- --video retain-on-failure
```

## 📋 API-Referenz

### TestDataManager

```typescript
class TestDataManager {
  loadDataSet(id: string): TestDataSet | null;
  saveDataSet(dataSet: TestDataSet): void;
  getFactory<T>(type: string): DataFactory<T> | null;
  generateFromTemplate(name: string, context?: any): any;
  exportDataSets(filePath: string): void;
  importDataSets(filePath: string): void;
}
```

### TestLogger

```typescript
class TestLogger {
  error(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  info(message: string, data?: any): void;
  debug(message: string, data?: any): void;
  getLogs(level?: LogLevel): LogEntry[];
  clearLogs(): void;
}
```

### Server-Helper

```typescript
function setupTestServer(): Promise<TestServer>;
function teardownTestServer(server: TestServer): Promise<void>;
function makeTestRequest(
  server: TestServer,
  method: string,
  path: string,
  options?: RequestOptions
): Promise<TestResponse>;
```

## 🤝 Beitrag

### Entwicklungs-Workflow

1. **Branch erstellen**: `git checkout -b feature/new-test-suite`
2. **Tests schreiben**: Neue Tests in entsprechenden Verzeichnissen
3. **Tests ausführen**: `npm run test:ci`
4. **Coverage prüfen**: `npm run test:coverage`
5. **Berichte generieren**: `npm run report:generate`
6. **Commit und Push**: `git commit -m "Add new test suite" && git push`
7. **PR erstellen**: Mit detaillierter Beschreibung

### Code-Standards

- **TypeScript**: Strenge Typisierung, keine `any`-Types
- **ESLint**: Alle Linting-Regeln müssen eingehalten werden
- **Prettier**: Automatische Code-Formatierung
- **Testing**: Mindestens 80% Coverage für neuen Code
- **Dokumentation**: JSDoc-Kommentare für alle öffentlichen APIs

## 📄 Lizenz

MIT License - siehe [LICENSE](../LICENSE) für Details.

## 🆘 Support

### Häufige Probleme

**Q: Tests schlagen mit "Module not found" fehl**
A: Stellen Sie sicher, dass alle Abhängigkeiten installiert sind: `npm install`

**Q: Coverage-Berichte werden nicht generiert**
A: Überprüfen Sie die Coverage-Konfiguration in `vitest.config.ts`

**Q: E2E-Tests finden Elemente nicht**
A: Verwenden Sie `await page.waitForLoadState('networkidle')` vor Interaktionen

### Support-Kanäle

- 📧 **Email**: test-suite@evolution-hub.local
- 💬 **Slack**: #test-suite-v2
- 📖 **Dokumentation**: [Interne Wiki](https://wiki.evolution-hub.local/test-suite)
- 🐛 **Issues**: [GitHub Issues](https://github.com/evolution-hub/test-suite-v2/issues)

---

## 🎯 Roadmap

### Geplante Features

- [ ] **Visual Regression Tests** - Screenshot-Vergleiche mit Percy/Applitools
- [ ] **Load Testing** - Integration mit k6 für Performance-Tests
- [ ] **Contract Testing** - API-Vertrags-Tests mit Pact
- [ ] **Accessibility Testing** - Automatisierte A11Y-Tests mit axe-core
- [ ] **Mobile Testing** - Erweiterte Mobile-Geräte-Unterstützung
- [ ] **Container Testing** - Docker-basierte Test-Umgebungen
- [ ] **Chaos Engineering** - Resilienz-Tests mit Chaos Monkey
- [ ] **AI-Powered Testing** - ML-basierte Test-Optimierung

### Performance-Ziele

- **Test-Ausführung**: < 5 Minuten für vollständige Suite
- **Coverage-Generierung**: < 2 Minuten
- **Berichts-Erstellung**: < 1 Minute
- **Parallelisierung**: 4x Geschwindigkeitsverbesserung

---

_Test-Suite v2 - Zukunftssichere Test-Infrastruktur für Evolution Hub_
