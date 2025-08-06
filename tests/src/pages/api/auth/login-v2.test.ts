import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/pages/api/auth/login-v2';
import * as authServiceModule from '@/lib/services/auth-service-impl';
import * as rateLimiter from '@/lib/rate-limiter';
import * as securityHeaders from '@/lib/security-headers';
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

vi.mock('@/lib/response-helpers', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createSecureRedirect: vi.fn((url) => {
      return new Response(null, {
        status: 302,
        headers: { Location: url },
      });
    }),
  };
});

describe('Login-V2 API Tests (Service-Layer)', () => {
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
      email: 'test@example.com',
      password: 'password123',
    });

    // Rate-Limiting simulieren
    standardApiLimiterSpy.mockResolvedValue(new Response(null, {
      status: 429,
      headers: { 'Retry-After': '60' }
    }));

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login?error=TooManyRequests');
    expect(standardApiLimiterSpy).toHaveBeenCalledWith(context);
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn die Eingabedaten ungültig sind', async () => {
    const context = createMockContext({
      email: 'invalid-email', // Kein gültiges E-Mail-Format
      password: 'password123',
    });

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login?error=InvalidInput');
    // Prüfen, dass der Service nicht aufgerufen wurde
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn die Runtime nicht verfügbar ist', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: 'password123',
    });

    // Runtime entfernen
    context.locals.runtime = undefined;

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    // Die aktuelle Implementierung verwendet ServerError für Runtime-Fehler
    // TODO: Erwägen, spezifischere Fehlercodes für verschiedene Fehlertypen einzuführen
    expect(response.headers.get('Location')).toBe('/login?error=ServerError');
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn der Service einen Authentifizierungsfehler wirft', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: 'wrongpassword',
    });

    // Authentifizierungsfehler simulieren
    mockAuthService.login.mockRejectedValue(
      new ServiceError(
        'Ungültige Anmeldedaten',
        ServiceErrorType.AUTHENTICATION,
        { reason: 'invalid_credentials' }
      )
    );

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    // Die aktuelle Implementierung verwendet AuthFailed für Authentifizierungsfehler
    // TODO: Erwägen, benutzerfreundlichere Fehlercodes wie InvalidCredentials einzuführen
    expect(response.headers.get('Location')).toBe('/login?error=AuthFailed');
    expect(mockAuthService.login).toHaveBeenCalledWith(
      'test@example.com',
      'wrongpassword',
      '127.0.0.1'
    );
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn der Service einen Validierungsfehler wirft', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: 'password123',
    });

    // Validierungsfehler simulieren
    mockAuthService.login.mockRejectedValue(
      new ServiceError(
        'Ungültige Eingabedaten',
        ServiceErrorType.VALIDATION,
        { reason: 'invalid_input' }
      )
    );

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login?error=InvalidInput');
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn der Service einen allgemeinen Fehler wirft', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: 'password123',
    });

    // Allgemeinen Fehler simulieren
    mockAuthService.login.mockRejectedValue(new Error('Ein unerwarteter Fehler ist aufgetreten'));

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login?error=ServerError');
  });

  it('sollte den Benutzer erfolgreich anmelden und zum Dashboard weiterleiten', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: 'correctpassword',
    });

    // Erfolgreiche Anmeldung simulieren
    const mockAuthResult = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
      },
      session: {
        id: 'session-123',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      sessionId: 'session-123',
    };
    mockAuthService.login.mockResolvedValue(mockAuthResult);

    const response = await POST(context as any);

    // Überprüfen der Ergebnisse
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/dashboard');
    
    // Überprüfen, ob der AuthService korrekt aufgerufen wurde
    expect(createAuthServiceSpy).toHaveBeenCalledWith({
      db: context.locals.runtime.env.DB,
      isDevelopment: expect.any(Boolean),
    });
    
    expect(mockAuthService.login).toHaveBeenCalledWith(
      'test@example.com',
      'correctpassword',
      '127.0.0.1'
    );
    
    // Überprüfen, ob der Cookie gesetzt wurde
    expect(context.mockCookies.set).toHaveBeenCalledWith(
      'session_id',
      mockAuthResult.sessionId,
      expect.objectContaining({
        path: '/',
        httpOnly: true,
        maxAge: 60 * 60 * 24, // 1 Tag (Standard)
        secure: true,
        sameSite: 'lax'
      })
    );
  });

  it('sollte bei aktivierter "Remember Me"-Option einen langlebigen Cookie setzen', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: 'correctpassword',
      rememberMe: 'on', // Checkbox ist aktiv
    });

    // Erfolgreiche Anmeldung simulieren
    const mockAuthResult = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
      },
      session: {
        id: 'session-123',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      sessionId: 'session-123',
    };
    mockAuthService.login.mockResolvedValue(mockAuthResult);

    const response = await POST(context as any);

    // Überprüfen, ob ein langlebiger Cookie gesetzt wurde (30 Tage)
    expect(context.mockCookies.set).toHaveBeenCalledWith(
      'session_id',
      mockAuthResult.sessionId,
      expect.objectContaining({
        maxAge: 60 * 60 * 24 * 30, // 30 Tage
      })
    );
  });
});
