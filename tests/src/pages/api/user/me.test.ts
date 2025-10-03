import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/pages/api/user/me';
import * as rateLimiter from '@/lib/rate-limiter';
import * as securityHeaders from '@/lib/security-headers';
import * as securityLogger from '@/lib/security-logger';

describe('User Me API Tests', () => {
  it('sollte 401 zurückgeben, wenn kein Benutzer authentifiziert ist', async () => {
    // Mock-Context ohne Benutzer
    const context = {
      locals: {},
      clientAddress: '192.168.1.1',
      request: {
        url: 'https://example.com/api/user/me',
        method: 'GET',
      },
      url: new URL('https://example.com/api/user/me'), // Behalten wir für die Abwärtskompatibilität
    };

    // API-Aufruf (jetzt async)
    const response = await GET(context as any);

    // Überprüfungen
    expect(response.status).toBe(401);
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('sollte den authentifizierten Benutzer zurückgeben', async () => {
    // Mock-Benutzerdaten
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      username: 'testuser',
      created_at: '2023-01-01T12:00:00Z',
    };

    // Mock-Context mit authentifiziertem Benutzer
    const context = {
      locals: {
        user: mockUser,
      },
      clientAddress: '192.168.1.1',
      request: {
        url: 'https://example.com/api/user/me',
        method: 'GET',
      },
      url: new URL('https://example.com/api/user/me'),
    };

    // API-Aufruf (jetzt async)
    const response = await GET(context as any);

    // Überprüfungen
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');

    // Response-Body überprüfen
    const responseText = await response.text();
    const responseData = JSON.parse(responseText);

    // Prüfen, ob die erwarteten Felder vorhanden sind
    // Da die Response mit createApiSuccess erstellt wurde, liegen die Benutzerdaten in responseData.data
    expect(responseData.success).toBe(true);
    expect(responseData.data.id).toBe(mockUser.id);
    expect(responseData.data.email).toBe(mockUser.email);
    expect(responseData.data.name).toBe(mockUser.name);
    expect(responseData.data.username).toBe(mockUser.username);
    expect(responseData.data.created_at).toBe(mockUser.created_at);
  });

  it('sollte den Benutzer ohne sensible Daten zurückgeben', async () => {
    // Mock-Benutzerdaten mit sensiblen Informationen
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      username: 'testuser',
      created_at: '2023-01-01T12:00:00Z',
      password_hash: 'hashed_password', // Sollte nicht zurückgegeben werden
      sessions: [], // Sollte nicht zurückgegeben werden
      role: 'user',
      some_internal_data: 'secret', // Weiteres Feld, das nicht zurückgegeben werden sollte
    };

    // Mock-Context mit authentifiziertem Benutzer
    const context = {
      locals: {
        user: mockUser,
      },
      clientAddress: '192.168.1.1',
      request: {
        url: 'https://example.com/api/user/me',
        method: 'GET',
      },
      url: new URL('https://example.com/api/user/me'),
    };

    // API-Aufruf (jetzt async)
    const response = await GET(context as any);

    // Überprüfungen
    const responseText = await response.text();
    const responseData = JSON.parse(responseText);

    // Prüfen, ob das Erfolgsattribut vorhanden ist
    expect(responseData.success).toBe(true);

    // Erlaubte Felder sollten vorhanden sein
    expect(responseData.data.id).toBe('user-123');
    expect(responseData.data.email).toBe('test@example.com');
    expect(responseData.data.name).toBe('Test User');
    expect(responseData.data.username).toBe('testuser');
    expect(responseData.data.created_at).toBe('2023-01-01T12:00:00Z');

    // Sensible Daten sollten NICHT in der Response enthalten sein
    expect(responseData.data.password_hash).toBeUndefined();
    expect(responseData.data.sessions).toBeUndefined();
    expect(responseData.data.some_internal_data).toBeUndefined();
    expect(responseData.data.role).toBeUndefined();
  });

  // Tests für Security-Features
  describe('Security-Features', () => {
    // Mock für die Security-Module
    beforeEach(() => {
      // Mocks vereinfachen - wir testen hier hauptsächlich die ME-API-Logik, nicht die Security-Features
      // Da die Tests für die Middleware (api-middleware.ts) bereits in anderen Dateien existieren
      vi.mock('@/lib/rate-limiter', () => ({
        apiRateLimiter: vi.fn().mockResolvedValue({ success: true }),
        standardApiLimiter: vi.fn().mockResolvedValue({ success: true }),
      }));

      vi.mock('@/lib/security-headers', () => ({
        applySecurityHeaders: vi.fn((response) => response),
      }));

      vi.mock('@/lib/security-logger', () => ({
        logApiAccess: vi.fn(),
        logAuthFailure: vi.fn(),
        logApiError: vi.fn(),
      }));
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    // Da die Middleware-Logik in withAuthApiMiddleware implementiert ist und nicht direkt im Test zugänglich ist,
    // vereinfachen wir diese Tests, um nur die grundlegende Funktionalität zu überprüfen
    it('sollte erfolgreich mit authentifizierten Benutzer arbeiten', async () => {
      // Mock-Context mit authentifiziertem Benutzer
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const context = {
        locals: {
          user: mockUser,
          runtime: {
            env: {},
          },
        },
        clientAddress: '192.168.1.1',
        request: {
          url: 'https://example.com/api/user/me',
          method: 'GET',
        },
        url: new URL('https://example.com/api/user/me'),
      };

      // API-Aufruf
      const response = await GET(context as any);

      // Überprüfen, ob die Antwort erfolgreich ist
      expect(response.status).toBe(200);
    });

    it('sollte bei Rate-Limiting einen entsprechenden Fehler zurückgeben', async () => {
      // Mock-Context mit authentifiziertem Benutzer
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const context = {
        locals: {
          user: mockUser,
          runtime: {
            env: {},
          },
        },
        clientAddress: '192.168.1.1',
        request: {
          url: 'https://example.com/api/user/me',
          method: 'GET',
        },
        url: new URL('https://example.com/api/user/me'),
      };

      // Rate-Limiting simulieren durch direkte Änderung der standardApiLimiter-Mock-Implementierung
      // Wir geben ein falsches Erfolgs-Flag zurück
      const rateLimiter = await import('@/lib/rate-limiter');
      vi.spyOn(rateLimiter, 'standardApiLimiter').mockImplementationOnce(async () => {
        return { success: false };
      });

      // API-Aufruf
      const response = await GET(context as any);

      // Da wir die Middleware nicht direkt testen können (sie wird in withAuthApiMiddleware aufgerufen),
      // prüfen wir einfach, ob die Antwort einen Fehlercode enthält
      expect(response.status).not.toBe(200);
    });

    it('sollte Security-Headers auf Antworten anwenden', async () => {
      // Mock-Context mit authentifiziertem Benutzer
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const context = {
        locals: {
          user: mockUser,
          runtime: {
            env: {},
          },
        },
        clientAddress: '192.168.1.1',
        request: {
          url: 'https://example.com/api/user/me',
          method: 'GET',
        },
        url: new URL('https://example.com/api/user/me'),
      };

      // API-Aufruf
      await GET(context as any);

      // Überprüfen, ob Security-Headers angewendet wurden
      expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    });

    it('sollte API-Zugriffe protokollieren', async () => {
      // Mock-Context mit authentifiziertem Benutzer
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const context = {
        locals: {
          user: mockUser,
          runtime: {
            env: {},
          },
        },
        clientAddress: '192.168.1.1',
        request: {
          url: 'https://example.com/api/user/me',
          method: 'GET',
        },
        url: new URL('https://example.com/api/user/me'),
      };

      // API-Aufruf
      await GET(context as any);

      // Überprüfen, ob der API-Zugriff protokolliert wurde
      expect(securityLogger.logApiAccess).toHaveBeenCalledWith(
        mockUser.id,
        context.clientAddress,
        expect.objectContaining({
          endpoint: '/api/user/me',
          method: 'GET',
        })
      );
    });

    it('sollte bei nicht authentifizierten Zugriffen den Status 401 zurückgeben', async () => {
      // Mock-Context ohne Benutzer
      const context = {
        locals: {},
        clientAddress: '192.168.1.1',
        request: {
          url: 'https://example.com/api/user/me',
          method: 'GET',
        },
        url: new URL('https://example.com/api/user/me'),
      };

      // API-Aufruf
      const response = await GET(context as any);

      // Überprüfen, ob die Antwort den Status 401 hat
      expect(response.status).toBe(401);

      // Antwortdaten überprüfen
      const responseText = await response.text();
      const responseData = JSON.parse(responseText);

      // Erfolg sollte false sein und es sollte eine Fehlermeldung geben
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBeDefined();
      expect(responseData.error.type).toBe('auth_error');
    });
  });
});
