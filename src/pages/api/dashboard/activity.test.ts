import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GET } from './activity';
import * as rateLimiter from '@/lib/rate-limiter';
import * as securityHeaders from '@/lib/security-headers';
import * as securityLogger from '@/lib/security-logger';

describe('Dashboard Activity API Tests', () => {
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

  it('sollte 401 zurückgeben, wenn kein Benutzer authentifiziert ist', async () => {
    // Mock-Context ohne Benutzer
    const context = {
      locals: {
        runtime: {
          env: {}
        }
      },
      clientAddress: '192.168.1.1',
      url: new URL('https://example.com/api/dashboard/activity'),
    };
    
    // API-Aufruf
    const response = await GET(context as any);
    
    // Überprüfungen
    expect(response.status).toBe(401);
    
    // Response-Body überprüfen
    const responseText = await response.text();
    const responseData = JSON.parse(responseText);
    expect(responseData.error).toBe('Unauthorized');
    
    // Überprüfen, ob Security-Features angewendet wurden
    expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    expect(securityLogger.logAuthFailure).toHaveBeenCalledWith(
      '192.168.1.1',
      expect.objectContaining({
        reason: 'unauthenticated_access',
        endpoint: '/api/dashboard/activity'
      })
    );
  });

  it('sollte Aktivitäten zurückgeben und 200 zurückgeben', async () => {
    // Mock-Benutzerdaten
    const mockUser = {
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };
    
    // Mock für die Datenbank
    const mockResults = [
      {
        id: 'activity-1',
        action: 'created project "Test"',
        created_at: '2023-01-01T12:00:00Z',
        user: 'Test User',
        user_image: 'avatar.jpg'
      },
      {
        id: 'activity-2',
        action: 'updated profile',
        created_at: '2023-01-02T12:00:00Z',
        user: 'Test User',
        user_image: 'avatar.jpg'
      }
    ];
    
    const mockAll = vi.fn().mockResolvedValue({ results: mockResults });
    const mockBind = vi.fn().mockReturnValue({ all: mockAll });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    
    // Mock-Context mit authentifiziertem Benutzer
    const context = {
      locals: {
        runtime: {
          env: {
            DB: {
              prepare: mockPrepare
            }
          },
          user: mockUser
        }
      },
      clientAddress: '192.168.1.1',
      url: new URL('https://example.com/api/dashboard/activity'),
    };
    
    // API-Aufruf
    const response = await GET(context as any);
    
    // Überprüfungen
    expect(response.status).toBe(200);
    
    // Response-Body überprüfen
    const responseText = await response.text();
    const responseData = JSON.parse(responseText);
    expect(responseData).toHaveLength(2);
    expect(responseData[0].id).toBe('activity-1');
    expect(responseData[0].action).toBe('created project "Test"');
    expect(responseData[0].user).toBe('Test User');
    expect(responseData[0].timestamp).toBe('2023-01-01T12:00:00Z');
    expect(responseData[0].icon).toBe('✨');
    
    // Überprüfen, ob Datenbankabfrage korrekt ausgeführt wurde
    expect(mockPrepare).toHaveBeenCalled();
    expect(mockBind).toHaveBeenCalledWith(mockUser.sub);
    expect(mockAll).toHaveBeenCalled();
    
    // Überprüfen, ob Security-Features angewendet wurden
    expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    expect(securityLogger.logApiAccess).toHaveBeenCalledWith(
      mockUser.sub,
      '192.168.1.1',
      expect.objectContaining({
        endpoint: '/api/dashboard/activity',
        method: 'GET',
        action: 'activity_feed_accessed'
      })
    );
  });

  it('sollte 500 zurückgeben, wenn ein Datenbankfehler auftritt', async () => {
    // Mock-Benutzerdaten
    const mockUser = {
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };
    
    // Mock für die Datenbank mit Fehler
    const mockAll = vi.fn().mockRejectedValue(new Error('Database error'));
    const mockBind = vi.fn().mockReturnValue({ all: mockAll });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    
    // Mock-Context mit authentifiziertem Benutzer
    const context = {
      locals: {
        runtime: {
          env: {
            DB: {
              prepare: mockPrepare
            }
          },
          user: mockUser
        }
      },
      clientAddress: '192.168.1.1',
      url: new URL('https://example.com/api/dashboard/activity'),
    };
    
    // Spy auf console.error
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // API-Aufruf
    const response = await GET(context as any);
    
    // Überprüfungen
    expect(response.status).toBe(500);
    
    // Response-Body überprüfen
    const responseText = await response.text();
    const responseData = JSON.parse(responseText);
    expect(responseData.error).toBe('Internal Server Error');
    
    // Überprüfen, ob Fehler protokolliert wurde
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    // Überprüfen, ob Security-Features angewendet wurden
    expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    expect(securityLogger.logAuthFailure).toHaveBeenCalledWith(
      mockUser.sub,
      expect.objectContaining({
        reason: 'server_error',
        endpoint: '/api/dashboard/activity'
      })
    );
    
    // Spy zurücksetzen
    consoleErrorSpy.mockRestore();
  });

  // Tests für Security-Features
  describe('Security-Features', () => {
    it('sollte Rate-Limiting anwenden', async () => {
      // Mock-Benutzerdaten
      const mockUser = {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };
      
      // Mock für die Datenbank
      const mockAll = vi.fn().mockResolvedValue({ results: [] });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      
      // Mock-Context mit authentifiziertem Benutzer
      const context = {
        locals: {
          runtime: {
            env: {
              DB: {
                prepare: mockPrepare
              }
            },
            user: mockUser
          }
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/dashboard/activity'),
      };
      
      // API-Aufruf
      await GET(context as any);
      
      // Überprüfen, ob Rate-Limiting angewendet wurde
      expect(rateLimiter.apiRateLimiter).toHaveBeenCalledWith(context);
    });
    
    it('sollte abbrechen, wenn Rate-Limiting ausgelöst wird', async () => {
      // Mock-Benutzerdaten
      const mockUser = {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };
      
      // Mock-Context mit authentifiziertem Benutzer
      const context = {
        locals: {
          runtime: {
            env: {
              DB: {}
            },
            user: mockUser
          }
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/dashboard/activity'),
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
      // Mock-Benutzerdaten
      const mockUser = {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };
      
      // Mock für die Datenbank
      const mockAll = vi.fn().mockResolvedValue({ results: [] });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      
      // Mock-Context mit authentifiziertem Benutzer
      const context = {
        locals: {
          runtime: {
            env: {
              DB: {
                prepare: mockPrepare
              }
            },
            user: mockUser
          }
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/dashboard/activity'),
      };
      
      // API-Aufruf
      await GET(context as any);
      
      // Überprüfen, ob Security-Headers angewendet wurden
      expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    });
  });
});
