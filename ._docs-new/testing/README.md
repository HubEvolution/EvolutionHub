# 🧪 Testing Documentation

Umfassende Teststrategie und -dokumentation für Evolution Hub, inklusive Unit-Tests, Integration-Tests und End-to-End-Tests mit Vitest und Playwright.

## Übersicht

Evolution Hub verwendet eine mehrschichtige Teststrategie mit hohen Coverage-Anforderungen (≥70%). Diese Dokumentation beschreibt die Test-Architektur, Best Practices und Implementierungsrichtlinien.

## 📚 Hauptthemen

### Test-Strategie

- **[Testing Strategy](./testing-strategy.md)** — **Hauptdokument** für die gesamte Teststrategie
- **[Coverage Roadmap](./coverage-roadmap.md)** — Roadmap zur Erreichung von 95% Coverage
- **[Test Architecture](./test-architecture.md)** — Architektur der Testlandschaft

### Unit-Tests (Vitest)

- **[Unit Testing Guide](./unit-testing.md)** — Richtlinien für Unit-Tests
- **[Mocking Strategy](./mocking-strategy.md)** — Strategie für Mocks und Stubs
- **[Test Utilities](./test-utilities.md)** — Gemeinsame Test-Hilfsmittel

### Integration-Tests

- **[Integration Testing](./integration-testing.md)** — Tests für API-Endpunkte und Services
- **[Database Testing](./database-testing.md)** — Tests für Datenbank-Operationen
- **[External Service Testing](./external-service-testing.md)** — Tests für externe Dienste

### End-to-End-Tests (Playwright)

- **[E2E Testing Guide](./e2e-testing.md)** — Playwright-Test-Implementierung
- **[Browser Testing](./browser-testing.md)** — Cross-Browser-Testing-Strategie
- **[Visual Testing](./visual-testing.md)** — Screenshots und visuelle Regressionstests

### Test-Infrastruktur

- **[Test Environment](./test-environment.md)** — Testumgebungen und Konfiguration
- **[Test Data Management](./test-data.md)** — Verwaltung von Testdaten
- **[CI/CD Integration](./ci-cd-integration.md)** — Integration in CI/CD-Pipeline

## 🚀 Schnellstart

### Test-Ausführung

```bash
# Unit-Tests
npm test                 # Watch-Modus
npm run test:once        # Einzelner Durchlauf
npm run test:coverage    # Mit Coverage-Bericht

# E2E-Tests
npm run test:e2e         # Alle Browser
npm run test:e2e:chromium   # Nur Chromium
npm run test:e2e:firefox    # Nur Firefox
npm run test:e2e:webkit     # Nur WebKit

# Spezifische Tests
npm run test:e2e -- src/e2e/auth/  # Nur Auth-Tests
npm run test:e2e -- src/e2e/tools/ # Nur Tool-Tests
```

### Test-Struktur

```
tests/
├── unit/                    # Unit-Tests (Vitest)
│   ├── hooks/              # React Hooks Tests
│   ├── services/           # Service Layer Tests
│   └── utils/              # Utility Function Tests
├── integration/            # Integration-Tests
│   ├── api/                # API-Endpunkt-Tests
│   └── services/           # Service-Integration-Tests
└── fixtures/               # Test-Fixtures und -Daten

test-suite-v2/              # E2E-Tests (Playwright)
├── src/e2e/
│   ├── auth/               # Authentifizierungs-Tests
│   ├── features/           # Feature-Tests
│   ├── tools/              # Tool-Tests
│   └── smoke/              # Smoke-Tests
└── fixtures/               # E2E-Test-Fixtures
```

## 📖 Verwandte Kategorien

- **[💻 Development](../development/)** — Entwicklungs-Workflows und Testing-Integration
- **[🏗️ Architecture](../architecture/)** — Testbare Architektur-Patterns
- **[🔒 Security](../security/)** — Security-Tests und Penetration-Testing
- **[🔌 API](../api/)** — API-Test-Coverage und -Standards

## 🔍 Navigation

### Nach Test-Typ

