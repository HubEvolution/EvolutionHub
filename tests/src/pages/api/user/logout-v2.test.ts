import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/pages/api/user/logout-v2';
import * as authServiceModule from '@/lib/services/auth-service-impl';
import * as rateLimiter from '@/lib/rate-limiter';
import * as responseHelpers from '@/lib/response-helpers';
import * as securityLogger from '@/lib/security-logger';
import { ServiceError, ServiceErrorType } from '@/lib/services/types';

// Mock für die Astro APIContext
const createMockContext = (sessionId: string | null = null) => {
  // Mock für die D1 Datenbank
  const mockDb = {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    run: vi.fn(),
    execute: vi.fn(),
  };

  // Locals und Runtime Mocks
  const mockRuntime = {
    env: {
      DB: mockDb,
    },
  };

  // Cookies Mock
  const mockCookies = {
    get: vi.fn().mockReturnValue(
      sessionId ? { value: sessionId } : undefined
    ),
    set: vi.fn(),
    delete: vi.fn(),
  };

  // Mock für context.url
  const mockUrl = {
    protocol: 'https:',
  };

  return {
    locals: {
      runtime: mockRuntime,
      user: null,
    },
    cookies: mockCookies,
    url: mockUrl,
    mockDb,
    mockCookies,
    clientAddress: '127.0.0.1',
    redirect: vi.fn((url: string, status: number) => {
      return new Response(null, {
        status,
        headers: { Location: url },
      });
    }),
  };
};

// Mock für AuthService
const createMockAuthService = () => {
  return {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    validateSession: vi.fn(),
    createPasswordResetToken: vi.fn(),
    validatePasswordResetToken: vi.fn(),
    resetPassword: vi.fn(),
  };
};

// Mocks für Module
vi.mock('@/lib/services/auth-service-impl', () => ({
  createAuthService: vi.fn(),
}));

// Mocks für Security-Module
vi.mock('@/lib/rate-limiter', () => ({
  authLimiter: vi.fn().mockResolvedValue(null),
  standardApiLimiter: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/response-helpers', () => ({
  createSecureRedirect: vi.fn((url) => {
    return new Response(null, {
      status: 302,
      headers: { Location: url },
    });
  }),
  applySecurityHeaders: vi.fn((response) => {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Content-Security-Policy', "default-src 'self'");
    return response;
  }),
}));

vi.mock('@/lib/security-logger', () => ({
  logSecurityEvent: vi.fn(),
  logUserEvent: vi.fn(),
  logAuthSuccess: vi.fn(),
  logAuthFailure: vi.fn(),
}));

