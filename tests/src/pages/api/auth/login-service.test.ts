import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/pages/api/auth/login';
import * as rateLimiter from '@/lib/rate-limiter';
import * as authServiceModule from '@/lib/services/auth-service-impl';
import { ServiceError } from '@/lib/services/types';

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

describe('Login API Tests (Service-Layer)', () => {
  // Service-Mock
  let mockAuthService: ReturnType<typeof createMockAuthService>;

  // Spies für Funktionen
  let standardApiLimiterSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock-Service erstellen
    mockAuthService = createMockAuthService();

    // createAuthService so mocken, dass er unseren Mock-Service zurückgibt
    vi.spyOn(authServiceModule, 'createAuthService').mockReturnValue(mockAuthService as any);

    // Spies für weitere Funktionen einrichten
    standardApiLimiterSpy = vi
      .spyOn(rateLimiter, 'standardApiLimiter')
      .mockResolvedValue(undefined as any);
  });

  it('sollte bei zu vielen Anfragen Rate-Limiting anwenden', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: 'password123',
    });

    // Rate-Limiting simulieren
    standardApiLimiterSpy.mockResolvedValue(
      new Response(null, {
        status: 429,
        headers: { 'Retry-After': '60' },
      }) as any
    );

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/en/login?error=TooManyRequests');
    expect(standardApiLimiterSpy).toHaveBeenCalledWith(context as any);
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn die Eingabedaten ungültig sind (E-Mail)', async () => {
    const context = createMockContext({
      email: 'invalid-email',
      password: 'password123',
    });

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/en/login?error=InvalidInput');
    // Service sollte nicht aufgerufen werden
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn das Passwort zu kurz ist', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: '12345', // zu kurz
    });

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/en/login?error=InvalidInput');
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn die Runtime nicht verfügbar ist', async () => {
    const context: any = createMockContext({
      email: 'test@example.com',
      password: 'password123',
    });

    // Runtime entfernen
    context.locals.runtime = undefined;

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/en/login?error=ServerError');
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn die Authentifizierung fehlschlägt', async () => {
    const context = createMockContext({
      email: 'user@example.com',
      password: 'wrongpassword',
    });

    mockAuthService.login.mockRejectedValue(ServiceError.authentication('Auth failed'));

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/en/login?error=InvalidCredentials');
  });

  it('sollte bei unverifizierter E-Mail zur Verifizierungsseite umleiten', async () => {
    const context = createMockContext({
      email: 'user@example.com',
      password: 'password123',
    });

    mockAuthService.login.mockRejectedValue(
      ServiceError.authentication('Email not verified', {
        reason: 'email_not_verified',
        email: 'user@example.com',
      })
    );

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    const location = response.headers.get('Location') || '';
    // Query-Parameter unabhängig von der Reihenfolge prüfen
    expect(location.startsWith('/en/verify-email?')).toBe(true);
    // Beide Parameter müssen vorhanden sein, Reihenfolge egal
    expect(location.includes('error=EmailNotVerified')).toBe(true);
    expect(location.includes('email=user%40example.com')).toBe(true);
  });

  it('sollte den Benutzer erfolgreich anmelden (ohne RememberMe) und Cookie korrekt setzen', async () => {
    const context: any = createMockContext({
      email: 'user@example.com',
      password: 'correctpassword',
    });

    mockAuthService.login.mockResolvedValue({ sessionId: 'session-123' });

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/en/dashboard');

    // Cookie gesetzt mit 1 Tag maxAge
    expect(context.cookies.set).toHaveBeenCalledWith(
      'session_id',
      'session-123',
      expect.objectContaining({
        path: '/',
        httpOnly: true,
        maxAge: 60 * 60 * 24,
        secure: true,
        sameSite: 'lax',
      })
    );

    // Service mit Client-IP aufgerufen
    expect(mockAuthService.login).toHaveBeenCalledWith(
      'user@example.com',
      'correctpassword',
      '127.0.0.1'
    );
  });

  it('sollte den Benutzer erfolgreich anmelden (mit RememberMe) und Cookie maxAge auf 30 Tage setzen', async () => {
    const context: any = createMockContext({
      email: 'user@example.com',
      password: 'correctpassword',
      rememberMe: 'on',
    });

    mockAuthService.login.mockResolvedValue({ sessionId: 'session-xyz' });

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/en/dashboard');

    // Cookie gesetzt mit 30 Tagen maxAge
    expect(context.cookies.set).toHaveBeenCalledWith(
      'session_id',
      'session-xyz',
      expect.objectContaining({
        maxAge: 60 * 60 * 24 * 30,
      })
    );
  });

  it('sollte einen allgemeinen Fehler als ServerError behandeln', async () => {
    const context = createMockContext({
      email: 'user@example.com',
      password: 'correctpassword',
    });

    mockAuthService.login.mockRejectedValue(new Error('boom'));

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/en/login?error=ServerError');
  });
});
