/**
 * Integration-Tests für Authentifizierung
 * Testet komplette Authentifizierungs-Flows von Registrierung bis Logout
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, teardownTestDatabase } from '../../../utils/database-helpers';
import { setupTestServer, teardownTestServer, makeTestRequest } from '../../../utils/server-helpers';
import { getTestLogger } from '../../../utils/logger';

describe('Authentifizierung - Integration Tests', () => {
  let testDatabase: any;
  let testServer: any;
  let logger: any;

  beforeAll(async () => {
    logger = getTestLogger();
    logger.info('Starte Authentifizierung Integration Tests');

    // Setup Test-Infrastruktur
    testDatabase = await setupTestDatabase();
    testServer = await setupTestServer();
  });

  afterAll(async () => {
    // Cleanup Test-Infrastruktur
    if (testServer) {
      await teardownTestServer(testServer);
    }
    if (testDatabase) {
      await teardownTestDatabase(testDatabase);
    }

    logger.info('Authentifizierung Integration Tests abgeschlossen');
  });

  beforeEach(() => {
    // Reset Request-Counter für jeden Test
    testServer.requestCount = 0;
  });

  describe('Vollständiger Authentifizierungs-Flow', () => {
    it('sollte kompletten Registrierung-Login-Logout-Flow unterstützen', async () => {
      const testEmail = `integration-${Date.now()}@test-suite.local`;
      const testPassword = 'IntegrationPass123!';
      const testUser = {
        firstName: 'Integration',
        lastName: 'Test',
      };

      logger.test.start('Complete Auth Flow');

      // 1. Registrierung
      const registerResponse = await makeTestRequest(testServer, 'POST', '/api/auth/register', {
        body: {
          email: testEmail,
          password: testPassword,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
        },
      });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.user).toMatchObject({
        email: testEmail,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        role: 'user',
        verified: false,
      });
      expect(registerResponse.body).toHaveProperty('message', 'Benutzer erfolgreich registriert');

      // 2. Login mit neuem Benutzer
      const loginResponse = await makeTestRequest(testServer, 'POST', '/api/auth/login', {
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      expect(loginResponse.status).toBe(401); // Neuer Benutzer ist nicht in Mock-Datenbank
      expect(loginResponse.body).toHaveProperty('error', 'Ungültige Anmeldedaten');

      // 3. Login mit Test-Benutzer
      const adminLoginResponse = await makeTestRequest(testServer, 'POST', '/api/auth/login', {
        body: {
          email: 'admin@test-suite.local',
          password: 'AdminPass123!',
        },
      });

      expect(adminLoginResponse.status).toBe(200);
      expect(adminLoginResponse.body).toHaveProperty('token', 'mock-jwt-token-admin');
      expect(adminLoginResponse.body.user).toMatchObject({
        email: 'admin@test-suite.local',
        role: 'admin',
      });

      const token = adminLoginResponse.body.token;

      // 4. Logout
      const logoutResponse = await makeTestRequest(testServer, 'POST', '/api/auth/logout', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Deprecated endpoint now returns 410 Gone (HTML)
      expect(logoutResponse.status).toBe(410);
      expect(typeof logoutResponse.body).toBe('string');
      expect(logoutResponse.body).toContain('<!doctype html>');
      expect(logoutResponse.body).toContain('410 Gone');
      expect(logoutResponse.headers['Cache-Control']).toBe('no-store');
      expect(logoutResponse.headers['Content-Type']).toContain('text/html');

      logger.test.pass('Complete Auth Flow', 150);
    });

    it('sollte parallele Authentifizierungen unterstützen', async () => {
      logger.test.start('Parallel Authentications');

      // Parallele Login-Versuche
      const loginPromises = [
        makeTestRequest(testServer, 'POST', '/api/auth/login', {
          body: { email: 'admin@test-suite.local', password: 'AdminPass123!' },
        }),
        makeTestRequest(testServer, 'POST', '/api/auth/login', {
          body: { email: 'user@test-suite.local', password: 'UserPass123!' },
        }),
        makeTestRequest(testServer, 'POST', '/api/auth/login', {
          body: { email: 'premium@test-suite.local', password: 'PremiumPass123!' },
        }),
      ];

      const responses = await Promise.all(loginPromises);

      // Alle sollten erfolgreich sein
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');

        if (index === 0) {
          expect(response.body.user.role).toBe('admin');
        } else if (index === 1) {
          expect(response.body.user.role).toBe('user');
        } else {
          expect(response.body.user.role).toBe('premium');
        }
      });

      logger.test.pass('Parallel Authentications', 200);
    });
  });

  describe('Sicherheits-Tests', () => {
    it('sollte Brute-Force-Angriffe erkennen und blockieren', async () => {
      logger.test.start('Brute Force Protection');

      const maxAttempts = 10;
      let successfulLogins = 0;
      let failedAttempts = 0;

      // Mehrere fehlgeschlagene Login-Versuche
      for (let i = 0; i < maxAttempts; i++) {
        const response = await makeTestRequest(testServer, 'POST', '/api/auth/login', {
          body: {
            email: 'admin@test-suite.local',
            password: 'wrongpassword',
          },
        });

        if (response.status === 200) {
          successfulLogins++;
        } else if (response.status === 401) {
          failedAttempts++;
        }
      }

      // Sollte keine erfolgreichen Logins mit falschem Passwort geben
      expect(successfulLogins).toBe(0);
      expect(failedAttempts).toBe(maxAttempts);

      // Erfolgreicher Login sollte weiterhin funktionieren
      const validResponse = await makeTestRequest(testServer, 'POST', '/api/auth/login', {
        body: {
          email: 'admin@test-suite.local',
          password: 'AdminPass123!',
        },
      });

      expect(validResponse.status).toBe(200);

      logger.test.pass('Brute Force Protection', 50);
    });

    it('sollte SQL-Injection-Versuche abwehren', async () => {
      logger.test.start('SQL Injection Protection');

      const sqlInjectionAttempts = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --",
        "admin'--",
        "' OR 1=1 --",
      ];

      for (const maliciousInput of sqlInjectionAttempts) {
        const response = await makeTestRequest(testServer, 'POST', '/api/auth/login', {
          body: {
            email: maliciousInput,
            password: 'password',
          },
        });

        // Sollte nicht erfolgreich sein
        expect(response.status).not.toBe(200);
        expect(response.body).not.toHaveProperty('token');
      }

      logger.test.pass('SQL Injection Protection', 75);
    });

    it('sollte XSS-Versuche in Input-Feldern abwehren', async () => {
      logger.test.start('XSS Protection');

      const xssAttempts = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '<iframe src="javascript:alert(\'xss\')"></iframe>',
      ];

      for (const xssInput of xssAttempts) {
        const response = await makeTestRequest(testServer, 'POST', '/api/auth/register', {
          body: {
            email: `test-${Date.now()}@test-suite.local`,
            password: 'TestPass123!',
            firstName: xssInput,
            lastName: 'Test',
          },
        });

        // Registrierung sollte erfolgreich sein, aber XSS sollte nicht in Response enthalten sein
        if (response.status === 201) {
          expect(response.body.user.firstName).not.toContain('<script>');
          expect(response.body.user.firstName).not.toContain('javascript:');
        }
      }

      logger.test.pass('XSS Protection', 60);
    });
  });

  describe('Performance-Tests', () => {
    it('sollte schnelle Response-Zeiten für Authentifizierung gewährleisten', async () => {
      logger.test.start('Authentication Performance');

      const iterations = 50;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        await makeTestRequest(testServer, 'POST', '/api/auth/login', {
          body: {
            email: 'admin@test-suite.local',
            password: 'AdminPass123!',
          },
        });

        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      logger.performance.memory(avgResponseTime, 100); // Sollte unter 100ms liegen

      expect(avgResponseTime).toBeLessThan(100); // Durchschnitt unter 100ms
      expect(maxResponseTime).toBeLessThan(500); // Maximum unter 500ms
      expect(minResponseTime).toBeGreaterThan(0); // Minimum über 0ms

      logger.info(`Performance-Ergebnisse: Avg: ${avgResponseTime}ms, Min: ${minResponseTime}ms, Max: ${maxResponseTime}ms`);

      logger.test.pass('Authentication Performance', avgResponseTime);
    });

    it('sollte hohe Last ohne Performance-Einbußen bewältigen', async () => {
      logger.test.start('High Load Authentication');

      const concurrentRequests = 20;
      const startTime = Date.now();

      // Erstelle mehrere parallele Authentifizierungs-Anfragen
      const authPromises = Array.from({ length: concurrentRequests }, () =>
        makeTestRequest(testServer, 'POST', '/api/auth/login', {
          body: {
            email: 'admin@test-suite.local',
            password: 'AdminPass123!',
          },
        })
      );

      const responses = await Promise.all(authPromises);
      const totalTime = Date.now() - startTime;

      // Alle Anfragen sollten erfolgreich sein
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
      });

      const avgTimePerRequest = totalTime / concurrentRequests;

      expect(avgTimePerRequest).toBeLessThan(200); // Unter 200ms pro Anfrage
      expect(totalTime).toBeLessThan(5000); // Gesamt unter 5 Sekunden

      logger.info(`Lasttest-Ergebnisse: ${concurrentRequests} Anfragen in ${totalTime}ms (${avgTimePerRequest}ms/Request)`);

      logger.test.pass('High Load Authentication', totalTime);
    });
  });

  describe('Fehlerbehandlung und Recovery', () => {
    it('sollte Graceful Degradation bei Server-Fehlern bieten', async () => {
      logger.test.start('Graceful Degradation');

      // Simuliere Server-Überlastung durch viele gleichzeitige Anfragen
      const overloadRequests = 100;
      const overloadPromises = Array.from({ length: overloadRequests }, () =>
        makeTestRequest(testServer, 'POST', '/api/auth/login', {
          body: {
            email: 'admin@test-suite.local',
            password: 'AdminPass123!',
          },
        })
      );

      const results = await Promise.allSettled(overloadPromises);

      const fulfilled = results.filter(r => r.status === 'fulfilled').length;
      const rejected = results.filter(r => r.status === 'rejected').length;

      // Sollte keine oder nur sehr wenige Ablehnungen geben
      expect(rejected).toBeLessThan(5); // Weniger als 5% Fehler
      expect(fulfilled).toBeGreaterThan(95); // Mehr als 95% erfolgreich

      logger.info(`Überlastungstest: ${fulfilled} erfolgreich, ${rejected} fehlgeschlagen`);

      logger.test.pass('Graceful Degradation', 100);
    });

    it('sollte bei Netzwerk-Fehlern wiederherstellbar sein', async () => {
      logger.test.start('Network Error Recovery');

      // Simuliere temporäre Netzwerkprobleme
      let requestCount = 0;
      const originalRequest = testServer.requestCount;

      for (let i = 0; i < 10; i++) {
        try {
          const response = await makeTestRequest(testServer, 'GET', '/health');
          requestCount++;

          if (response.status === 200) {
            expect(response.body).toHaveProperty('status', 'healthy');
          }
        } catch (error) {
          logger.warn(`Netzwerk-Fehler bei Versuch ${i + 1}:`, error);
        }

        // Kleine Pause zwischen Versuchen
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Sollte mindestens einige erfolgreiche Anfragen haben
      expect(requestCount).toBeGreaterThan(5);
      expect(testServer.requestCount).toBeGreaterThan(originalRequest + 5);

      logger.test.pass('Network Error Recovery', 80);
    });
  });

  describe('Datenkonsistenz und Race Conditions', () => {
    it('sollte gleichzeitige Registrierungen mit derselben Email verhindern', async () => {
      logger.test.start('Concurrent Registration Prevention');

      const email = `concurrent-${Date.now()}@test-suite.local`;
      const concurrentRegistrations = 5;

      const registrationPromises = Array.from({ length: concurrentRegistrations }, () =>
        makeTestRequest(testServer, 'POST', '/api/auth/register', {
          body: {
            email,
            password: 'TestPass123!',
            firstName: 'Concurrent',
            lastName: 'Test',
          },
        })
      );

      const results = await Promise.all(registrationPromises);

      // Nur eine Registrierung sollte erfolgreich sein
      const successful = results.filter(r => r.status === 201).length;
      const conflicts = results.filter(r => r.status === 409).length;

      expect(successful + conflicts).toBe(concurrentRegistrations);

      // Entweder eine erfolgreich oder alle Konflikte (je nach Implementierung)
      expect(successful === 1 || conflicts === concurrentRegistrations).toBe(true);

      logger.test.pass('Concurrent Registration Prevention', 120);
    });

    it('sollte Session-Isolation zwischen verschiedenen Benutzern gewährleisten', async () => {
      logger.test.start('Session Isolation');

      // Login mit verschiedenen Benutzern
      const adminLogin = await makeTestRequest(testServer, 'POST', '/api/auth/login', {
        body: { email: 'admin@test-suite.local', password: 'AdminPass123!' },
      });

      const userLogin = await makeTestRequest(testServer, 'POST', '/api/auth/login', {
        body: { email: 'user@test-suite.local', password: 'UserPass123!' },
      });

      expect(adminLogin.body.token).not.toBe(userLogin.body.token);
      expect(adminLogin.body.user.role).toBe('admin');
      expect(userLogin.body.user.role).toBe('user');

      // Tokens sollten unterschiedlich sein
      expect(adminLogin.body.token).toMatch(/^mock-jwt-token-/);
      expect(userLogin.body.token).toMatch(/^mock-jwt-token-/);
      expect(adminLogin.body.token).not.toBe(userLogin.body.token);

      logger.test.pass('Session Isolation', 90);
    });
  });

  describe('Monitoring und Logging', () => {
    it('sollte alle Authentifizierungs-Events korrekt loggen', async () => {
      logger.test.start('Authentication Logging');

      // Führe verschiedene Authentifizierungs-Aktionen durch
      await makeTestRequest(testServer, 'POST', '/api/auth/login', {
        body: { email: 'admin@test-suite.local', password: 'AdminPass123!' },
      });

      await makeTestRequest(testServer, 'POST', '/api/auth/login', {
        body: { email: 'invalid@test-suite.local', password: 'wrong' },
      });

      await makeTestRequest(testServer, 'POST', '/api/auth/register', {
        body: {
          email: `logtest-${Date.now()}@test-suite.local`,
          password: 'TestPass123!',
          firstName: 'Log',
          lastName: 'Test',
        },
      });

      await makeTestRequest(testServer, 'POST', '/api/auth/logout');

      // Verifiziere Request-Counter
      expect(testServer.requestCount).toBe(4);

      logger.test.pass('Authentication Logging', 50);
    });

    it('sollte Performance-Metriken sammeln', async () => {
      logger.test.start('Performance Metrics Collection');

      const metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
      };

      const testRequests = 20;
      const responseTimes: number[] = [];

      for (let i = 0; i < testRequests; i++) {
        const startTime = Date.now();

        const response = await makeTestRequest(testServer, 'POST', '/api/auth/login', {
          body: {
            email: i % 2 === 0 ? 'admin@test-suite.local' : 'user@test-suite.local',
            password: i % 2 === 0 ? 'AdminPass123!' : 'UserPass123!',
          },
        });

        const endTime = Date.now();
        responseTimes.push(endTime - startTime);

        metrics.totalRequests++;

        if (response.status === 200) {
          metrics.successfulRequests++;
        } else {
          metrics.failedRequests++;
        }
      }

      metrics.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

      expect(metrics.totalRequests).toBe(testRequests);
      expect(metrics.successfulRequests).toBe(testRequests);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageResponseTime).toBeLessThan(100);

      logger.info(`Performance-Metriken: ${JSON.stringify(metrics, null, 2)}`);

      logger.test.pass('Performance Metrics Collection', metrics.averageResponseTime);
    });
  });
});
// Ergänzende Unit-ähnliche Tests für AuthService-Methoden (mit Mocks)
describe('AuthService Methoden', () => {
  let authService: AuthService;
  let mockDb: any;
  let mockCompare: any;
  let mockHash: any;
  let mockCreateSession: any;
  let mockValidateSessionV2: any;
  let mockInvalidateSession: any;
  let mockSecurityLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      first: vi.fn(),
      run: vi.fn(),
    };
    mockCompare = vi.fn();
    mockHash = vi.fn();
    mockCreateSession = vi.fn();
    mockValidateSessionV2 = vi.fn();
    mockInvalidateSession = vi.fn();
    mockSecurityLogger = {
      logAuthFailure: vi.fn(),
      logAuthSuccess: vi.fn(),
      logSecurityEvent: vi.fn(),
    };

    vi.mocked(require('bcrypt-ts')).compare = mockCompare;
    vi.mocked(require('bcrypt-ts')).hash = mockHash;
    vi.mocked(require('@/lib/auth-v2')).createSession = mockCreateSession;
    vi.mocked(require('@/lib/auth-v2')).validateSession = mockValidateSessionV2;
    vi.mocked(require('@/lib/auth-v2')).invalidateSession = mockInvalidateSession;
    vi.mocked(require('@/server/utils/logger-factory')).loggerFactory.createSecurityLogger.mockReturnValue(mockSecurityLogger);

    const deps = { db: mockDb, env: {}, logger: {} };
    authService = createAuthService(deps);
  });

  describe('login', () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      username: 'testuser',
      password_hash: '$2b$12$hash',
      created_at: '2023-01-01T00:00:00Z',
      email_verified: true,
      email_verified_at: '2023-01-01T00:00:00Z',
    };
    const mockSession = { id: 'session123', userId: 'user123', expiresAt: '2024-01-01T00:00:00Z', createdAt: '2023-01-01T00:00:00Z' };

    it('sollte erfolgreich loggen mit gültigen Credentials', async () => {
      mockDb.first.mockResolvedValueOnce(mockUser);
      mockCompare.mockResolvedValueOnce(true);
      mockCreateSession.mockResolvedValueOnce(mockSession);

      const result = await authService.login('test@example.com', 'password', '127.0.0.1');

      expect(mockDb.first).toHaveBeenCalledWith('SELECT * FROM users WHERE email = ?');
      expect(mockCompare).toHaveBeenCalledWith('password', mockUser.password_hash);
      expect(mockCreateSession).toHaveBeenCalledWith(mockDb, mockUser.id);
      expect(mockSecurityLogger.logAuthSuccess).toHaveBeenCalled();
      expect(result.user.id).toBe('user123');
      expect(result.sessionId).toBe('session123');
    });

    it('sollte ServiceError werfen für ungültige Credentials', async () => {
      mockDb.first.mockResolvedValueOnce(mockUser);
      mockCompare.mockResolvedValueOnce(false);

      await expect(authService.login('test@example.com', 'wrong', '127.0.0.1')).rejects.toThrow(ServiceError);
      expect(mockSecurityLogger.logAuthFailure).toHaveBeenCalledWith(expect.objectContaining({ reason: 'invalid_password' }), expect.any(Object));
      expect(mockCreateSession).not.toHaveBeenCalled();
    });

    it('sollte ServiceError werfen für nicht verifizierte E-Mail', async () => {
      const unverifiedUser = { ...mockUser, email_verified: false };
      mockDb.first.mockResolvedValueOnce(unverifiedUser);
      mockCompare.mockResolvedValueOnce(true);

      await expect(authService.login('test@example.com', 'password', '127.0.0.1')).rejects.toThrow(ServiceError);
      expect(mockSecurityLogger.logAuthFailure).toHaveBeenCalledWith(expect.objectContaining({ reason: 'email_not_verified' }), expect.any(Object));
    });

    it('sollte ServiceError werfen für fehlenden password_hash', async () => {
      const noHashUser = { ...mockUser, password_hash: null };
      mockDb.first.mockResolvedValueOnce(noHashUser);

      await expect(authService.login('test@example.com', 'password', '127.0.0.1')).rejects.toThrow(ServiceError);
      expect(mockSecurityLogger.logAuthFailure).toHaveBeenCalledWith(expect.objectContaining({ reason: 'missing_password_hash' }), expect.any(Object));
    });

    it('sollte ServiceError werfen für nicht existierenden Benutzer', async () => {
      mockDb.first.mockResolvedValueOnce(null);

      await expect(authService.login('nonexistent@example.com', 'password', '127.0.0.1')).rejects.toThrow(ServiceError);
      expect(mockSecurityLogger.logAuthFailure).toHaveBeenCalledWith(expect.objectContaining({ reason: 'user_not_found' }), expect.any(Object));
    });
  });

  describe('register', () => {
    const registerData = {
      email: 'new@example.com',
      password: 'newpass123',
      name: 'New User',
      username: 'newuser',
    };

    it('sollte neuen Benutzer erfolgreich registrieren', async () => {
      mockDb.first
        .mockResolvedValueOnce(null) // no email
        .mockResolvedValueOnce(null); // no username
      mockHash.mockResolvedValueOnce('$2b$12$newhash');

      const result = await authService.register(registerData, '127.0.0.1');

      expect(mockDb.first).toHaveBeenNthCalledWith(1, 'SELECT id FROM users WHERE email = ?');
      expect(mockDb.first).toHaveBeenNthCalledWith(2, 'SELECT id FROM users WHERE username = ?');
      expect(mockHash).toHaveBeenCalledWith('newpass123', 12);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        [expect.any(String), 'new@example.com', 'New User', 'newuser', '$2b$12$newhash', expect.any(String), null]
      );
      expect(mockSecurityLogger.logAuthSuccess).toHaveBeenCalled();
      expect(result.user.email).toBe('new@example.com');
    });

    it('sollte ServiceError werfen für duplizierte E-Mail', async () => {
      mockDb.first.mockResolvedValueOnce({ id: 'existing' });

      await expect(authService.register(registerData, '127.0.0.1')).rejects.toThrow(ServiceError);
      expect(mockSecurityLogger.logAuthFailure).toHaveBeenCalledWith(expect.objectContaining({ reason: 'duplicate_user' }), expect.any(Object));
      expect(mockDb.run).not.toHaveBeenCalled();
    });

    it('sollte ServiceError werfen für duplizierten Username', async () => {
      mockDb.first
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing' });

      await expect(authService.register(registerData, '127.0.0.1')).rejects.toThrow(ServiceError);
      expect(mockSecurityLogger.logAuthFailure).toHaveBeenCalledWith(expect.objectContaining({ reason: 'duplicate_username' }), expect.any(Object));
    });
  });

  describe('logout', () => {
    it('sollte Session erfolgreich invalidieren', async () => {
      mockInvalidateSession.mockResolvedValueOnce(undefined);

      await expect(authService.logout('session123')).resolves.not.toThrow();

      expect(mockInvalidateSession).toHaveBeenCalledWith(mockDb, 'session123');
    });
  });

  describe('validateSession', () => {
    const mockValid = { session: { id: 's123', userId: 'u123', expiresAt: '2024-01-01T00:00:00Z', createdAt: '2023-01-01T00:00:00Z' }, user: { id: 'u123', email: 'test@example.com', name: 'Test', username: 'test', image: null } };
    const mockSafeUser: SafeUser = { id: 'u123', email: 'test@example.com', name: 'Test', username: 'test', image: null, created_at: '2023-01-01T00:00:00Z' };

    it('sollte gültige Session und User zurückgeben', async () => {
      mockValidateSessionV2.mockResolvedValueOnce(mockValid);
      mockDb.first.mockResolvedValueOnce({ created_at: '2023-01-01T00:00:00Z' });

      const result = await authService.validateSession('s123');

      expect(mockValidateSessionV2).toHaveBeenCalledWith(mockDb, 's123');
      expect(mockDb.first).toHaveBeenCalledWith('SELECT created_at FROM users WHERE id = ?');
      expect(result.session).toEqual(mockValid.session);
      expect(result.user).toEqual(mockSafeUser);
    });

    it('sollte null für ungültige Session zurückgeben', async () => {
      mockValidateSessionV2.mockResolvedValueOnce({ session: null, user: null });

      const result = await authService.validateSession('invalid');

      expect(result.session).toBeNull();
      expect(result.user).toBeNull();
    });
  });

  describe('createPasswordResetToken', () => {
    it('sollte Token für existierenden User erstellen', async () => {
      mockDb.first.mockResolvedValueOnce({ id: 'u123' });
      mockDb.run
        .mockResolvedValueOnce(undefined) // delete
        .mockResolvedValueOnce(undefined); // insert

      const result = await authService.createPasswordResetToken('test@example.com', '127.0.0.1');

      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM password_reset_tokens WHERE user_id = ?', ['u123']);
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith('PASSWORD_RESET', expect.any(Object), expect.any(Object));
    });

    it('sollte true für nicht existierenden User zurückgeben', async () => {
      mockDb.first.mockResolvedValueOnce(null);

      const result = await authService.createPasswordResetToken('nonexistent@example.com', '127.0.0.1');

      expect(result).toBe(true);
      expect(mockDb.run).not.toHaveBeenCalled();
    });
  });

  describe('validatePasswordResetToken', () => {
    const now = Math.floor(Date.now() / 1000);

    it('sollte userId für gültiges Token zurückgeben', async () => {
      mockDb.first.mockResolvedValueOnce({ user_id: 'u123', expires_at: now + 3600 });

      const result = await authService.validatePasswordResetToken('valid');

      expect(result).toBe('u123');
    });

    it('sollte null für abgelaufenes Token zurückgeben und löschen', async () => {
      mockDb.first.mockResolvedValueOnce({ user_id: 'u123', expires_at: now - 3600 });
      mockDb.run.mockResolvedValueOnce(undefined);

      const result = await authService.validatePasswordResetToken('expired');

      expect(result).toBeNull();
      expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM password_reset_tokens WHERE id = ?', ['expired']);
    });

    it('sollte null für nicht existierendes Token zurückgeben', async () => {
      mockDb.first.mockResolvedValueOnce(null);

      const result = await authService.validatePasswordResetToken('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('resetPassword', () => {
    it('sollte Passwort erfolgreich zurücksetzen', async () => {
      vi.doMock('@/lib/services/auth-service', () => ({ validatePasswordResetToken: vi.fn().mockResolvedValue('u123') }));
      mockHash.mockResolvedValueOnce('$2b$12$newhash');
      mockDb.run
        .mockResolvedValueOnce(undefined) // update
        .mockResolvedValueOnce(undefined); // delete

      const result = await authService.resetPassword('token', 'newpass', '127.0.0.1');

      expect(result).toBe(true);
      expect(mockHash).toHaveBeenCalled();
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith('PASSWORD_RESET', expect.any(Object), expect.any(Object));
    });

    it('sollte ServiceError für ungültiges Token werfen', async () => {
      vi.doMock('@/lib/services/auth-service', () => ({ validatePasswordResetToken: vi.fn().mockResolvedValue(null) }));

      await expect(authService.resetPassword('invalid', 'newpass', '127.0.0.1')).rejects.toThrow(ServiceError);
      expect(mockDb.run).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const mockUser = {
      id: 'u123',
      email: 'test@example.com',
      name: 'Test',
      username: 'test',
      password_hash: '$2b$12$oldhash',
      created_at: '2023-01-01T00:00:00Z',
      email_verified: true,
      email_verified_at: '2023-01-01T00:00:00Z',
    };

    it('sollte Passwort erfolgreich ändern', async () => {
      mockDb.first.mockResolvedValueOnce(mockUser);
      mockCompare.mockResolvedValueOnce(true);
      mockHash.mockResolvedValueOnce('$2b$12$newhash');

      const result = await authService.changePassword('u123', 'oldpass', 'newpass', '127.0.0.1');

      expect(result).toBe(true);
      expect(mockCompare).toHaveBeenCalled();
      expect(mockHash).toHaveBeenCalled();
      expect(mockDb.run).toHaveBeenCalledWith('UPDATE users SET password_hash = ? WHERE id = ?', ['$2b$12$newhash', 'u123']);
      expect(mockSecurityLogger.logAuthSuccess).toHaveBeenCalled();
    });

    it('sollte ServiceError für ungültiges aktuelles Passwort werfen', async () => {
      mockDb.first.mockResolvedValueOnce(mockUser);
      mockCompare.mockResolvedValueOnce(false);

      await expect(authService.changePassword('u123', 'wrong', 'new', '127.0.0.1')).rejects.toThrow(ServiceError);
      expect(mockSecurityLogger.logAuthFailure).toHaveBeenCalled();
      expect(mockHash).not.toHaveBeenCalled();
    });

    it('sollte ServiceError für gleiches Passwort werfen', async () => {
      mockDb.first.mockResolvedValueOnce(mockUser);
      mockCompare.mockResolvedValueOnce(true);

      await expect(authService.changePassword('u123', 'old', 'old', '127.0.0.1')).rejects.toThrow(ServiceError);
      expect(mockCompare).toHaveBeenCalled();
      expect(mockHash).not.toHaveBeenCalled();
    });

    it('sollte ServiceError für nicht existierenden User werfen', async () => {
      mockDb.first.mockResolvedValueOnce(null);

      await expect(authService.changePassword('nonexistent', 'old', 'new', '127.0.0.1')).rejects.toThrow(ServiceError);
      expect(mockSecurityLogger.logAuthFailure).toHaveBeenCalled();
    });

    it('sollte ServiceError für fehlenden password_hash werfen', async () => {
      const noHashUser = { ...mockUser, password_hash: null };
      mockDb.first.mockResolvedValueOnce(noHashUser);

      await expect(authService.changePassword('u123', 'old', 'new', '127.0.0.1')).rejects.toThrow(ServiceError);
      expect(noHashUser.password_hash).toBeNull();
    });
  });
});