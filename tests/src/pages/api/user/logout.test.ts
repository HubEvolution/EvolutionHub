import { describe, expect, it, vi, beforeEach, afterAll } from 'vitest';
import { GET, POST } from '@/pages/api/user/logout';
import * as authModule from '@/lib/auth-v2';
import * as rateLimiter from '@/lib/rate-limiter';
import * as securityHeaders from '@/lib/security-headers';
import * as securityLogger from '@/lib/security-logger';
import * as apiMiddleware from '@/lib/api-middleware';

// Mock das auth-v2 Modul
vi.mock('@/lib/auth-v2', () => ({
  invalidateSession: vi.fn().mockResolvedValue(undefined),
}));

// Mocks für Security-Module
vi.mock('@/lib/rate-limiter', () => ({
  standardApiLimiter: vi.fn().mockResolvedValue(null),
  apiRateLimiter: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/security-headers', () => ({
  applySecurityHeaders: vi.fn((response) => {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Content-Security-Policy', "default-src 'self'");
    return response;
  }),
}));

vi.mock('@/lib/security-logger', () => ({
  logAuthAttempt: vi.fn(),
  logAuthSuccess: vi.fn(),
  logAuthFailure: vi.fn(),
  logSecurityEvent: vi.fn(),
  logUserEvent: vi.fn()
}));

vi.mock('@/lib/api-middleware', () => ({
  withMiddleware: vi.fn((handler) => handler),
  createApiError: vi.fn((message, status) => ({ message, status })),
  validateBody: vi.fn().mockResolvedValue(true)
}));

