import { describe, it, expect, vi, beforeEach } from 'vitest';
// NOTE: Legacy test suite targeting pre-service-layer implementation.
// Marked as skipped during v2 migration; canonical tests live in register-v2.test.ts
import { POST } from '@/pages/api/auth/register';
import * as authModule from '@/lib/auth-v2';
import * as bcrypt from 'bcrypt-ts';
import * as rateLimiter from '@/lib/rate-limiter';
import * as apiMiddleware from '@/lib/api-middleware';
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
    run: vi.fn().mockResolvedValue({ success: true }),
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
    hash: vi.fn().mockResolvedValue('hashed_password'),
  };
});

// Mocks für Security-Module
vi.mock('@/lib/rate-limiter', () => ({
  authLimiter: vi.fn().mockResolvedValue(null),
  standardApiLimiter: vi.fn().mockResolvedValue(null),
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
  logSecurityEvent: vi.fn(),
  logUserEvent: vi.fn()
}));

// Mock für crypto.randomUUID
const originalRandomUUID = crypto.randomUUID;
vi.stubGlobal('crypto', {
  ...crypto,
  randomUUID: vi.fn().mockReturnValue('test-user-id'),
});

describe.skip('Register API Tests (legacy)', () => {
  // Spy für die Sicherheitsfunktionen
  let standardApiLimiterSpy: any;
  let applySecurityHeadersSpy: any;
  let logSecurityEventSpy: any;
  let logUserEventSpy: any;
  let createApiErrorSpy: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Spies für die Sicherheitsfunktionen
    standardApiLimiterSpy = vi.spyOn(rateLimiter, 'standardApiLimiter').mockResolvedValue(null);
    applySecurityHeadersSpy = vi.spyOn(securityHeaders, 'applySecurityHeaders');
    logSecurityEventSpy = vi.spyOn(securityLogger, 'logSecurityEvent');
    logUserEventSpy = vi.spyOn(securityLogger, 'logUserEvent');
    createApiErrorSpy = vi.spyOn(apiMiddleware, 'createApiError');
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn die E-Mail ungültig ist', async () => {
    const context = createMockContext({
      email: 'ab', // zu kurz
      password: 'password123',
      name: 'Test User',
      username: 'testuser',
    });

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/register?error=InvalidInput');
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn das Passwort zu kurz ist', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: '12345', // zu kurz
      name: 'Test User',
      username: 'testuser',
    });

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/register?error=InvalidInput');
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn der Name zu kurz ist', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: 'password123',
      name: 'T', // zu kurz
      username: 'testuser',
    });

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/register?error=InvalidInput');
  });

  it('sollte eine Fehlermeldung zurückgeben, wenn der Benutzername zu kurz ist', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      username: 'ab', // zu kurz
    });

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/register?error=InvalidInput');
  });

  it('sollte einen Benutzer erfolgreich registrieren und zum Dashboard weiterleiten', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      username: 'testuser',
    });

    // Clientadresse für Tests hinzufügen
    context.clientAddress = '192.168.1.1';

    // Session-Mock
    const mockSession = {
      id: 'session-123',
      userId: 'test-user-id',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
    vi.mocked(authModule.createSession).mockResolvedValue(mockSession);

    const response = await POST(context as any);

    // Überprüfen, ob Redirect zum Dashboard erfolgt
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/dashboard');

    // Überprüfen, ob der Benutzer in der Datenbank gespeichert wurde
    expect(context.mockDb.prepare).toHaveBeenCalledWith(
      'INSERT INTO users (id, email, password_hash, name, username) VALUES (?, ?, ?, ?, ?)'
    );
    expect(context.mockDb.run).toHaveBeenCalled();
    
    // Überprüfen, ob die Session erstellt wurde
    expect(authModule.createSession).toHaveBeenCalledWith(context.mockDb, 'test-user-id');
    
    // Überprüfen, ob der Cookie gesetzt wurde
    expect(context.mockCookies.set).toHaveBeenCalledWith(
      'session_id',
      mockSession.id,
      expect.objectContaining({
        path: '/',
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30, // 30 Tage
        secure: true,
        sameSite: 'lax'
      })
    );
  });

  it('sollte einen Fehler bei existierendem Benutzer zurückgeben', async () => {
    const context = createMockContext({
      email: 'existing@example.com',
      password: 'password123',
      name: 'Existing User',
      username: 'existinguser',
    });

    // Einen UNIQUE constraint error simulieren
    const uniqueError = new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed');
    uniqueError.message = 'SQLITE_CONSTRAINT: UNIQUE constraint failed';
    context.mockDb.run.mockRejectedValue(uniqueError);

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/register?error=UserExists');
  });

  it('sollte einen allgemeinen Fehler bei unbekanntem Problem zurückgeben', async () => {
    const context = createMockContext({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      username: 'testuser',
    });

    // Einen allgemeinen Datenbankfehler simulieren
    context.mockDb.run.mockRejectedValue(new Error('Datenbankfehler'));

    const response = await POST(context as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/register?error=UnknownError');
  });
  
  // Aufräumen nach allen Tests
  afterAll(() => {
    // Originale Funktionen wiederherstellen
    crypto.randomUUID = originalRandomUUID;
    vi.restoreAllMocks();
  });
  
  // Tests für Security-Features
  describe('Security-Features', () => {
    it('sollte Rate-Limiting anwenden', async () => {
      const context = createMockContext({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        username: 'testuser',
      });

      // Clientadresse für Tests hinzufügen
      context.clientAddress = '192.168.1.1';

      await POST(context as any);

      expect(standardApiLimiterSpy).toHaveBeenCalled();
    });

    it('sollte abbrechen, wenn Rate-Limiting ausgelöst wird', async () => {
      const context = createMockContext({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        username: 'testuser',
      });

      // Rate-Limiting-Antwort simulieren
      const rateLimitResponse = new Response(null, { 
        status: 429, 
        statusText: 'Too Many Requests'
      });
      standardApiLimiterSpy.mockResolvedValueOnce(rateLimitResponse);

      const response = await POST(context as any);

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/register?error=TooManyRequests');
      // Keine weiteren Aktionen sollten ausgeführt werden
      expect(context.mockDb.run).not.toHaveBeenCalled();
    });

    it('sollte Security-Headers auf Antworten anwenden', async () => {
      const context = createMockContext({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        username: 'testuser',
      });

      // Mock für erfolgreiche Registrierung
      context.mockDb.run.mockResolvedValue({ success: true });

      // Session-Mock
      const mockSession = {
        id: 'session-123',
        userId: 'test-user-id',
      };
      vi.mocked(authModule.createSession).mockResolvedValue(mockSession);

      // Clientadresse für Tests hinzufügen
      context.clientAddress = '192.168.1.1';

      await POST(context as any);

      // Prüfen, ob Security-Headers angewendet wurden
      expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    });

    it('sollte erfolgreiche und fehlgeschlagene Registrierung protokollieren', async () => {
      const context = createMockContext({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        username: 'testuser',
      });

      // Mock für erfolgreiche Registrierung
      context.mockDb.run.mockResolvedValue({ success: true });

      // Session-Mock
      const mockSession = {
        id: 'session-123',
        userId: 'test-user-id',
      };
      vi.mocked(authModule.createSession).mockResolvedValue(mockSession);

      // Clientadresse für Tests hinzufügen
      context.clientAddress = '192.168.1.1';

      await POST(context as any);
      
      // Überprüfen, ob erfolgreiche Registrierung protokolliert wurde
      expect(securityLogger.logAuthSuccess).toHaveBeenCalledWith(
        'test-user-id',
        context.clientAddress,
        expect.objectContaining({
          action: 'register',
          email: 'test@example.com',
          username: 'testuser',
        })
      );

      // Test zurücksetzen
      vi.clearAllMocks();
      
      // Einen UNIQUE constraint error für zweiten Test simulieren
      const uniqueError = new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed');
      uniqueError.message = 'SQLITE_CONSTRAINT: UNIQUE constraint failed';
      context.mockDb.run.mockRejectedValue(uniqueError);

      await POST(context as any);

      // Überprüfen, ob fehlgeschlagene Registrierung protokolliert wurde
      expect(securityLogger.logAuthFailure).toHaveBeenCalledWith(
        context.clientAddress,
        expect.objectContaining({
          reason: 'duplicate_user',
          email: 'test@example.com'
        })
      );
    });
  });
});
