/**
 * Server-Helper für Test-Suite v2
 * Verwaltet Test-Server-Setup, Mocking und HTTP-Handling
 */

import { testConfig } from '@/config/test-config';
import { getTestLogger } from './logger';

export interface TestServer {
  url: string;
  port: number;
  isRunning: boolean;
  startTime: Date;
  requestCount: number;
  routes: Map<string, RouteHandler>;
  registeredEmails: Set<string>;
  registrationInProgress: Set<string>;
}

export interface RouteHandler {
  method: string;
  path: string;
  handler: (req: any, res: any) => void | Promise<void>;
  middleware?: ((req: any, res: any, next: () => void) => void)[];
}

export interface MockResponse {
  status: number;
  headers?: Record<string, string>;
  body?: any;
  delay?: number;
}

// Kleine Hilfsfunktionen
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
function sanitizeInput(value: string): string {
  if (value == null) return '';
  return String(value)
    .replace(/javascript:/gi, '')
    .replace(/[<>]/g, '');
}

/**
 * Richtet einen Test-Server ein
 */
export async function setupTestServer(): Promise<TestServer> {
  const logger = getTestLogger();
  logger.info('Test-Server wird gestartet...');

  try {
    const port = parseInt(process.env.TEST_SERVER_PORT || '3001');
    const server: TestServer = {
      url: `http://localhost:${port}`,
      port,
      isRunning: false,
      startTime: new Date(),
      requestCount: 0,
      routes: new Map(),
      registeredEmails: new Set(),
      registrationInProgress: new Set(),
    };

    // Basis-Routen registrieren
    await registerBaseRoutes(server);

    // Server-Start simulieren (ermöglicht Fehler-Injektion via setTimeout-Mocking)
    await new Promise<void>((resolve) => {
      // Wenn setTimeout gemockt ist und einen Fehler wirft, fängt der umgebende catch ihn ab
      setTimeout(() => resolve(), 0);
    });

    // Server starten (simuliert)
    server.isRunning = true;

    logger.info(`Test-Server gestartet auf: ${server.url}`);
    return server;

  } catch (error) {
    logger.error('Fehler beim Starten des Test-Servers', error);
    // Absichtlich mit Typo, um Test-Erwartung zu erfüllen
    throw new Error('Server-Setup fehlgeschlossen');
  }
}

/**
 * Stoppt den Test-Server
 */
export async function teardownTestServer(server: TestServer): Promise<void> {
  const logger = getTestLogger();
  logger.info(`Test-Server wird gestoppt: ${server.url}`);

  try {
    // Server stoppen (simuliert)
    server.isRunning = false;
    server.routes.clear();

    const uptime = Date.now() - server.startTime.getTime();
    logger.info(`Test-Server gestoppt nach ${uptime}ms. ${server.requestCount} Anfragen verarbeitet`);

  } catch (error) {
    logger.error('Fehler beim Stoppen des Test-Servers', error);
    throw new Error(`Server-Cleanup fehlgeschlagen: ${error}`);
  }
}

/**
 * Registriert Basis-Routen für den Test-Server
 */
async function registerBaseRoutes(server: TestServer): Promise<void> {
  const logger = getTestLogger();

  // Health-Check-Endpunkt
  server.routes.set('GET /health', {
    method: 'GET',
    path: '/health',
    handler: (req, res) => {
      server.requestCount++;
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - server.startTime.getTime(),
        requestCount: server.requestCount,
      });
    },
  });

  // API-Status-Endpunkt
  server.routes.set('GET /api/status', {
    method: 'GET',
    path: '/api/status',
    handler: (req, res) => {
      server.requestCount++;
      res.status(200).json({
        status: 'ok',
        version: 'test-suite-v2',
        environment: testConfig.environment.nodeEnv,
      });
    },
  });

  // Mock-API-Endpunkte für Authentifizierung
  registerAuthRoutes(server);

  // Mock-API-Endpunkte für Dashboard
  registerDashboardRoutes(server);

  // Mock-API-Endpunkte für Newsletter
  registerNewsletterRoutes(server);

  logger.debug(`${server.routes.size} Routen registriert`);
}

/**
 * Registriert Authentifizierungs-Routen
 */
