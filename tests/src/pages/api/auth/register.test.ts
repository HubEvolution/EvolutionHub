import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/pages/api/auth/register';
import * as authServiceModule from '@/lib/services/auth-service-impl';
import { ServiceError, ServiceErrorType } from '@/lib/services/types';
import { mockRateLimitOnce } from '../../../helpers/rateLimiter';

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
    changePassword: vi.fn(),
    withTransaction: vi.fn(async (cb: any) => cb({} as any)),
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

describe('Register-V2 API Tests (Service-Layer)', () => {
  // Service-Mock
  let mockAuthService: ReturnType<typeof createMockAuthService>;
  
  // Spies für Funktionen
  let createAuthServiceSpy: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock-Service erstellen
    mockAuthService = createMockAuthService();
    
    // Spy für Auth-Service einrichten
    createAuthServiceSpy = vi.spyOn(authServiceModule, 'createAuthService')
      .mockReturnValue(mockAuthService);
    
    // Hinweis: Weitere Spies auf modulare Helfer entfallen hier, da Modul-Mocking vor dem Import
    // des SUT zu Timing-Problemen führen kann. Die funktionale Wirkung (Redirect/Status) wird
    // in den Tests direkt geprüft.
  });

  it('sollte bei zu vielen Anfragen Rate-Limiting anwenden', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      username: 'testuser',
    });

    // Rate-Limiting simulieren
    mockRateLimitOnce(429, 'Too Many Requests', 'standardApiLimiter');

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/en/register?error=TooManyRequests');
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn die Eingabedaten ungültig sind', async () => {
    const context = createMockContext({
      email: 'invalid-email', // Kein gültiges E-Mail-Format
      password: 'password123',
      name: 'Test User',
      username: 'testuser',
    });

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/en/register?error=InvalidInput');
    // Prüfen, dass der Service nicht aufgerufen wurde
    expect(mockAuthService.register).not.toHaveBeenCalled();
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn das Passwort zu kurz ist', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: '12345', // Zu kurz
      name: 'Test User',
      username: 'testuser',
    });

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/en/register?error=InvalidInput');
    // Prüfen, dass der Service nicht aufgerufen wurde
    expect(mockAuthService.register).not.toHaveBeenCalled();
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn die Runtime nicht verfügbar ist', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      username: 'testuser',
    });

    // Runtime entfernen
    (context.locals as any).runtime = undefined;

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    // Die aktuelle Implementierung verwendet ServerError für Runtime-Fehler
    // TODO: Erwägen, spezifischere Fehlercodes für verschiedene Fehlertypen einzuführen
    expect(response.headers.get('Location')).toBe('/en/register?error=ServerError');
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn der Service einen Konflikt-Fehler wegen existierendem Benutzer wirft', async () => {
    const context = createMockContext({
      email: 'existing@example.com',
      password: 'password123',
      name: 'Test User',
      username: 'testuser',
    });

    // Benutzer existiert bereits
    mockAuthService.register.mockRejectedValue(
      new ServiceError(
        'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits',
        ServiceErrorType.CONFLICT,
        { reason: 'user_exists' }
      )
    );

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/en/register?error=UserExists');
    expect(mockAuthService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
        username: 'testuser',
      }),
      '127.0.0.1'
    );
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn der Service einen Konflikt-Fehler wegen existierendem Benutzernamen wirft', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      username: 'existinguser',
    });

    // Benutzername existiert bereits
    mockAuthService.register.mockRejectedValue(
      new ServiceError(
        'Dieser Benutzername ist bereits vergeben',
        ServiceErrorType.CONFLICT,
        { reason: 'username_exists' }
      )
    );

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/en/register?error=UsernameExists');
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn der Service einen allgemeinen Fehler wirft', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      username: 'testuser',
    });

    // Allgemeinen Fehler simulieren
    mockAuthService.register.mockRejectedValue(new Error('Ein unerwarteter Fehler ist aufgetreten'));

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/en/register?error=ServerError');
  });

  it('sollte den Benutzer erfolgreich registrieren und zum Dashboard weiterleiten', async () => {
    const context = createMockContext({
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
      username: 'newuser',
    });

    // Erfolgreiche Registrierung simulieren
    const mockAuthResult = {
      user: {
        id: 'user-123',
        email: 'newuser@example.com',
        name: 'New User',
        username: 'newuser',
      },
      session: {
        id: 'session-123',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      sessionId: 'session-123',
    };
    mockAuthService.register.mockResolvedValue(mockAuthResult);

    const response = await POST(context as any);

    // Überprüfen der Ergebnisse
    expect(response.status).toBe(302);
    // Double-Opt-In: Redirect auf verify-email (locale-neutraler Pfad, aber Query mit email und locale)
    expect(response.headers.get('Location')).toBe('/verify-email?email=newuser%40example.com&locale=en');
    
    // Überprüfen, ob der AuthService korrekt aufgerufen wurde
    expect(createAuthServiceSpy).toHaveBeenCalledWith({
      db: context.locals.runtime.env.DB,
      isDevelopment: expect.any(Boolean),
    });
    
    expect(mockAuthService.register).toHaveBeenCalledWith(
      {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        username: 'newuser',
      },
      '127.0.0.1'
    );
    
    // Registrierung setzt KEINE Session/Cookies (Double-Opt-In)
    expect(context.mockCookies.set).not.toHaveBeenCalled();
  });
});
