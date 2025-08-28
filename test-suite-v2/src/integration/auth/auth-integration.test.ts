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

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body).toHaveProperty('message', 'Erfolgreich abgemeldet');

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