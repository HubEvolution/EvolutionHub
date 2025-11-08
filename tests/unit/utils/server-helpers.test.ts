/**
 * Unit-Tests für Server-Helper
 * Testet Server-Setup, Mock-Routen und HTTP-Handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setupTestServer,
  teardownTestServer,
  createMockRoute,
  removeMockRoute,
  makeTestRequest,
} from '../../src/legacy/utils/server-helpers';
import * as loggerModule from '../../src/legacy/utils/logger';

describe('Server-Helper', () => {
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      api: {
        request: vi.fn(),
        response: vi.fn(),
        error: vi.fn(),
      },
    };

    vi.spyOn(loggerModule, 'getTestLogger').mockReturnValue(mockLogger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setupTestServer', () => {
    it('sollte erfolgreich einen Test-Server einrichten', async () => {
      const server = await setupTestServer();

      expect(server).toHaveProperty('url');
      expect(server).toHaveProperty('port');
      expect(server).toHaveProperty('isRunning', true);
      expect(server).toHaveProperty('startTime');
      expect(server).toHaveProperty('requestCount', 0);
      expect(server).toHaveProperty('routes');

      expect(server.url).toMatch(/^http:\/\/localhost:\d+$/);
      expect(server.startTime).toBeInstanceOf(Date);
      expect(server.routes).toBeInstanceOf(Map);
    });

    it('sollte Basis-Routen registrieren', async () => {
      const server = await setupTestServer();

      expect(server.routes.size).toBeGreaterThan(0);

      // Health-Check-Route sollte existieren
      expect(server.routes.has('GET /health')).toBe(true);
      expect(server.routes.has('GET /api/status')).toBe(true);
    });

    it('sollte bei Fehlern korrekt reagieren', async () => {
      // Mock einen Fehler während der Server-Initialisierung
      const originalSetup = global.setTimeout;
      (global as any).setTimeout = vi.fn(() => {
        throw new Error('Server setup error');
      });

      await expect(setupTestServer()).rejects.toThrow('Server-Setup fehlgeschlossen');

      (global as any).setTimeout = originalSetup;
    });
  });

  describe('teardownTestServer', () => {
    let testServer: any;

    beforeEach(async () => {
      testServer = await setupTestServer();
    });

    it('sollte Server erfolgreich stoppen', async () => {
      await teardownTestServer(testServer);

      expect(testServer.isRunning).toBe(false);
      expect(testServer.routes.size).toBe(0);
    });

    it('sollte bei Fehlern korrekt reagieren', async () => {
      // Mock einen Fehler beim Server-Stopp
      testServer.isRunning = true;

      await expect(teardownTestServer(testServer)).resolves.not.toThrow();
    });

    it('sollte Fehler beim Cleanup loggen und werfen', async () => {
      // Force-Error: Map.clear wirft Fehler
      const originalClear = testServer.routes.clear;
      testServer.routes.clear = vi.fn(() => {
        throw new Error('clear failed');
      });

      await expect(teardownTestServer(testServer)).rejects.toThrow('Server-Cleanup fehlgeschlagen');
      expect(mockLogger.error).toHaveBeenCalled();

      // Wiederherstellen
      testServer.routes.clear = originalClear;
    });
  });

  describe('Basis-Routen', () => {
    let testServer: any;

    beforeEach(async () => {
      testServer = await setupTestServer();
    });

    describe('Health-Check-Endpunkt', () => {
      it('sollte Gesundheitsstatus zurückgeben', async () => {
        const response = await makeTestRequest(testServer, 'GET', '/health');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'healthy');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('uptime');
        expect(response.body).toHaveProperty('requestCount');
      });

      it('sollte Request-Counter erhöhen', async () => {
        const initialCount = testServer.requestCount;

        await makeTestRequest(testServer, 'GET', '/health');

        expect(testServer.requestCount).toBe(initialCount + 1);
      });
    });

    describe('API-Status-Endpunkt', () => {
      it('sollte API-Status zurückgeben', async () => {
        const response = await makeTestRequest(testServer, 'GET', '/api/status');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('version', 'test-suite-v2');
        expect(response.body).toHaveProperty('environment');
      });
    });
  });

  describe('Authentifizierungs-Routen', () => {
    let testServer: any;

    beforeEach(async () => {
      testServer = await setupTestServer();
    });

    describe('POST /api/auth/login', () => {
      it('sollte erfolgreichen Login für Admin-Benutzer verarbeiten', async () => {
        const response = await makeTestRequest(testServer, 'POST', '/api/auth/login', {
          body: {
            email: 'admin@test-suite.local',
            password: 'AdminPass123!',
          },
        });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('token', 'mock-jwt-token-admin');
        expect(response.body.user.email).toBe('admin@test-suite.local');
        expect(response.body.user.role).toBe('admin');
      });

      it('sollte erfolgreichen Login für regulären Benutzer verarbeiten', async () => {
        const response = await makeTestRequest(testServer, 'POST', '/api/auth/login', {
          body: {
            email: 'user@test-suite.local',
            password: 'UserPass123!',
          },
        });

        expect(response.status).toBe(200);
        expect(response.body.user.role).toBe('user');
        expect(response.body.token).toBe('mock-jwt-token-user');
      });

      it('sollte erfolgreichen Login für Premium-Benutzer verarbeiten', async () => {
        const response = await makeTestRequest(testServer, 'POST', '/api/auth/login', {
          body: {
            email: 'premium@test-suite.local',
            password: 'PremiumPass123!',
          },
        });

        expect(response.status).toBe(200);
        expect(response.body.user.role).toBe('premium');
        expect(response.body.token).toBe('mock-jwt-token-premium');
      });

      it('sollte fehlgeschlagenen Login bei falschen Anmeldedaten verarbeiten', async () => {
        const response = await makeTestRequest(testServer, 'POST', '/api/auth/login', {
          body: {
            email: 'invalid@test-suite.local',
            password: 'wrongpassword',
          },
        });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Ungültige Anmeldedaten');
      });

      it('sollte fehlgeschlagenen Login bei fehlenden Feldern verarbeiten', async () => {
        const response = await makeTestRequest(testServer, 'POST', '/api/auth/login', {
          body: { email: 'test@test-suite.local' },
        });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Email und Passwort sind erforderlich');
      });
    });

    describe('POST /api/auth/logout', () => {
      it('sollte erfolgreichen Logout verarbeiten', async () => {
        const response = await makeTestRequest(testServer, 'POST', '/api/auth/logout');

        expect(response.status).toBe(410);
        expect(typeof response.body).toBe('string');
        expect(response.body).toContain('<!doctype html>');
        expect(response.body).toContain('410 Gone');
        expect(response.headers['Cache-Control']).toBe('no-store');
        expect(response.headers['Content-Type']).toContain('text/html');
      });
    });

    describe('POST /api/auth/register', () => {
      it('sollte erfolgreiche Registrierung verarbeiten', async () => {
        const response = await makeTestRequest(testServer, 'POST', '/api/auth/register', {
          body: {
            email: 'newuser@test-suite.local',
            password: 'NewPass123!',
            firstName: 'New',
            lastName: 'User',
          },
        });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('message', 'Benutzer erfolgreich registriert');
        expect(response.body.user.email).toBe('newuser@test-suite.local');
        expect(response.body.user.role).toBe('user');
        expect(response.body.user.verified).toBe(false);
      });

      it('sollte Concurrency-Guard bei paralleler Registrierung greifen lassen', async () => {
        const email = 'dupeuser@test-suite.local';
        const server = await setupTestServer();
        server.registrationInProgress.add(email);

        const response = await makeTestRequest(server, 'POST', '/api/auth/register', {
          body: {
            email,
            password: 'SomePass123!',
            firstName: 'Dupe',
            lastName: 'User',
          },
        });

        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty('error', 'Benutzer existiert bereits');
      });

      it('sollte Eingaben sanitisieren', async () => {
        const response = await makeTestRequest(testServer, 'POST', '/api/auth/register', {
          body: {
            email: 'sanitize@test-suite.local',
            password: 'San1t1ze!',
            firstName: 'javaScript:Ali<ce>',
            lastName: 'Ev</>il',
          },
        });

        expect(response.status).toBe(201);
        const user = response.body.user;
        expect(user.firstName).not.toMatch(/</);
        expect(user.firstName).not.toMatch(/>/);
        expect(user.firstName.toLowerCase()).not.toContain('javascript:');
        expect(user.lastName).not.toMatch(/</);
        expect(user.lastName).not.toMatch(/>/);
        expect(user.lastName.toLowerCase()).not.toContain('javascript:');
      });

      it('sollte Registrierung bei bereits existierendem Benutzer ablehnen', async () => {
        const response = await makeTestRequest(testServer, 'POST', '/api/auth/register', {
          body: {
            email: 'admin@test-suite.local',
            password: 'SomePass123!',
            firstName: 'Test',
            lastName: 'User',
          },
        });

        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty('error', 'Benutzer existiert bereits');
      });

      it('sollte Registrierung bei fehlenden Feldern ablehnen', async () => {
        const response = await makeTestRequest(testServer, 'POST', '/api/auth/register', {
          body: {
            email: 'test@test-suite.local',
            password: 'TestPass123!',
          },
        });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Alle Felder sind erforderlich');
      });
    });
  });

  describe('Dashboard-Routen', () => {
    let testServer: any;

    beforeEach(async () => {
      testServer = await setupTestServer();
    });

    describe('GET /api/dashboard/stats', () => {
      it('sollte Dashboard-Statistiken zurückgeben', async () => {
        const response = await makeTestRequest(testServer, 'GET', '/api/dashboard/stats');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('users');
        expect(response.body).toHaveProperty('projects');
        expect(response.body).toHaveProperty('revenue');
        expect(response.body).toHaveProperty('performance');
        expect(response.body.users).toHaveProperty('total', 1250);
        expect(response.body.users).toHaveProperty('active', 890);
        expect(response.body.performance).toHaveProperty('avgResponseTime', 245);
      });
    });

    describe('GET /api/dashboard/activity', () => {
      it('sollte Dashboard-Aktivitäten zurückgeben', async () => {
        const response = await makeTestRequest(testServer, 'GET', '/api/dashboard/activity');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);

        const firstActivity = response.body[0];
        expect(firstActivity).toHaveProperty('id');
        expect(firstActivity).toHaveProperty('type');
        expect(firstActivity).toHaveProperty('message');
        expect(firstActivity).toHaveProperty('timestamp');
        expect(firstActivity).toHaveProperty('user');
      });
    });
  });

  describe('Newsletter-Routen', () => {
    let testServer: any;

    beforeEach(async () => {
      testServer = await setupTestServer();
    });

    describe('POST /api/newsletter/subscribe', () => {
      it('sollte erfolgreiches Abonnement verarbeiten', async () => {
        const response = await makeTestRequest(testServer, 'POST', '/api/newsletter/subscribe', {
          body: { email: 'newsubscriber@test-suite.local' },
        });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Erfolgreich abonniert');
        expect(response.body).toHaveProperty('email', 'newsubscriber@test-suite.local');
      });

      it('sollte bereits abonnierten Benutzer ablehnen', async () => {
        const response = await makeTestRequest(testServer, 'POST', '/api/newsletter/subscribe', {
          body: { email: 'newsletter@test-suite.local' },
        });

        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty('error', 'Bereits abonniert');
      });

      it('sollte fehlende Email ablehnen', async () => {
        const response = await makeTestRequest(testServer, 'POST', '/api/newsletter/subscribe', {
          body: {},
        });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Email ist erforderlich');
      });
    });

    describe('POST /api/newsletter/unsubscribe', () => {
      it('sollte erfolgreiche Abmeldung verarbeiten', async () => {
        const response = await makeTestRequest(testServer, 'POST', '/api/newsletter/unsubscribe', {
          body: { email: 'subscriber@test-suite.local' },
        });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Erfolgreich abgemeldet');
        expect(response.body).toHaveProperty('email', 'subscriber@test-suite.local');
      });

      it('sollte fehlende Email ablehnen', async () => {
        const response = await makeTestRequest(testServer, 'POST', '/api/newsletter/unsubscribe', {
          body: {},
        });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Email ist erforderlich');
      });
    });
  });

  describe('createMockRoute', () => {
    let testServer: any;

    beforeEach(async () => {
      testServer = await setupTestServer();
    });

    it('sollte benutzerdefinierte Mock-Route erstellen', () => {
      const mockResponse = {
        status: 201,
        body: { message: 'Created successfully' },
      };

      createMockRoute(testServer, 'POST', '/api/custom', mockResponse);
      expect(testServer.routes.has('POST /api/custom')).toBe(true);
    });

    it('sollte Mock-Route mit Verzögerung erstellen', async () => {
      const mockResponse = {
        status: 200,
        body: { data: 'delayed response' },
        delay: 100,
      };

      createMockRoute(testServer, 'GET', '/api/delayed', mockResponse);

      const startTime = Date.now();
      const response = await makeTestRequest(testServer, 'GET', '/api/delayed');
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(100);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse.body);
    });

    it('sollte Mock-Route mit benutzerdefinierten Headern erstellen', async () => {
      const mockResponse = {
        status: 200,
        headers: { 'X-Custom-Header': 'test-value' },
        body: { success: true },
      };

      createMockRoute(testServer, 'GET', '/api/headers', mockResponse);

      const response = await makeTestRequest(testServer, 'GET', '/api/headers');

      expect(response.status).toBe(200);
      expect(response.headers['X-Custom-Header']).toBe('test-value');
    });
  });

  describe('removeMockRoute', () => {
    let testServer: any;

    beforeEach(async () => {
      testServer = await setupTestServer();
    });

    it('sollte Mock-Route entfernen', () => {
      createMockRoute(testServer, 'GET', '/api/temp', { status: 200 });

      expect(testServer.routes.has('GET /api/temp')).toBe(true);

      removeMockRoute(testServer, 'GET', '/api/temp');
      expect(testServer.routes.has('GET /api/temp')).toBe(false);
    });

    it('sollte nicht vorhandene Route stillschweigend ignorieren', () => {
      expect(() => removeMockRoute(testServer, 'GET', '/api/nonexistent')).not.toThrow();
    });
  });

  describe('makeTestRequest', () => {
    let testServer: any;

    beforeEach(async () => {
      testServer = await setupTestServer();
    });

    it('sollte erfolgreiche Anfragen verarbeiten', async () => {
      const response = await makeTestRequest(testServer, 'GET', '/health');

      expect(response).toHaveProperty('status', 200);
      expect(response).toHaveProperty('headers');
      expect(response).toHaveProperty('body');
    });

    it('sollte Logger über API-Aufrufe informieren', async () => {
      await makeTestRequest(testServer, 'GET', '/health');

      expect(mockLogger.api.request).toHaveBeenCalledWith('GET', '/health');
      expect(mockLogger.api.response).toHaveBeenCalledWith('GET', '/health', 200);
    });

    it('sollte Fehler bei nicht vorhandenen Routen behandeln', async () => {
      const response = await makeTestRequest(testServer, 'GET', '/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Route nicht gefunden');
      expect(mockLogger.api.error).toHaveBeenCalled();
    });

    it('sollte Query-Parameter verarbeiten', async () => {
      createMockRoute(testServer, 'GET', '/api/search', {
        status: 200,
        body: { results: [] },
      });

      const response = await makeTestRequest(testServer, 'GET', '/api/search', {
        query: { q: 'test', limit: '10' },
      });

      expect(response.status).toBe(200);
    });

    it('sollte Header verarbeiten', async () => {
      const response = await makeTestRequest(testServer, 'GET', '/health', {
        headers: { Authorization: 'Bearer token123' },
      });

      expect(response.status).toBe(200);
    });

    it('sollte Request-Body verarbeiten', async () => {
      const response = await makeTestRequest(testServer, 'POST', '/api/auth/login', {
        body: { email: 'test@test-suite.local', password: 'password' },
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Edge Cases und Fehlerbehandlung', () => {
    let testServer: any;

    beforeEach(async () => {
      testServer = await setupTestServer();
    });

    it('sollte mit leeren Request-Bodies umgehen', async () => {
      const response = await makeTestRequest(testServer, 'POST', '/api/auth/login', {
        body: {},
      });

      expect(response.status).toBe(400);
    });

    it('sollte mit null/undefined Werten umgehen', async () => {
      const response = await makeTestRequest(testServer, 'POST', '/api/auth/login', {
        body: { email: null, password: undefined },
      });

      expect(response.status).toBe(400);
    });

    it('sollte mit sehr großen Payloads umgehen', async () => {
      const largeData = 'x'.repeat(1_000_000);

      createMockRoute(testServer, 'POST', '/api/large', {
        status: 200,
        body: { received: true },
      });

      const response = await makeTestRequest(testServer, 'POST', '/api/large', {
        body: { data: largeData },
      });

      expect(response.status).toBe(200);
    });

    it('sollte Route-Handler-Fehler behandeln', async () => {
      createMockRoute(testServer, 'GET', '/api/error', {
        status: 200,
        body: { success: true },
      });

      const route = testServer.routes.get('GET /api/error');
      route.handler = vi.fn().mockRejectedValue(new Error('Handler error'));

      const response = await makeTestRequest(testServer, 'GET', '/api/error');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Interner Server-Fehler');
      expect(mockLogger.api.error).toHaveBeenCalled();
    });
  });

  describe('Performance und Ressourcen-Management', () => {
    it('sollte Request-Counter korrekt verwalten', async () => {
      const testServer = await setupTestServer();
      const initialCount = testServer.requestCount;

      await makeTestRequest(testServer, 'GET', '/health');
      await makeTestRequest(testServer, 'GET', '/api/status');
      await makeTestRequest(testServer, 'POST', '/api/auth/login', {
        body: { email: 'test@test-suite.local', password: 'password' },
      });

      expect(testServer.requestCount).toBe(initialCount + 3);
    });

    it('sollte Server-Uptime korrekt berechnen', async () => {
      const testServer = await setupTestServer();
      const startTime = testServer.startTime;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const response = await makeTestRequest(testServer, 'GET', '/health');
      const uptime = response.body.uptime;

      expect(uptime).toBeGreaterThanOrEqual(10);
      expect(uptime).toBeLessThanOrEqual(100);
    });

    it('sollte mehrere Routen effizient verwalten', async () => {
      const testServer = await setupTestServer();

      for (let i = 0; i < 100; i++) {
        createMockRoute(testServer, 'GET', `/api/route${i}`, {
          status: 200,
          body: { route: i },
        });
      }

      expect(testServer.routes.size).toBeGreaterThan(100);

      const randomRoute = Math.floor(Math.random() * 100);
      const response = await makeTestRequest(testServer, 'GET', `/api/route${randomRoute}`);

      expect(response.status).toBe(200);
      expect(response.body.route).toBe(randomRoute);
    });
  });
});