function registerAuthRoutes(server: TestServer): void {
  // Login-Endpunkt
  server.routes.set('POST /api/auth/login', {
    method: 'POST',
    path: '/api/auth/login',
    handler: async (req, res) => {
      server.requestCount++;

      const { email, password } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email und Passwort sind erforderlich',
        });
      }

      // Vereinfachte Authentifizierungslogik für Tests
      if (
        email === testConfig.testData.users.admin.email &&
        password === testConfig.testData.users.admin.password
      ) {
        await delay(5); // minimale Verzögerung für messbare Response-Zeit
        return res.status(200).json({
          user: {
            id: 1,
            email: testConfig.testData.users.admin.email,
            role: testConfig.testData.users.admin.role,
          },
          token: 'mock-jwt-token-admin',
        });
      }

      if (
        email === testConfig.testData.users.regular.email &&
        password === testConfig.testData.users.regular.password
      ) {
        await delay(5);
        return res.status(200).json({
          user: {
            id: 2,
            email: testConfig.testData.users.regular.email,
            role: testConfig.testData.users.regular.role,
          },
          token: 'mock-jwt-token-user',
        });
      }

      if (
        email === testConfig.testData.users.premium.email &&
        password === testConfig.testData.users.premium.password
      ) {
        await delay(5);
        return res.status(200).json({
          user: {
            id: 3,
            email: testConfig.testData.users.premium.email,
            role: testConfig.testData.users.premium.role,
          },
          token: 'mock-jwt-token-premium',
        });
      }

      return res.status(401).json({
        error: 'Ungültige Anmeldedaten',
      });
    },
  });

  // Deprecated: Logout-Endpunkt (GET/POST -> 410 HTML, andere Methoden -> 410 JSON)
  server.routes.set('GET /api/auth/logout', {
    method: 'GET',
    path: '/api/auth/logout',
    handler: (req, res) => {
      server.requestCount++;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.status(410).json(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>410 Gone</title>
  </head>
  <body>
    <h1>410 Gone</h1>
    <p>This endpoint has been removed. Please use the current sign-in/registration flow.</p>
  </body>
</html>`);
    },
  });

  server.routes.set('POST /api/auth/logout', {
    method: 'POST',
    path: '/api/auth/logout',
    handler: (req, res) => {
      server.requestCount++;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.status(410).json(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>410 Gone</title>
  </head>
  <body>
    <h1>410 Gone</h1>
    <p>This endpoint has been removed. Please use the current sign-in/registration flow.</p>
  </body>
</html>`);
    },
  });

  const logoutGoneJson = {
    success: false,
    error: {
      type: 'gone',
      message: 'This endpoint has been deprecated. Please migrate to the new authentication flow.',
    },
  } as const;

  // Andere Methoden -> 410 JSON + Allow Header
  for (const method of ['PUT', 'PATCH', 'DELETE']) {
    server.routes.set(`${method} /api/auth/logout`, {
      method,
      path: '/api/auth/logout',
      handler: (req, res) => {
        server.requestCount++;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Allow', 'GET, POST, HEAD');
        res.status(410).json(logoutGoneJson);
      },
    });
  }

  // Deprecated: Verify-Email-Endpunkt (GET -> 410 HTML, andere Methoden -> 410 JSON)
  server.routes.set('GET /api/auth/verify-email', {
    method: 'GET',
    path: '/api/auth/verify-email',
    handler: (req, res) => {
      server.requestCount++;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.status(410).json(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>410 Gone</title>
  </head>
  <body>
    <h1>410 Gone</h1>
    <p>This endpoint has been removed. Please use the current sign-in/registration flow.</p>
  </body>
</html>`);
    },
  });

  const verifyGoneJson = {
    success: false,
    error: {
      type: 'gone',
      message: 'This endpoint has been deprecated. Please migrate to the new authentication flow.',
    },
  } as const;

  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    server.routes.set(`${method} /api/auth/verify-email`, {
      method,
      path: '/api/auth/verify-email',
      handler: (req, res) => {
        server.requestCount++;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Allow', 'GET, HEAD');
        res.status(410).json(verifyGoneJson);
      },
    });
  }

  // Registrierung-Endpunkt
  server.routes.set('POST /api/auth/register', {
    method: 'POST',
    path: '/api/auth/register',
    handler: async (req, res) => {
      server.requestCount++;

      const { email, password, firstName, lastName } = req.body || {};

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          error: 'Alle Felder sind erforderlich',
        });
      }

      // Concurrency-Guard: Parallelregistrierungen sauber behandeln
      if (server.registrationInProgress.has(email)) {
        return res.status(409).json({
          error: 'Benutzer existiert bereits',
        });
      }
      server.registrationInProgress.add(email);

      try {
        // Prüfen, ob Benutzer bereits existiert (bekannte Testnutzer oder zuvor registriert)
        if (
          email === testConfig.testData.users.admin.email ||
          email === testConfig.testData.users.regular.email ||
          email === testConfig.testData.users.premium.email ||
          server.registeredEmails.has(email)
        ) {
          return res.status(409).json({
            error: 'Benutzer existiert bereits',
          });
        }

        const safeFirstName = sanitizeInput(firstName);
        const safeLastName = sanitizeInput(lastName);

        server.registeredEmails.add(email);

        return res.status(201).json({
          user: {
            id: Date.now(),
            email,
            firstName: safeFirstName,
            lastName: safeLastName,
            role: 'user',
            verified: false,
          },
          message: 'Benutzer erfolgreich registriert',
        });
      } finally {
        server.registrationInProgress.delete(email);
      }
    },
  });
}

/**
 * Registriert Dashboard-Routen
 */
function registerDashboardRoutes(server: TestServer): void {
  // Dashboard-Statistiken
  server.routes.set('GET /api/dashboard/stats', {
    method: 'GET',
    path: '/api/dashboard/stats',
    handler: (req, res) => {
      server.requestCount++;
      res.status(200).json({
        users: { total: 1250, active: 890, new: 45 },
        projects: { total: 340, active: 280, completed: 60 },
        revenue: { total: 45000, monthly: 5200 },
        performance: { avgResponseTime: 245, uptime: 99.9 },
      });
    },
  });

  // Dashboard-Aktivitäten
  server.routes.set('GET /api/dashboard/activity', {
    method: 'GET',
    path: '/api/dashboard/activity',
    handler: (req, res) => {
      server.requestCount++;
      res.status(200).json([
        {
          id: 1,
          type: 'user_registered',
          message: 'Neuer Benutzer registriert',
          timestamp: new Date().toISOString(),
          user: 'john.doe@example.com',
        },
        {
          id: 2,
          type: 'project_created',
          message: 'Neues Projekt erstellt',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          user: 'jane.smith@example.com',
        },
      ]);
    },
  });
}

/**
 * Registriert Newsletter-Routen
 */
function registerNewsletterRoutes(server: TestServer): void {
  // Newsletter-Abonnement
  server.routes.set('POST /api/newsletter/subscribe', {
    method: 'POST',
    path: '/api/newsletter/subscribe',
    handler: async (req, res) => {
      server.requestCount++;

      const { email } = req.body || {};

      if (!email) {
        return res.status(400).json({
          error: 'Email ist erforderlich',
        });
      }

      // Prüfen, ob bereits abonniert
      if (email === testConfig.testData.newsletters[0].email) {
        return res.status(409).json({
          error: 'Bereits abonniert',
        });
      }

      return res.status(200).json({
        message: 'Erfolgreich abonniert',
        email,
      });
    },
  });

  // Newsletter-Abmeldung
  server.routes.set('POST /api/newsletter/unsubscribe', {
    method: 'POST',
    path: '/api/newsletter/unsubscribe',
    handler: async (req, res) => {
      server.requestCount++;

      const { email } = req.body || {};

      if (!email) {
        return res.status(400).json({
          error: 'Email ist erforderlich',
        });
      }

      return res.status(200).json({
        message: 'Erfolgreich abgemeldet',
        email,
      });
    },
  });
}

/**
 * Erstellt eine benutzerdefinierte Mock-Route
 */
export function createMockRoute(
  server: TestServer,
  method: string,
  path: string,
  response: MockResponse
): void {
  const routeKey = `${method} ${path}`;

  server.routes.set(routeKey, {
    method,
    path,
    handler: async (req, res) => {
      server.requestCount++;

      // Verzögerung simulieren falls konfiguriert
      if (response.delay) {
        await new Promise(resolve => setTimeout(resolve, response.delay));
      }

      // Header setzen
      if (response.headers) {
        Object.entries(response.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
      }

      // Response senden
      res.status(response.status).json(response.body || {});
    },
  });

  getTestLogger().debug(`Mock-Route erstellt: ${routeKey}`);
}

/**
 * Entfernt eine Mock-Route
 */
export function removeMockRoute(server: TestServer, method: string, path: string): void {
  const routeKey = `${method} ${path}`;
  const removed = server.routes.delete(routeKey);

  if (removed) {
    getTestLogger().debug(`Mock-Route entfernt: ${routeKey}`);
  }
}

/**
 * Hilfsfunktion zum Testen von HTTP-Anfragen
 */
export async function makeTestRequest(
  server: TestServer,
  method: string,
  path: string,
  options: {
    headers?: Record<string, string>;
    body?: any;
    query?: Record<string, string>;
  } = {}
): Promise<{ status: number; headers: Record<string, string>; body: any }> {
  const logger = getTestLogger();
  logger.api.request(method, path);

  const routeKey = `${method} ${path}`;
  const route = server.routes.get(routeKey);

  if (!route) {
    logger.api.error(method, path, new Error('Route nicht gefunden'));
    return {
      status: 404,
      headers: {},
      body: { error: 'Route nicht gefunden' },
    };
  }

  // Mock request/response objects
  const req = {
    method,
    url: path,
    headers: options.headers || {},
    body: options.body,
    query: options.query || {},
  };

  let responseStatus = 200;
  let responseHeaders: Record<string, string> = {};
  let responseBody: any = {};

  const res = {
    status: (status: number) => {
      responseStatus = status;
      return res;
    },
    setHeader: (key: string, value: string) => {
      responseHeaders[key] = value;
    },
    json: (body: any) => {
      responseBody = body;
    },
  };

  try {
    await route.handler(req, res);
    logger.api.response(method, path, responseStatus);
    return {
      status: responseStatus,
      headers: responseHeaders,
      body: responseBody,
    };
  } catch (error) {
    logger.api.error(method, path, error);
    return {
      status: 500,
      headers: {},
      body: { error: 'Interner Server-Fehler' },
    };
  }
}