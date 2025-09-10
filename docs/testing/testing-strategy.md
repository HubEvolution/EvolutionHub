# Teststrategie - Evolution Hub

Diese Dokumentation beschreibt die umfassende Teststrategie für das Evolution Hub Projekt. Sie bietet einen Überblick über die verschiedenen Testebenen, Werkzeuge und Best Practices, die im Projekt verwendet werden.

## Inhaltsverzeichnis

1. [Testphilosophie](#testphilosophie)
2. [Testebenen](#testebenen)
3. [Testwerkzeuge](#testwerkzeuge)
4. [Testabdeckung](#testabdeckung)
5. [Testorganisation](#testorganisation)
6. [Continuous Integration](#continuous-integration)
7. [Testdaten-Management](#testdaten-management)
8. [Mocking-Strategien](#mocking-strategien)
9. [Testdokumentation](#testdokumentation)
10. [Fehlerbehebung](#fehlerbehebung)

---

## Testphilosophie

Die Teststrategie des Evolution Hub Projekts basiert auf folgenden Grundprinzipien:

1. **Testgetriebene Entwicklung (TDD)**: Schreiben von Tests vor der Implementierung
2. **Automatisierung**: Maximale Automatisierung von Tests für schnelles Feedback
3. **Pyramidenansatz**: Mehr Unit-Tests als Integrationstests, mehr Integrationstests als E2E-Tests
4. **Kontinuierliche Tests**: Tests als integraler Bestandteil des CI/CD-Prozesses
5. **Qualitätssicherung**: Tests als Mittel zur Sicherstellung der Codequalität

### Testpyramide

```mermaid
pyramid-schema
    title Testpyramide
    E2E-Tests: 10%
    Integrationstests: 30%
    Unit-Tests: 60%
```

Diese Pyramide veranschaulicht die Verteilung der verschiedenen Testtypen im Projekt:

- **Unit-Tests**: Bilden die Basis mit der größten Anzahl an Tests
- **Integrationstests**: Mittlere Ebene mit moderater Anzahl an Tests
- **E2E-Tests**: Spitze der Pyramide mit der geringsten Anzahl an Tests

---

## Testebenen

### 1. Unit-Tests

Unit-Tests prüfen einzelne Funktionen, Methoden oder Klassen in Isolation.

**Fokus**:

- Geschäftslogik in Services und Utilities
- Helper-Funktionen und Utilities
- Einzelne Komponenten (ohne externe Abhängigkeiten)

**Beispiel**:

```typescript
// src/lib/auth-v2.test.ts
import { describe, it, expect, vi } from 'vitest';
import { hashPassword, verifyPassword } from './auth-v2';

describe('Password Hashing', () => {
  it('should hash a password correctly', async () => {
    const password = 'secure-password';
    const hash = await hashPassword(password);
    
    expect(hash).toBeDefined();
    expect(hash).not.toEqual(password);
    expect(hash.startsWith('$2a$')).toBe(true);
  });
  
  it('should verify a correct password', async () => {
    const password = 'secure-password';
    const hash = await hashPassword(password);
    
    const result = await verifyPassword(password, hash);
    expect(result).toBe(true);
  });
  
  it('should reject an incorrect password', async () => {
    const password = 'secure-password';
    const hash = await hashPassword(password);
    
    const result = await verifyPassword('wrong-password', hash);
    expect(result).toBe(false);
  });
});
```

### 2. Integrationstests

Integrationstests prüfen die Interaktion zwischen verschiedenen Komponenten oder Systemen.

**Fokus**:

- API-Endpunkte
- Datenbankinteraktionen
- Service-Interaktionen
- Middleware-Funktionalität

**Beispiel**:

```typescript
// src/pages/api/auth/login.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './login';

describe('Login API', () => {
  let mockRequest;
  let mockEnv;
  
  beforeEach(() => {
    mockRequest = {
      json: vi.fn().mockResolvedValue({
        email: 'test@example.com',
        password: 'password123'
      }),
      headers: new Headers({
        'CF-Connecting-IP': '127.0.0.1'
      })
    };
    
    mockEnv = {
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnThis(),
          first: vi.fn().mockResolvedValue({
            id: 'user-123',
            email: 'test@example.com',
            password: '$2a$10$hashedpassword',
            name: 'Test User',
            roles: 'user'
          })
        })
      }
    };
    
    vi.mock('../../../lib/auth-v2', () => ({
      verifyPassword: vi.fn().mockResolvedValue(true),
      generateToken: vi.fn().mockReturnValue('mock-jwt-token')
    }));
    
    vi.mock('../../../lib/rate-limiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({
        success: true
      })
    }));
  });
  
  it('should return 200 and token on successful login', async () => {
    const response = await POST({ request: mockRequest, env: mockEnv });
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('message', 'Login successful');
    expect(data).toHaveProperty('user');
    expect(data.user).toHaveProperty('id', 'user-123');
    expect(response.headers.get('Set-Cookie')).toContain('auth-token=');
  });
});
```

### 3. End-to-End Tests (E2E)

E2E-Tests prüfen das gesamte System aus Benutzerperspektive.

**Fokus**:

- Benutzerflows (Login, Registrierung, etc.)
- Seitennavigation
- Formularinteraktionen
- Visuelle Regression

**Beispiel**:

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should allow user to login', async ({ page }) => {
    // Navigiere zur Login-Seite
    await page.goto('/login');
    
    // Fülle das Formular aus
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    
    // Klicke auf den Login-Button
    await page.click('button[type="submit"]');
    
    // Überprüfe, ob die Weiterleitung zum Dashboard erfolgt
    await expect(page).toHaveURL('/dashboard');
    
    // Überprüfe, ob der Benutzername angezeigt wird
    await expect(page.locator('.user-name')).toContainText('Test User');
  });
});
```

---

## Testwerkzeuge

Evolution Hub verwendet folgende Testwerkzeuge:

### Vitest

Vitest ist das Haupttestwerkzeug für Unit- und Integrationstests.

**Konfiguration**: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.astro', 'playwright-report'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/']
    },
    globals: true,
    setupFiles: ['./test/setup.ts']
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
});
```

**Ausführung**:

```bash
# Alle Tests ausführen
npm test

# Tests im Watch-Modus ausführen
npm run test:watch

# Testabdeckung generieren
npm run test:coverage
```

### Playwright

Playwright wird für End-to-End-Tests verwendet.

**Konfiguration**: `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ],
  webServer: {
    command: 'npm --prefix ../../.. run dev:e2e',\n    url: BASE_URL,
    port: 3000,
    reuseExistingServer: !process.env.CI
  }
});
```

**Ausführung**:

```bash
# Alle E2E-Tests ausführen
npm run test:e2e

# Tests in einem bestimmten Browser ausführen
npm run test:e2e -- --project=chromium

# Tests mit UI ausführen
npm run test:e2e -- --ui
```

#### E2E gegen Cloudflare Wrangler (empfohlen)

- **Konfiguration**: `tests/e2e/config/playwright.config.ts`
- **BASE_URL**: Steuert `use.baseURL` und den `Origin`-Header (für CSRF). Standard: `http://127.0.0.1:8787`.
- **Dev-Server**: Playwright startet Wrangler automatisch über `webServer.command`:
  - `npm --prefix ../../.. run dev:e2e` → führt `db:setup` aus und startet `wrangler dev` (siehe `package.json`).
  - `webServer.url` ist `BASE_URL`. Mit `reuseExistingServer: !CI` wird ein bereits laufender Server wiederverwendet.

Beispiele:

```bash
# 1) Lokal mit automatisch gestarteten Wrangler-Dev (Standardport 8787)
npm run test:e2e

# 2) Gegen einen bereits laufenden Server (z. B. Remote/Staging)
export BASE_URL="https://your-env.example.com"
npm run test:e2e

# 3) Nur Chromium
npm run test:e2e -- --project=chromium

# 4) Mit UI-Test-Runner
npm run test:e2e:ui
```

Hinweise:

- Tests laufen gegen den Cloudflare-Worker (Wrangler), nicht den Astro-Dev-Server.
- `BASE_URL` wird als `Origin`-Header gesetzt, damit POST-Requests die CSRF-Prüfung bestehen.
- Wenn bereits ein Server unter `BASE_URL` erreichbar ist, wird dieser genutzt; andernfalls startet Playwright Wrangler automatisch.

### MSW (Mock Service Worker)

MSW wird für das Mocking von API-Anfragen in Tests verwendet.

**Konfiguration**: `test/mocks/handlers.ts`

```typescript
import { rest } from 'msw';

export const handlers = [
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        message: 'Login successful',
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com'
        }
      }),
      ctx.cookie('auth-token', 'mock-jwt-token')
    );
  }),
  
  rest.get('/api/user/me', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['user']
      })
    );
  })
];
```

**Einrichtung**: `test/setup.ts`

```typescript
import { beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Testabdeckung

Evolution Hub strebt eine hohe Testabdeckung an, mit folgenden Zielen:

- **Gesamtabdeckung**: Mindestens 80%
- **Kritische Module**: Mindestens 90% (Auth, API, Security)
- **UI-Komponenten**: Mindestens 70%

### Abdeckungsbericht

Die Testabdeckung wird mit Vitest und c8 gemessen:

```bash
npm run test:coverage
```

Der Bericht wird im Verzeichnis `coverage/` generiert und enthält detaillierte Informationen zur Abdeckung pro Datei.

### Kritische Bereiche

Folgende Bereiche werden als kritisch eingestuft und erfordern eine besonders hohe Testabdeckung:

1. **Authentifizierung und Autorisierung**:
   - JWT-Token-Generierung und -Validierung
   - Passwort-Hashing
   - Zugriffskontrolle

2. **Sicherheitsfeatures**:
   - Rate-Limiting
   - Security-Headers
   - Input-Validierung

3. **Datenmanipulation**:
   - Datenbank-Operationen
   - API-Endpunkte für Datenänderungen

---

## Testorganisation

### Verzeichnisstruktur

```
evolution-hub/
├── src/
│   ├── components/
│   │   └── Component.test.ts       # Komponenten-Tests
│   ├── lib/
│   │   └── util.test.ts            # Utility-Tests
│   └── pages/api/
│       └── endpoint.test.ts        # API-Tests
├── test/
│   ├── setup.ts                    # Testsetup
│   └── mocks/                      # Mock-Definitionen
└── tests/
    ├── e2e/                        # E2E-Tests
    └── integration/                # Integrationstests
```

### Benennungskonventionen

- **Unit-Tests**: `*.test.ts` oder `*.spec.ts` neben der zu testenden Datei
- **Integrationstests**: `*.test.ts` oder `*.integration.test.ts`
- **E2E-Tests**: `*.spec.ts` im Verzeichnis `tests/e2e/`

### Test-Suites

Tests werden in logische Suites gruppiert:

```typescript
describe('Modulname', () => {
  describe('Funktionalität A', () => {
    it('sollte X tun, wenn Y', () => {
      // Test-Code
    });
    
    it('sollte Z tun, wenn W', () => {
      // Test-Code
    });
  });
  
  describe('Funktionalität B', () => {
    // Weitere Tests
  });
});
```

---

## Continuous Integration

Tests sind vollständig in die CI/CD-Pipeline integriert:

### GitHub Actions Workflow

```yaml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v3
        with:
          name: coverage-report
          path: coverage/
```

### Pre-Commit-Hooks

Lokale Tests werden vor dem Commit ausgeführt:

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint
npm run test:affected
```

---

## Testdaten-Management

### Testdatenquellen

1. **Fest codierte Testdaten**: Für einfache Tests
2. **Factories**: Für komplexe Testdaten mit Variationen
3. **Fixtures**: Für wiederverwendbare Testdaten

### Testdaten-Factories

```typescript
// test/factories/user.ts
export function createUser(overrides = {}) {
  return {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    password: '$2a$10$hashedpassword',
    roles: ['user'],
    createdAt: new Date('2023-01-01T00:00:00Z'),
    ...overrides
  };
}

export function createAdmin(overrides = {}) {
  return createUser({
    id: 'admin-123',
    name: 'Admin User',
    email: 'admin@example.com',
    roles: ['user', 'admin'],
    ...overrides
  });
}
```

### Fixtures

```typescript
// test/fixtures/projects.json
[
  {
    "id": "project-123",
    "name": "Test Project",
    "description": "A test project",
    "userId": "user-123",
    "isPublic": true,
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z"
  },
  {
    "id": "project-456",
    "name": "Private Project",
    "description": "A private test project",
    "userId": "user-123",
    "isPublic": false,
    "createdAt": "2023-01-02T00:00:00Z",
    "updatedAt": "2023-01-02T00:00:00Z"
  }
]
```

---

## Mocking-Strategien

### Mocking von Abhängigkeiten

Vitest wird für das Mocking von Modulen und Funktionen verwendet:

```typescript
import { vi } from 'vitest';

// Mocking eines Moduls
vi.mock('../../../lib/auth', () => ({
  verifyToken: vi.fn().mockReturnValue({
    sub: 'user-123',
    roles: ['user']
  })
}));

// Mocking einer Funktion
const mockFn = vi.fn().mockImplementation((arg) => arg * 2);
```

### Mocking der Datenbank

```typescript
// Mock für Cloudflare D1
const mockDB = {
  prepare: vi.fn().mockReturnValue({
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue({ /* Mockdaten */ }),
    all: vi.fn().mockResolvedValue([/* Mockdaten */]),
    run: vi.fn().mockResolvedValue({ success: true })
  })
};

// Verwendung in Tests
const env = { DB: mockDB };
```

### Mocking von API-Anfragen

```typescript
// Mit MSW
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/data', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ data: 'mocked data' })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Testdokumentation

### Test-Beschreibungen

Tests sollten klar und beschreibend sein:

```typescript
it('should return 401 when no authentication token is provided', async () => {
  // Test-Code
});

it('should return user data when valid token is provided', async () => {
  // Test-Code
});
```

### Kommentare und Dokumentation

Komplexe Tests sollten dokumentiert werden:

```typescript
/**
 * Tests the authentication flow with various edge cases.
 * 
 * This test suite covers:
 * - Valid login attempts
 * - Invalid credentials
 * - Rate limiting
 * - Token validation
 */
describe('Authentication Flow', () => {
  // Test-Code
});
```

### Test-Tags

Tags können verwendet werden, um Tests zu kategorisieren:

```typescript
// @integration
// @slow
describe('Database Integration', () => {
  // Test-Code
});
```

---

## Fehlerbehebung

### Häufige Testprobleme

1. **Flaky Tests (unzuverlässige Tests)**:
   - Problem: Tests schlagen manchmal fehl, manchmal nicht
   - Lösung: Timeouts erhöhen, Async-Code verbessern, Race Conditions beheben

2. **Langsame Tests**:
   - Problem: Tests dauern zu lange
   - Lösung: Mocking verwenden, Test-Suites aufteilen, parallele Ausführung

3. **Isolationsprobleme**:
   - Problem: Tests beeinflussen sich gegenseitig
   - Lösung: `beforeEach`/`afterEach` für Zustandsrücksetzung verwenden

### Debugging von Tests

```bash
# Debug-Ausgabe aktivieren
DEBUG=true npm test

# Einzelnen Test ausführen
npm test -- -t "should validate user input"

# Tests mit Breakpoints debuggen
npm run test:debug
```

### Testprotokolle

```bash
# Ausführliche Testprotokolle
npm test -- --verbose

# Testprotokolle speichern
npm test -- --reporter json --outputFile test-results.json
```
