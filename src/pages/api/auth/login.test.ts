import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './login';
import * as authModule from '@/lib/auth-v2';
import * as bcrypt from 'bcrypt-ts';
import * as rateLimiter from '@/lib/rate-limiter';
import * as securityHeaders from '@/lib/security-headers';
import * as securityLogger from '@/lib/security-logger';

// Mock für die Astro APIContext
const createMockContext = (formData: Record<string, any> = {}) => {
  // FormData Mock
  const mockFormData = {
    get: vi.fn((key: string) => formData[key] || null),
  };

  // Request Mock
  const mockRequest = {
    formData: vi.fn().mockResolvedValue(mockFormData),
  };

  // Mock für die D1 Datenbank
  const mockDb = {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
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
    clientAddress: '',  // Wird für Security-Tests benötigt
    redirect: vi.fn((url: string, status: number) => {
      return new Response(null, {
        status,
        headers: { Location: url },
      });
    }),
  };
};

// Mocks für Module
vi.mock('@/lib/auth-v2', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    createSession: vi.fn(),
  };
});

vi.mock('bcrypt-ts', async () => {
  return {
    compare: vi.fn(),
  };
});

// Mocks für Security-Module
vi.mock('@/lib/rate-limiter', () => ({
  authLimiter: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/security-headers', () => ({
  secureJsonResponse: vi.fn((obj) => new Response(JSON.stringify(obj))),
  applySecurityHeaders: vi.fn((response) => {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Content-Security-Policy', "default-src 'self'");
    return response;
  }),
}));

vi.mock('@/lib/security-logger', () => ({
  logAuthSuccess: vi.fn(),
  logAuthFailure: vi.fn(),
}));

describe('Login API Tests', () => {
  // Spy für die Sicherheitsfunktionen
  let authLimiterSpy: any;
  let applySecurityHeadersSpy: any;
  let logAuthSuccessSpy: any;
  let logAuthFailureSpy: any;
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Spies für die Sicherheitsfunktionen
    authLimiterSpy = vi.spyOn(rateLimiter, 'authLimiter');
    applySecurityHeadersSpy = vi.spyOn(securityHeaders, 'applySecurityHeaders');
    logAuthSuccessSpy = vi.spyOn(securityLogger, 'logAuthSuccess');
    logAuthFailureSpy = vi.spyOn(securityLogger, 'logAuthFailure');
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn die E-Mail ungültig ist', async () => {
    const context = createMockContext({
      email: 'ab', // zu kurz
      password: 'password123',
    });

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login?error=InvalidInput');
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn das Passwort zu kurz ist', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: '12345', // zu kurz
    });

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login?error=InvalidInput');
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn die Runtime-Umgebung fehlt', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: 'password123',
    });
    
    // Runtime entfernen
    context.locals.runtime = undefined;

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login?error=MissingRuntime');
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn der Benutzer nicht existiert', async () => {
    const context = createMockContext({
      email: 'nonexistent@example.com',
      password: 'password123',
    });

    // Benutzer existiert nicht
    context.mockDb.first.mockResolvedValue(null);

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login?error=InvalidCredentials');
    expect(context.mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM users WHERE email = ?');
    expect(context.mockDb.bind).toHaveBeenCalledWith('nonexistent@example.com');
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn der Benutzer kein Passwort-Hash hat', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: 'password123',
    });

    // Benutzer ohne Passwort-Hash
    context.mockDb.first.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      username: 'testuser',
      password_hash: null,
    });

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login?error=InvalidCredentials');
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn das Passwort falsch ist', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: 'wrongpassword',
    });

    // Benutzer existiert
    context.mockDb.first.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      username: 'testuser',
      password_hash: 'hashed_password',
    });

    // Passwort ist falsch
    vi.mocked(bcrypt.compare).mockResolvedValue(false);

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login?error=InvalidCredentials');
    expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashed_password');
  });

  it('sollte den Benutzer erfolgreich anmelden und zum Dashboard weiterleiten', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: 'correctpassword',
    });

    // Mock-Benutzer
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      username: 'testuser',
      password_hash: 'hashed_password',
    };

    // Benutzer existiert
    context.mockDb.first.mockResolvedValue(mockUser);

    // Passwort ist korrekt
    vi.mocked(bcrypt.compare).mockResolvedValue(true);

    // Session-Mock
    const mockSession = {
      id: 'session-123',
      userId: mockUser.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
    vi.mocked(authModule.createSession).mockResolvedValue(mockSession);

    const response = await POST(context as any);

    // Überprüfen der Ergebnisse
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/dashboard');
    
    // Überprüfen, ob die Session erstellt wurde
    expect(authModule.createSession).toHaveBeenCalledWith(context.mockDb, mockUser.id);
    
    // Überprüfen, ob der Cookie gesetzt wurde
    expect(context.mockCookies.set).toHaveBeenCalledWith(
      'session_id',
      mockSession.id,
      expect.objectContaining({
        path: '/',
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30,
        secure: true,
        sameSite: 'lax'
      })
    );
  });

  it('sollte einen allgemeinen Fehler zurückgeben, wenn eine Ausnahme auftritt', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: 'password123',
    });

    // Einen Fehler simulieren
    context.mockDb.first.mockRejectedValue(new Error('Datenbankfehler'));

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login?error=UnknownError');
  });
});