describe('Logout-V2 API Tests (Service-Layer)', () => {
  // Service-Mock
  let mockAuthService: ReturnType<typeof createMockAuthService>;
  
  // Spies für Funktionen
  let standardApiLimiterSpy: any;
  let createSecureRedirectSpy: any;
  let createAuthServiceSpy: any;
  let logSecurityEventSpy: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock-Service erstellen
    mockAuthService = createMockAuthService();
    
    // Spy für Auth-Service einrichten
    createAuthServiceSpy = vi.spyOn(authServiceModule, 'createAuthService')
      .mockReturnValue(mockAuthService);
    
    // Spies für weitere Funktionen einrichten
    standardApiLimiterSpy = vi.spyOn(rateLimiter, 'standardApiLimiter')
      .mockResolvedValue(undefined);
    createSecureRedirectSpy = vi.spyOn(responseHelpers, 'createSecureRedirect');
    logSecurityEventSpy = vi.spyOn(securityLogger, 'logSecurityEvent');
  });

  it('sollte bei zu vielen Anfragen Rate-Limiting anwenden (POST)', async () => {
    const context = createMockContext('test-session-id');

    // Rate-Limiting simulieren
    standardApiLimiterSpy.mockResolvedValue(new Response(null, {
      status: 429,
      headers: { 'Retry-After': '60' }
    }));

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login?error=TooManyRequests');
    expect(standardApiLimiterSpy).toHaveBeenCalledWith(context);
    expect(logSecurityEventSpy).toHaveBeenCalledWith(
      'RATE_LIMIT_EXCEEDED',
      expect.objectContaining({
        reason: 'rate_limit',
        path: '/api/user/logout'
      }),
      expect.objectContaining({
        ipAddress: '127.0.0.1',
        targetResource: '/api/user/logout'
      })
    );
  });
  
  it('sollte bei zu vielen Anfragen Rate-Limiting anwenden (GET)', async () => {
    const context = createMockContext('test-session-id');

    // Rate-Limiting simulieren
    standardApiLimiterSpy.mockResolvedValue(new Response(null, {
      status: 429,
      headers: { 'Retry-After': '60' }
    }));

    const response = await GET(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login?error=TooManyRequests');
    expect(standardApiLimiterSpy).toHaveBeenCalledWith(context);
  });

  it('sollte den Benutzer erfolgreich abmelden und das Cookie löschen (POST)', async () => {
    const sessionId = 'test-session-id';
    const context = createMockContext(sessionId);

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/');
    expect(mockAuthService.logout).toHaveBeenCalledWith({
      sessionId,
      clientIp: '127.0.0.1'
    });
    expect(context.mockCookies.delete).toHaveBeenCalledWith('session_id', { path: '/' });
  });
  
  it('sollte den Benutzer erfolgreich abmelden und das Cookie löschen (GET)', async () => {
    const sessionId = 'test-session-id';
    const context = createMockContext(sessionId);

    const response = await GET(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/');
    expect(mockAuthService.logout).toHaveBeenCalledWith({
      sessionId,
      clientIp: '127.0.0.1'
    });
    expect(context.mockCookies.delete).toHaveBeenCalledWith('session_id', { path: '/' });
  });

  it('sollte auch ohne aktive Session erfolgreich abmelden', async () => {
    const context = createMockContext(null); // Kein Session-Cookie

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/');
    expect(mockAuthService.logout).toHaveBeenCalledWith({
      sessionId: null,
      clientIp: '127.0.0.1'
    });
    // Cookie sollte nicht gelöscht werden, da keins existiert
    expect(context.mockCookies.delete).not.toHaveBeenCalled();
  });

  it('sollte bei fehlendem Runtime-Kontext trotzdem Cookie löschen und weiterleiten', async () => {
    const sessionId = 'test-session-id';
    const context = createMockContext(sessionId);
    
    // Runtime entfernen
    context.locals.runtime = undefined;

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/');
    expect(context.mockCookies.delete).toHaveBeenCalledWith('session_id', { path: '/' });
    expect(logSecurityEventSpy).toHaveBeenCalledWith(
      'AUTH_FAILURE',
      expect.objectContaining({
        reason: 'missing_runtime',
        path: '/api/user/logout'
      }),
      expect.objectContaining({
        ipAddress: '127.0.0.1'
      })
    );
  });

  it('sollte bei Service-Fehler trotzdem Cookie löschen und weiterleiten', async () => {
    const sessionId = 'test-session-id';
    const context = createMockContext(sessionId);
    
    // Service wirft Fehler
    mockAuthService.logout.mockRejectedValue(
      new ServiceError('Sitzung konnte nicht beendet werden', ServiceErrorType.DATABASE)
    );

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/');
    expect(context.mockCookies.delete).toHaveBeenCalledWith('session_id', { path: '/' });
  });

  it('sollte bei allgemeinem Fehler trotzdem Cookie löschen und weiterleiten', async () => {
    const sessionId = 'test-session-id';
    const context = createMockContext(sessionId);
    
    // createAuthService wirft Fehler
    createAuthServiceSpy.mockImplementation(() => {
      throw new Error('Unerwarteter Fehler bei der Auth-Service-Erstellung');
    });

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/');
    expect(context.mockCookies.delete).toHaveBeenCalledWith('session_id', { path: '/' });
    expect(logSecurityEventSpy).toHaveBeenCalledWith(
      'AUTH_FAILURE',
      expect.objectContaining({
        reason: 'logout_error',
        sessionId: sessionId,
        path: '/api/user/logout-v2'
      }),
      expect.objectContaining({
        ipAddress: '127.0.0.1'
      })
    );
  });
});
