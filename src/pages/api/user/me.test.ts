import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GET } from './me';
import * as rateLimiter from '@/lib/rate-limiter';
import * as securityHeaders from '@/lib/security-headers';
import * as securityLogger from '@/lib/security-logger';

describe('User Me API Tests', () => {
  it('sollte 401 zurückgeben, wenn kein Benutzer authentifiziert ist', async () => {
    // Mock-Context ohne Benutzer
    const context = {
      locals: {},
      clientAddress: '192.168.1.1',
      url: new URL('https://example.com/api/user/me'),
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
        user: mockUser
      },
      clientAddress: '192.168.1.1',
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
    expect(responseData.id).toBe(mockUser.id);
    expect(responseData.email).toBe(mockUser.email);
    expect(responseData.name).toBe(mockUser.name);
    expect(responseData.username).toBe(mockUser.username);
    expect(responseData.created_at).toBe(mockUser.created_at);
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
        user: mockUser
      },
      clientAddress: '192.168.1.1',
      url: new URL('https://example.com/api/user/me'),
    };
    
    // API-Aufruf (jetzt async)
    const response = await GET(context as any);
    
    // Überprüfungen
    const responseText = await response.text();
    const responseData = JSON.parse(responseText);
    
    // Erlaubte Felder sollten vorhanden sein
    expect(responseData.id).toBe('user-123');
    expect(responseData.email).toBe('test@example.com');
    expect(responseData.name).toBe('Test User');
    expect(responseData.username).toBe('testuser');
    expect(responseData.created_at).toBe('2023-01-01T12:00:00Z');
    
    // Sensible Daten sollten NICHT in der Response enthalten sein
    expect(responseData.password_hash).toBeUndefined();
    expect(responseData.sessions).toBeUndefined();
    expect(responseData.some_internal_data).toBeUndefined();
    expect(responseData.role).toBeUndefined();
  });
  
  // Tests für Security-Features
  describe('Security-Features', () => {
    // Mock für die Security-Module
    beforeEach(() => {
      vi.mock('@/lib/rate-limiter', () => ({
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
        logApiAccess: vi.fn(),
        logAuthFailure: vi.fn(),
      }));
    });
    
    afterEach(() => {
      vi.resetAllMocks();
    });
    
    it('sollte Rate-Limiting anwenden', async () => {
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
            env: {}
          }
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/user/me'),
      };
      
      // API-Aufruf
      await GET(context as any);
      
      // Überprüfen, ob Rate-Limiting angewendet wurde
      expect(rateLimiter.apiRateLimiter).toHaveBeenCalledWith(context);
    });
    
    it('sollte abbrechen, wenn Rate-Limiting ausgelöst wird', async () => {
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
            env: {}
          }
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/user/me'),
      };
      
      // Rate-Limiting-Antwort simulieren
      const rateLimitResponse = new Response(null, { 
        status: 429, 
        statusText: 'Too Many Requests'
      });
      vi.spyOn(rateLimiter, 'apiRateLimiter').mockResolvedValueOnce(rateLimitResponse);
      
      // API-Aufruf
      const response = await GET(context as any);
      
      // Überprüfen, ob die Rate-Limit-Antwort zurückgegeben wurde
      expect(response.status).toBe(429);
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
            env: {}
          }
        },
        clientAddress: '192.168.1.1',
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
            env: {}
          }
        },
        clientAddress: '192.168.1.1',
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
          method: 'GET'
        })
      );
    });
    
    it('sollte nicht authentifizierte Zugriffe protokollieren', async () => {
      // Mock-Context ohne Benutzer
      const context = {
        locals: {},
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/user/me'),
      };
      
      // API-Aufruf
      await GET(context as any);
      
      // Überprüfen, ob der nicht authentifizierte Zugriff protokolliert wurde
      expect(securityLogger.logAuthFailure).toHaveBeenCalledWith(
        context.clientAddress,
        expect.objectContaining({
          reason: 'unauthenticated_access',
          endpoint: '/api/user/me'
        })
      );
    });
  });
});
