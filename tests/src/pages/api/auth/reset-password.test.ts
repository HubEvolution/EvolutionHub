import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/pages/api/auth/reset-password';
import * as authServiceModule from '@/lib/services/auth-service-impl';
import * as rateLimiter from '@/lib/rate-limiter';
import * as responseHelpers from '@/lib/response-helpers';
import { ServiceError, ServiceErrorType } from '@/lib/services/types';

// Mock für die Astro APIContext
const createMockContext = (formData: Record<string, any> = {}) => {
  // FormData Mock
  const entries = Object.entries(formData);
  const mockFormData = {
    entries: vi.fn().mockReturnValue(entries),
    get: vi.fn((key: string) => formData[key] || null),
  };

  // Request Mock
  const mockRequest = {
    formData: vi.fn().mockImplementation(() => {
      return Promise.resolve(mockFormData);
    }),
  };

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
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  };

  // Mock für context.url
  const mockUrl = {
    protocol: 'https:',
  };

  return {
    request: mockRequest as any,
    locals: {
      runtime: mockRuntime,
      user: null,
    },
    cookies: mockCookies,
    url: mockUrl,
    mockDb,
    mockFormData,
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

describe('Reset-Password API Tests (Service-Layer)', () => {
  // Service-Mock
  let mockAuthService: ReturnType<typeof createMockAuthService>;
  
  // Spies für Funktionen
  let standardApiLimiterSpy: any;
  let createSecureRedirectSpy: any;
  let createAuthServiceSpy: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock-Service erstellen
    mockAuthService = createMockAuthService();
    
    // Spy für Auth-Service einrichten
    createAuthServiceSpy = vi.spyOn(authServiceModule, 'createAuthService')
      .mockReturnValue(mockAuthService);
    
    // Spies für weitere Funktionen einrichten
    standardApiLimiterSpy = vi.spyOn(rateLimiter, 'standardApiLimiter').mockResolvedValue(undefined);
    createSecureRedirectSpy = vi.spyOn(responseHelpers, 'createSecureRedirect');
  });

  it('sollte bei zu vielen Anfragen Rate-Limiting anwenden', async () => {
    const context = createMockContext({
      token: 'valid-reset-token-12345',
      password: 'newPassword123',
    });

    // Rate-Limiting simulieren
    standardApiLimiterSpy.mockResolvedValue(new Response(null, {
      status: 429,
      headers: { 'Retry-After': '60' }
    }));

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/reset-password?error=TooManyRequests');
    expect(standardApiLimiterSpy).toHaveBeenCalledWith(context);
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn das Passwort zu kurz ist', async () => {
    const context = createMockContext({
      token: 'valid-reset-token-12345',
      password: '12345', // Zu kurz
    });

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/reset-password?token=valid-reset-token-12345&error=InvalidInput');
    // Prüfen, dass der Service nicht aufgerufen wurde
    expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn das Token fehlt', async () => {
    const context = createMockContext({
      password: 'newPassword123',
      // Token fehlt
    });

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    // Die aktuelle Implementierung verwendet InvalidInput für fehlende Token
    // und leitet zurück zu reset-password, nicht zu login
    expect(response.headers.get('Location')).toBe('/reset-password?error=InvalidInput');
    // Prüfen, dass der Service nicht aufgerufen wurde
    expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn die Runtime nicht verfügbar ist', async () => {
    const context = createMockContext({
      token: 'valid-reset-token-12345',
      password: 'newPassword123',
    });

    // Runtime entfernen
    context.locals.runtime = undefined;

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/reset-password?token=valid-reset-token-12345&error=ServerError');
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn der Service einen NOT_FOUND-Fehler wirft', async () => {
    const context = createMockContext({
      token: 'invalid-reset-token',
      password: 'newPassword123',
    });

    // Token nicht gefunden
    mockAuthService.resetPassword.mockRejectedValue(
      new ServiceError(
        'Das angegebene Reset-Token wurde nicht gefunden',
        ServiceErrorType.NOT_FOUND
      )
    );

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    // Der Endpunkt gibt tatsächlich InvalidInput zurück, nicht InvalidToken
    expect(response.headers.get('Location')).toBe('/reset-password?token=invalid-reset-token&error=InvalidInput');
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn der Service einen EXPIRED-Fehler wirft', async () => {
    const context = createMockContext({
      token: 'expired-reset-token',
      password: 'newPassword123',
    });

    // Token ist abgelaufen
    mockAuthService.resetPassword.mockRejectedValue(
      new ServiceError(
        'Das angegebene Reset-Token ist abgelaufen',
        ServiceErrorType.EXPIRED
      )
    );

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    // Der Endpunkt gibt tatsächlich InvalidInput zurück, nicht TokenExpired
    expect(response.headers.get('Location')).toBe('/reset-password?token=expired-reset-token&error=InvalidInput');
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn der Service einen allgemeinen Fehler wirft', async () => {
    const context = createMockContext({
      token: 'valid-reset-token-12345',
      password: 'newPassword123',
    });

    // Allgemeinen Fehler simulieren
    mockAuthService.resetPassword.mockRejectedValue(
      new ServiceError(
        'Ein unerwarteter Fehler ist aufgetreten',
        ServiceErrorType.DATABASE
      )
    );

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/reset-password?token=valid-reset-token-12345&error=ServerError');
  });

  it('sollte das Passwort erfolgreich zurücksetzen und zur Login-Seite weiterleiten', async () => {
    const context = createMockContext({
      token: 'valid-reset-token-12345',
      password: 'newPassword123',
    });

    // Erfolgreichen Reset simulieren
    mockAuthService.resetPassword.mockResolvedValue(undefined);

    const response = await POST(context as any);

    // Überprüfen der Ergebnisse
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login?success=PasswordReset');
    
    // Überprüfen, ob der AuthService korrekt aufgerufen wurde
    expect(createAuthServiceSpy).toHaveBeenCalledWith({
      db: context.locals.runtime.env.DB,
      isDevelopment: expect.any(Boolean),
    });
    
    expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
      'valid-reset-token-12345',
      'newPassword123',
      '127.0.0.1'
    );
  });
});
