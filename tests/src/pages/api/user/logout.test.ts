import { describe, expect, it, vi, beforeEach, afterAll } from 'vitest';
import { GET, POST } from '@/pages/api/user/logout';
import * as authModule from '@/lib/auth-v2';
import * as rateLimiter from '@/lib/rate-limiter';
import * as securityHeaders from '@/lib/security-headers';
import * as securityLogger from '@/lib/security-logger';

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
  let apiRateLimiterSpy: any;
  let applySecurityHeadersSpy: any;
  let logAuthAttemptSpy: any;
  let logAuthSuccessSpy: any;
  let logAuthFailureSpy: any;

  beforeEach(() => {
    vi.resetAllMocks();
    
    // Spies für die Sicherheitsfunktionen
    apiRateLimiterSpy = vi.spyOn(rateLimiter, 'apiRateLimiter');
    applySecurityHeadersSpy = vi.spyOn(securityHeaders, 'applySecurityHeaders');
    logAuthAttemptSpy = vi.spyOn(securityLogger, 'logAuthAttempt');
    logAuthSuccessSpy = vi.spyOn(securityLogger, 'logAuthSuccess');
    logAuthFailureSpy = vi.spyOn(securityLogger, 'logAuthFailure');
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('logout API', () => {
    it('sollte die Session invalidieren, wenn eine Session-ID vorhanden ist', async () => {
      // Session-ID im Cookie vorhanden
      mockContext.cookies.get.mockReturnValue({ value: 'test-session-id' });
      
      // Response Objekt als Ergebnis
      const response = await GET(mockContext as any);
      
      // Überprüfungen
      expect(authModule.invalidateSession).toHaveBeenCalledWith('mock-db-object', 'test-session-id');
      expect(mockContext.cookies.delete).toHaveBeenCalledWith('session_id', { path: '/' });
      
      // Response sollte den richtigen Status und Header haben
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/');
    });

    it('sollte keine Session invalidieren, wenn keine Session-ID vorhanden ist', async () => {
      // Keine Session-ID im Cookie
      mockContext.cookies.get.mockReturnValue(undefined);
      
      // Response Objekt als Ergebnis
      const response = await GET(mockContext as any);
      
      // Überprüfungen
      expect(authModule.invalidateSession).not.toHaveBeenCalled();
      expect(mockContext.cookies.delete).not.toHaveBeenCalled();
      
      // Response sollte den richtigen Status und Header haben
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/');
    });

    it('sollte zur Startseite weiterleiten, auch wenn ein Fehler auftritt', async () => {
      // Session-ID im Cookie vorhanden
      mockContext.cookies.get.mockReturnValue({ value: 'test-session-id' });
      
      // Fehler bei invalidateSession simulieren und in try/catch abfangen
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(authModule.invalidateSession).mockRejectedValueOnce(new Error('DB error'));
      
      // Response sollte dennoch erfolgreich sein und weiterleiten
      const response = await GET(mockContext as any);
      
      // Überprüfen, dass der Fehler nicht weitergegeben wurde
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/');
      
      // Überprüfen, dass der Fehler geloggt wurde (optional)
      // expect(consoleErrorSpy).toHaveBeenCalled();
      
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
      
      expect(rateLimiter.apiRateLimiter).toHaveBeenCalledWith(mockContext);
    });
    
    it('sollte abbrechen, wenn Rate-Limiting ausgelöst wird', async () => {
      // Session-ID im Cookie vorhanden
      mockContext.cookies.get.mockReturnValue({ value: 'test-session-id' });
      
      // Rate-Limiting-Antwort simulieren
      const rateLimitResponse = new Response(null, { 
        status: 429, 
        statusText: 'Too Many Requests'
      });
      apiRateLimiterSpy.mockResolvedValueOnce(rateLimitResponse);
      
      const response = await GET(mockContext as any);
      
      expect(response.status).toBe(429);
      // Keine weiteren Aktionen sollten ausgeführt werden
      expect(authModule.invalidateSession).not.toHaveBeenCalled();
    });
    
    it('sollte Security-Headers auf Antworten anwenden', async () => {
      // Session-ID im Cookie vorhanden
      mockContext.cookies.get.mockReturnValue({ value: 'test-session-id' });
      
      await GET(mockContext as any);
      
      // Prüfen, ob Security-Headers angewendet wurden
      expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    });
    
    it('sollte Logout-Versuch protokollieren', async () => {
      // Session-ID im Cookie vorhanden
      mockContext.cookies.get.mockReturnValue({ value: 'test-session-id' });
      
      await GET(mockContext as any);
      
      // Überprüfen, ob der Logout-Versuch protokolliert wurde
      expect(securityLogger.logAuthAttempt).toHaveBeenCalledWith(
        mockContext.clientAddress,
        expect.objectContaining({
          action: 'logout',
          session_id: 'test-session-id'
        })
      );
    });
    
    it('sollte erfolgreichen Logout mit User-ID protokollieren', async () => {
      // Session-ID im Cookie vorhanden
      mockContext.cookies.get.mockReturnValue({ value: 'test-session-id' });
      
      // Authentifizierten Benutzer simulieren
      mockContext.locals.runtime.user = { id: 'user-123', name: 'Test User' };
      
      await GET(mockContext as any);
      
      // Überprüfen, ob erfolgreicher Logout protokolliert wurde
      expect(securityLogger.logAuthSuccess).toHaveBeenCalledWith(
        'user-123',
        mockContext.clientAddress,
        expect.objectContaining({
          action: 'logout_success'
        })
      );
    });
    
    it('sollte erfolgreichen Logout ohne User-ID protokollieren', async () => {
      // Session-ID im Cookie vorhanden
      mockContext.cookies.get.mockReturnValue({ value: 'test-session-id' });
      
      // Kein authentifizierter Benutzer
      mockContext.locals.runtime.user = undefined;
      
      await GET(mockContext as any);
      
      // Überprüfen, ob erfolgreicher Logout ohne User-ID protokolliert wurde
      expect(securityLogger.logAuthSuccess).toHaveBeenCalledWith(
        'anonymous',
        mockContext.clientAddress,
        expect.objectContaining({
          action: 'logout_success',
          session_id: 'test-session-id'
        })
      );
    });
    
    it('sollte Logout-Fehler protokollieren', async () => {
      // Session-ID im Cookie vorhanden
      mockContext.cookies.get.mockReturnValue({ value: 'test-session-id' });
      
      // Fehler bei invalidateSession simulieren
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(authModule.invalidateSession).mockRejectedValueOnce(new Error('DB error'));
      
      await GET(mockContext as any);
      
      // Überprüfen, ob der Fehler protokolliert wurde
      expect(securityLogger.logAuthFailure).toHaveBeenCalledWith(
        mockContext.clientAddress,
        expect.objectContaining({
          reason: 'db_error',
          session_id: 'test-session-id',
          error_message: expect.stringContaining('DB error')
        })
      );
      
      // Aufräumen
      consoleErrorSpy.mockRestore();
    });
  });
});