**"Ich möchte Unit-Tests schreiben"**
→ [Unit Testing Guide](./unit-testing.md) → [Mocking Strategy](./mocking-strategy.md)

**"Ich möchte API-Tests schreiben"**
→ [Integration Testing](./integration-testing.md) → [API Test Examples](./api-test-examples.md)

**"Ich möchte E2E-Tests schreiben"**
→ [E2E Testing Guide](./e2e-testing.md) → [Browser Testing](./browser-testing.md)

**"Ich möchte Test-Coverage verbessern"**
→ [Coverage Roadmap](./coverage-roadmap.md) → [Test Gaps Analysis](./test-gaps.md)

### Nach Feature-Bereich

- **[🔐 Authentication Tests](./auth-tests.md)** — Authentifizierungs- und Session-Tests
- **[🤖 AI Tools Tests](./ai-tools-tests.md)** — Tests für KI-Tool-Features
- **[💬 Comments Tests](./comments-tests.md)** — Kommentarsystem-Tests
- **[💳 Billing Tests](./billing-tests.md)** — Zahlungs- und Subscription-Tests

## 📝 Standards

### Test-Organisation

**Feature-basierte Organisation:**

```typescript
// tests/unit/hooks/useAuth.test.tsx
describe('useAuth Hook', () => {
  describe('Login Flow', () => {
    it('should login user successfully', async () => {
      // Test-Implementierung
    });
  });
});
```

**E2E-Test-Struktur:**

```typescript
// test-suite-v2/src/e2e/auth/magic-link-flow.spec.ts
test.describe('Magic Link Authentication', () => {
  test('should complete full magic link flow', async ({ page }) => {
    // E2E-Test-Implementierung
  });
});
```

### Test-Fixtures

**Wiederverwendbare Fixtures:**

```typescript
// test-suite-v2/fixtures/auth-helpers.ts
export const createTestUser = async (overrides = {}) => {
  // Test-User erstellen
};

export const cleanupTestUser = async (userId: string) => {
  // Test-User bereinigen
};
```

### Coverage-Anforderungen

- **Gesamt-Coverage:** ≥70% (CI-Gate)
- **Feature-Coverage:** ≥80% für neue Features
- **Critical Path Coverage:** ≥90% für kritische Code-Pfade
- **Keine Deadlines** für per-file Coverage (Fokus auf Qualität)

## 🔧 Test-Utilities

### Auth-Helpers

```typescript
// Gemeinsame Auth-Fixtures
import { test as base } from '@playwright/test';
import { createTestUser, loginAs } from '../fixtures/auth-helpers';

export const test = base.extend({
  authenticatedUser: async ({ page }, use) => {
    const user = await createTestUser();
    await loginAs(page, user);
    await use(user);
    // Cleanup wird automatisch ausgeführt
  },
});
```

### API-Test-Helpers

```typescript
// API-Test-Utilities
export class ApiTestHelper {
  static async request(endpoint: string, options: RequestOptions) {
    // Standardisierte API-Test-Anfragen
  }

  static expectSuccessResponse(response: Response) {
    // Standard-Validierung für erfolgreiche Responses
  }
}
```

## 🤝 Contribution

Bei Testing-Dokumentation:

1. **Schreiben Sie Tests zuerst** (TDD-Ansatz)
2. **Dokumentieren Sie Test-Patterns** für neue Features
3. **Aktualisieren Sie Coverage-Roadmap** bei neuen Anforderungen
4. **Teilen Sie wiederverwendbare Test-Utilities**

## 📚 Ressourcen

- **Vitest Documentation:** [vitest.dev](https://vitest.dev/)
- **Playwright Documentation:** [playwright.dev](https://playwright.dev/)
- **Testing Best Practices:** [testingjavascript.com](https://testingjavascript.com/)
- **Jest to Vitest Migration:** [vitest.dev/guide/migration.html](https://vitest.dev/guide/migration.html)

---

**Kategorie-Version:** 2.0.0
**Letzte Aktualisierung:** 2025-10-10
**Verantwortlich:** QA Team