describe('Logout API Tests', () => {
  const mockContext = {
    cookies: {
      get: vi.fn(),
      delete: vi.fn(),
    },
    locals: {
      runtime: {
        env: {
          DB: 'mock-db-object',
        },
        user: undefined, // Kann für bestimmte Tests überschrieben werden
      },
    },
    redirect: vi.fn(),
    clientAddress: '192.168.1.1', // Wird für Security-Tests benötigt
  };

  // Mock Response für Tests
  const mockResponse = {
    status: 302,
    headers: {
      Location: '/',
    },
  };

  // Spy für die Sicherheitsfunktionen
  let standardApiLimiterSpy: any;
  let applySecurityHeadersSpy: any;
  let logSecurityEventSpy: any;
  let logUserEventSpy: any;
  let createApiErrorSpy: any;

  beforeEach(() => {
    vi.resetAllMocks();
    
    // Spies für die Sicherheitsfunktionen
    standardApiLimiterSpy = vi.spyOn(rateLimiter, 'standardApiLimiter').mockResolvedValue({ success: true });
    applySecurityHeadersSpy = vi.spyOn(securityHeaders, 'applySecurityHeaders');
    logSecurityEventSpy = vi.spyOn(securityLogger, 'logSecurityEvent');
    logUserEventSpy = vi.spyOn(securityLogger, 'logUserEvent');
    createApiErrorSpy = vi.spyOn(apiMiddleware, 'createApiError');
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('logout API', () => {
    it('sollte die Session invalidieren, wenn eine Session-ID vorhanden ist', async () => {
      // Session-ID im Cookie vorhanden
      mockContext.cookies.get.mockReturnValue({ value: 'test-session-id' });
      
      // Wir müssen sicherstellen, dass das DB-Objekt richtig gemockt ist
      const mockDb = {
        prepare: vi.fn().mockReturnThis(),
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };
      mockContext.locals.runtime.env.DB = mockDb;
      
      // Bei diesem Test wird Rate-Limiting nicht aktiviert
      standardApiLimiterSpy.mockResolvedValueOnce(undefined);
      
      const response = await GET(mockContext as any);
      
      // Überprüfungen
      expect(authModule.invalidateSession).toHaveBeenCalledWith(mockDb, 'test-session-id');
      expect(mockContext.cookies.delete).toHaveBeenCalledWith('session_id', { path: '/' });
      
      // Response sollte den richtigen Status und Header haben
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/');
    });

    it('sollte keine Session invalidieren, wenn keine Session-ID vorhanden ist', async () => {
      // Keine Session-ID im Cookie
      mockContext.cookies.get.mockReturnValue(null);
      
      // Bei diesem Test wird Rate-Limiting nicht aktiviert
      standardApiLimiterSpy.mockResolvedValueOnce(undefined);
      
      const response = await GET(mockContext as any);
      
      // Response sollte den richtigen Status und Header haben
      expect(response.status).toBe(302);
      // Prüfe, dass der User zur Startseite weitergeleitet wird (aktuelles Verhalten des Endpunkts)
      expect(response.headers.get('Location')).toBe('/');
    });

    it('sollte zur Startseite weiterleiten, auch wenn ein Fehler auftritt', async () => {
      // Session-ID im Cookie vorhanden
      mockContext.cookies.get.mockReturnValue({ value: 'test-session-id' });
      
      // Bei diesem Test wird Rate-Limiting nicht aktiviert
      standardApiLimiterSpy.mockResolvedValueOnce(undefined);
      
      // Fehler bei invalidateSession simulieren und in try/catch abfangen
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(authModule.invalidateSession).mockRejectedValueOnce(new Error('DB error'));
      
      const response = await GET(mockContext as any);
      
      // Überprüfen, dass der Fehler nicht weitergegeben wurde
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/');
      
      // Überprüfen, dass der Fehler geloggt wurde
      expect(logSecurityEventSpy).toHaveBeenCalledWith(
        'AUTH_FAILURE',
        expect.objectContaining({
          reason: 'logout_error',
          error: expect.any(Error)
        }),
        expect.objectContaining({
          ipAddress: mockContext.clientAddress
        })
      );
      
      // Aufräumen
      consoleErrorSpy.mockRestore();
    });
  });

  describe('API Exports', () => {
    it('sollte GET und POST die gleiche Funktionalität haben', () => {
      expect(GET).toBe(POST);
    });
  });
  
  // Tests für Security-Features
  describe('Security-Features', () => {
    it('sollte Rate-Limiting anwenden', async () => {
      // Session-ID im Cookie vorhanden
      mockContext.cookies.get.mockReturnValue({ value: 'test-session-id' });
      
      await GET(mockContext as any);
      
      expect(standardApiLimiterSpy).toHaveBeenCalled();
    });
    
    it('sollte bei Rate-Limiting zur Login-Seite weiterleiten', async () => {
      // Session-ID im Cookie vorhanden
      mockContext.cookies.get.mockReturnValue({ value: 'test-session-id' });
      
      // Rate-Limiting-Antwort simulieren
      const rateLimitResponse = true; // Wir geben true zurück, da der Endpunkt prüft, ob eine Antwort vorhanden ist
      standardApiLimiterSpy.mockResolvedValueOnce(rateLimitResponse);
      
      const response = await GET(mockContext as any);
      
      // Bei Rate-Limiting erwarten wir eine Weiterleitung zur Login-Seite mit Fehlermeldung
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/login?error=rate_limit');
      // Keine weiteren Aktionen sollten ausgeführt werden
      expect(authModule.invalidateSession).not.toHaveBeenCalled();
      
      // Überprüfe, ob das Rate-Limit-Event protokolliert wurde
      expect(logSecurityEventSpy).toHaveBeenCalledWith(
        'RATE_LIMIT_EXCEEDED', 
        expect.any(Object), 
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          targetResource: expect.stringContaining('logout')
        })
      );
    });
    
    it('sollte Security-Headers auf Antworten anwenden', async () => {
      // Session-ID im Cookie vorhanden
      mockContext.cookies.get.mockReturnValue({ value: 'test-session-id' });
      
      await GET(mockContext as any);
      
      // Prüfen, ob Security-Headers angewendet wurden
      expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    });
    
    it('sollte die Session invalidieren und das Cookie löschen', async () => {
      // Session-ID im Cookie vorhanden
      mockContext.cookies.get.mockReturnValue({ value: 'test-session-id' });
      
      // DB-Objekt korrekt mocken
      const mockDb = {
        prepare: vi.fn().mockReturnThis(),
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };
      mockContext.locals.runtime.env.DB = mockDb;
      
      // Simuliere, dass standardApiLimiter undefined zurückgibt (kein Rate-Limiting)
      standardApiLimiterSpy.mockResolvedValueOnce(undefined);
      
      // Stellen sicher, dass invalidateSession nicht mehr fehlschlägt
      authModule.invalidateSession.mockImplementation(() => Promise.resolve());
      
      await GET(mockContext as any);
      
      // Die Session sollte invalidiert werden
      expect(authModule.invalidateSession).toHaveBeenCalled();
      
      // Überprüfen, dass das Cookie gelöscht wurde
      expect(mockContext.cookies.delete).toHaveBeenCalledWith('session_id', { path: '/' });
    });
    
    it('sollte erfolgreichen Logout mit User-ID protokollieren', async () => {
      // Session-ID im Cookie vorhanden
      mockContext.cookies.get.mockReturnValue({ value: 'test-session-id' });
      
      // Authentifizierten Benutzer simulieren
      mockContext.locals.runtime.user = { id: 'user-123', name: 'Test User' };
      
      // Simulieren der DB-Abfrage, die die user_id zurückgibt
      const mockDb = {
        prepare: vi.fn().mockReturnThis(),
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ user_id: 'user-123' })
      };
      mockContext.locals.runtime.env.DB = mockDb;
      
      standardApiLimiterSpy.mockResolvedValueOnce(undefined);
      
      await GET(mockContext as any);
      
      // Überprüfen, ob erfolgreicher Logout mit dem neuen Security-Logging protokolliert wurde
      expect(logUserEventSpy).toHaveBeenCalledWith(
        'user-123',
        'logout_success',
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          sessionId: 'test-session-id'
        })
      );
    });
    
    it('sollte erfolgreichen Logout ohne User-ID protokollieren', async () => {
      // Session-ID im Cookie vorhanden
      mockContext.cookies.get.mockReturnValue({ value: 'test-session-id' });
      
      // Kein authentifizierter Benutzer
      mockContext.locals.runtime.user = undefined;
      
      // Simulieren der DB-Abfrage, die keine user_id zurückgibt
      const mockDb = {
        prepare: vi.fn().mockReturnThis(),
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null)
      };
      mockContext.locals.runtime.env.DB = mockDb;
      
      standardApiLimiterSpy.mockResolvedValueOnce(undefined);
      
      await GET(mockContext as any);
      
      // Überprüfen, ob erfolgreicher Logout ohne User-ID protokolliert wurde
      expect(logUserEventSpy).toHaveBeenCalledWith(
        'unknown',
        'logout_success',
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          sessionId: 'test-session-id'
        })
      );
    });
    
    it('sollte Logout-Fehler protokollieren', async () => {
      // Session-ID im Cookie vorhanden
      mockContext.cookies.get.mockReturnValue({ value: 'test-session-id' });
      
      // Simulieren, dass standardApiLimiter undefined zurückgibt (kein Rate-Limiting)
      standardApiLimiterSpy.mockResolvedValueOnce(undefined);
      
      // Fehler bei invalidateSession simulieren
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(authModule.invalidateSession).mockRejectedValueOnce(new Error('DB error'));
      
      await GET(mockContext as any);
      
      // Überprüfen, ob der Fehler mit dem neuen Security-Logging protokolliert wurde
      expect(logSecurityEventSpy).toHaveBeenCalledWith(
        'AUTH_FAILURE',
        expect.objectContaining({
          reason: 'logout_error',
          sessionId: 'test-session-id',
          error: expect.any(Error)
        }),
        expect.objectContaining({
          ipAddress: '192.168.1.1'
        })
      );
      
      // Aufräumen
      consoleErrorSpy.mockRestore();
    });
  });
});
