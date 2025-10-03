import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/pages/api/dashboard/activity';
import * as rateLimiter from '@/lib/rate-limiter';
import * as securityHeaders from '@/lib/security-headers';
import * as securityLogger from '@/lib/security-logger';
import { mockRateLimitOnce } from '../../../helpers/rateLimiter';

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
      logApiError: vi.fn(),
      logUserEvent: vi.fn(),
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
          env: {},
        },
      },
      clientAddress: '192.168.1.1',
      url: new URL('https://example.com/api/dashboard/activity'),
      request: {
        url: 'https://example.com/api/dashboard/activity',
        method: 'GET',
      },
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
        endpoint: '/api/dashboard/activity',
      })
    );
  });

  it('sollte Aktivitäten zurückgeben und 200 zurückgeben', async () => {
    // Mock-Benutzerdaten
    const mockUser = {
      id: 'user-123',
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
        user_image: 'avatar.jpg',
      },
      {
        id: 'activity-2',
        action: 'updated profile',
        created_at: '2023-01-02T12:00:00Z',
        user: 'Test User',
        user_image: 'avatar.jpg',
      },
    ];

    const mockAll = vi.fn().mockResolvedValue({ results: mockResults });
    const mockBind = vi.fn().mockReturnValue({ all: mockAll });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });

    // Mock-Context mit authentifiziertem Benutzer
    const context = {
      locals: {
        user: mockUser,
        runtime: {
          env: {
            DB: {
              prepare: mockPrepare,
            },
          },
        },
      },
      clientAddress: '192.168.1.1',
      url: new URL('https://example.com/api/dashboard/activity'),
      request: {
        url: 'https://example.com/api/dashboard/activity',
        method: 'GET',
      },
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
    expect(mockBind).toHaveBeenCalledWith(mockUser.id);
    expect(mockAll).toHaveBeenCalled();

    // Überprüfen, ob Security-Features angewendet wurden
    expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    expect(securityLogger.logApiAccess).toHaveBeenCalledWith(
      mockUser.id,
      '192.168.1.1',
      expect.objectContaining({
        endpoint: '/api/dashboard/activity',
        method: 'GET',
        action: 'activity_feed_accessed',
      })
    );
  });

  it('sollte 500 zurückgeben, wenn ein Datenbankfehler auftritt', async () => {
    // Mock-Benutzerdaten
    const mockUser = {
      id: 'user-123',
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
        user: mockUser,
        runtime: {
          env: {
            DB: {
              prepare: mockPrepare,
            },
          },
        },
      },
      clientAddress: '192.168.1.1',
      url: new URL('https://example.com/api/dashboard/activity'),
      request: {
        url: 'https://example.com/api/dashboard/activity',
        method: 'GET',
      },
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
    expect(responseData.success).toBe(false);
    expect(responseData.error.type).toBe('server_error');
    expect(responseData.error.message).toBe('Error fetching activity feed');

    // Überprüfen, ob Fehler protokolliert wurde
    expect(consoleErrorSpy).toHaveBeenCalled();

    // Überprüfen, ob Security-Features angewendet wurden
    expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    expect(securityLogger.logUserEvent).toHaveBeenCalledWith(
      mockUser.id,
      'activity_feed_error',
      expect.objectContaining({
        error: 'Database error',
        ipAddress: '192.168.1.1',
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
        id: 'user-123',
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
          user: mockUser,
          runtime: {
            env: {
              DB: {
                prepare: mockPrepare,
              },
            },
          },
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/dashboard/activity'),
        request: {
          url: 'https://example.com/api/dashboard/activity',
          method: 'GET',
        },
      };

      // API-Aufruf
      await GET(context as any);

      // Überprüfen, ob Rate-Limiting angewendet wurde
      expect(rateLimiter.apiRateLimiter).toHaveBeenCalledWith(context);
    });

    it('sollte abbrechen, wenn Rate-Limiting ausgelöst wird', async () => {
      // Mock-Benutzerdaten
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      // Mock-Context mit authentifiziertem Benutzer
      const context = {
        locals: {
          user: mockUser,
          runtime: {
            env: {
              DB: {},
            },
          },
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/dashboard/activity'),
        request: {
          url: 'https://example.com/api/dashboard/activity',
          method: 'GET',
        },
      };

      // Rate-Limiting-Antwort simulieren (einmalig)
      mockRateLimitOnce();

      // API-Aufruf
      const response = await GET(context as any);

      // Überprüfen, ob die Rate-Limit-Antwort zurückgegeben wurde
      expect(response.status).toBe(429);
    });

    it('sollte Security-Headers auf Antworten anwenden', async () => {
      // Mock-Benutzerdaten
      const mockUser = {
        id: 'user-123',
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
          user: mockUser,
          runtime: {
            env: {
              DB: {
                prepare: mockPrepare,
              },
            },
          },
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/dashboard/activity'),
        request: {
          url: 'https://example.com/api/dashboard/activity',
          method: 'GET',
        },
      };

      // API-Aufruf
      await GET(context as any);

      // Überprüfen, ob Security-Headers angewendet wurden
      expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    });
  });
});
