import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/pages/api/auth/login';
import * as rateLimiter from '@/lib/rate-limiter';
import * as authServiceModule from '@/lib/services/auth-service-impl';
import * as loggerFactoryModule from '@/server/utils/logger-factory';
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
    headers: {
      get: vi.fn((key: string) => {
        if (key === 'user-agent') return 'test-agent';
        if (key === 'referer') return 'https://example.com/en/login';
        return null;
      }),
    },
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

// Mock für SecurityLogger
const createMockSecurityLogger = () => {
  return {
    logSecurityEvent: vi.fn(),
    logAuthSuccess: vi.fn(),
    logAuthFailure: vi.fn(),
    logApiAccess: vi.fn(),
    logApiError: vi.fn(),
  };
};

// Mocks für Module
vi.mock('@/lib/services/auth-service-impl', () => ({
  createAuthService: vi.fn(),
}));

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

vi.mock('@/server/utils/logger-factory', () => ({
  loggerFactory: {
    createSecurityLogger: vi.fn(),
  },
}));

describe('Login API Logger Tests', () => {
  // Service-Mock
  let mockAuthService: any;
  let mockSecurityLogger: any;

  // Spies für Funktionen
  let standardApiLimiterSpy: any;
  let createSecurityLoggerSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock-Service erstellen
    mockAuthService = {
      login: vi.fn(),
    };

    // Mock-SecurityLogger erstellen
    mockSecurityLogger = createMockSecurityLogger();

    // createAuthService so mocken, dass er unseren Mock-Service zurückgibt
    vi.spyOn(authServiceModule, 'createAuthService').mockReturnValue(mockAuthService as any);

    // createSecurityLogger so mocken, dass er unseren Mock-Logger zurückgibt
    createSecurityLoggerSpy = vi
      .spyOn(loggerFactoryModule.loggerFactory, 'createSecurityLogger')
      .mockReturnValue(mockSecurityLogger);

    // Spies für weitere Funktionen einrichten
    standardApiLimiterSpy = vi
      .spyOn(rateLimiter, 'standardApiLimiter')
      .mockResolvedValue(undefined as any);
  });

  describe('Logger-Initialisierung testen', () => {
    it('sollte SecurityLogger korrekt initialisieren', async () => {
      const context = createMockContext({
        email: 'test@example.com',
        password: 'password123',
      });

      mockAuthService.login.mockResolvedValue({ sessionId: 'session-123' });

      await POST(context as any);

      // Überprüfen, ob createSecurityLogger aufgerufen wurde
      expect(createSecurityLoggerSpy).toHaveBeenCalledTimes(1);
      expect(createSecurityLoggerSpy).toHaveBeenCalledWith();

      // Überprüfen, dass der Logger die erwarteten Methoden hat
      expect(mockSecurityLogger).toHaveProperty('logAuthSuccess');
      expect(mockSecurityLogger).toHaveProperty('logAuthFailure');
      expect(mockSecurityLogger).toHaveProperty('logSecurityEvent');
      expect(mockSecurityLogger).toHaveProperty('logApiError');
    });

    it('sollte Logger nur einmal pro Request initialisieren', async () => {
      const context = createMockContext({
        email: 'test@example.com',
        password: 'password123',
      });

      mockAuthService.login.mockResolvedValue({ sessionId: 'session-123' });

      await POST(context as any);

      // createSecurityLogger sollte nur einmal aufgerufen werden
      expect(createSecurityLoggerSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Erfolgreiche Login-Logging testen', () => {
    it('sollte erfolgreichen Login mit korrekten Details loggen', async () => {
      const context = createMockContext({
        email: 'user@example.com',
        password: 'correctpassword',
      });

      const mockUser = { id: 'user-123', email: 'user@example.com' };
      const mockSessionId = 'session-456';

      mockAuthService.login.mockResolvedValue({
        sessionId: mockSessionId,
        user: mockUser,
      });

      await POST(context as any);

      // Überprüfen, ob logAuthSuccess mit korrekten Parametern aufgerufen wurde
      expect(mockSecurityLogger.logAuthSuccess).toHaveBeenCalledTimes(1);
      expect(mockSecurityLogger.logAuthSuccess).toHaveBeenCalledWith(
        {
          email: 'user@example.com',
          sessionId: mockSessionId,
          ipAddress: '127.0.0.1',
        },
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          resource: 'auth/login',
          action: 'login_success',
          userId: mockUser.id,
          sessionId: mockSessionId,
        })
      );
    });

    it('sollte erfolgreichen Login ohne User-Agent loggen', async () => {
      const context = createMockContext({
        email: 'user@example.com',
        password: 'correctpassword',
      });

      // User-Agent entfernen
      context.request.headers.get = vi.fn((key: string) => {
        if (key === 'referer') return 'https://example.com/en/login';
        return null;
      });

      const mockUser = { id: 'user-123', email: 'user@example.com' };
      mockAuthService.login.mockResolvedValue({
        sessionId: 'session-456',
        user: mockUser,
      });

      await POST(context as any);

      // Überprüfen, dass userAgent undefined ist
      expect(mockSecurityLogger.logAuthSuccess).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          userAgent: undefined,
        })
      );
    });
  });

  describe('Fehlgeschlagene Login-Logging testen', () => {
    it('sollte Validierungsfehler korrekt loggen', async () => {
      const context = createMockContext({
        email: 'invalid-email',
        password: 'password123',
      });

      await POST(context as any);

      // Überprüfen, ob logAuthFailure mit Validierungsfehler aufgerufen wurde
      expect(mockSecurityLogger.logAuthFailure).toHaveBeenCalledTimes(1);
      expect(mockSecurityLogger.logAuthFailure).toHaveBeenCalledWith(
        {
          email: 'invalid-email',
          reason: 'validation_error',
          error: expect.stringContaining('validation'),
        },
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          resource: 'auth/login',
          action: 'validation_failed',
          metadata: expect.objectContaining({
            validationError: expect.any(String),
          }),
        })
      );
    });

    it('sollte Authentifizierungsfehler korrekt loggen', async () => {
      const context = createMockContext({
        email: 'user@example.com',
        password: 'wrongpassword',
      });

      mockAuthService.login.mockRejectedValue(ServiceError.authentication('Invalid credentials'));

      await POST(context as any);

      // Überprüfen, ob logAuthFailure mit Authentifizierungsfehler aufgerufen wurde
      expect(mockSecurityLogger.logAuthFailure).toHaveBeenCalledTimes(1);
      expect(mockSecurityLogger.logAuthFailure).toHaveBeenCalledWith(
        {
          email: 'user@example.com',
          reason: 'login_error',
          error: 'Invalid credentials',
        },
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          resource: 'auth/login',
          action: 'login_failed',
          metadata: expect.objectContaining({
            error: 'Invalid credentials',
          }),
        })
      );
    });

    it('sollte Runtime-Fehler korrekt loggen', async () => {
      const context: any = createMockContext({
        email: 'user@example.com',
        password: 'password123',
      });

      // Runtime entfernen
      context.locals.runtime = undefined;

      await POST(context as any);

      // Überprüfen, ob logApiError mit Runtime-Fehler aufgerufen wurde
      expect(mockSecurityLogger.logApiError).toHaveBeenCalledTimes(1);
      expect(mockSecurityLogger.logApiError).toHaveBeenCalledWith(
        {
          endpoint: '/api/auth/login',
          error: expect.stringContaining('Runtime environment'),
          statusCode: 500,
        },
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          resource: 'auth/login',
          action: 'runtime_error',
          metadata: expect.objectContaining({
            error: expect.stringContaining('Runtime environment'),
          }),
        })
      );
    });

    it('sollte Rate-Limiting korrekt loggen', async () => {
      const context = createMockContext({
        email: 'user@example.com',
        password: 'password123',
      });

      // Rate-Limiting simulieren
      standardApiLimiterSpy.mockResolvedValue(
        new Response(null, {
          status: 429,
          headers: { 'Retry-After': '60' },
        }) as any
      );

      await POST(context as any);

      // Überprüfen, ob logSecurityEvent mit Rate-Limiting aufgerufen wurde
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledTimes(1);
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'RATE_LIMIT_EXCEEDED',
        {
          endpoint: '/api/auth/login',
          ipAddress: '127.0.0.1',
        },
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          resource: 'auth/login',
          action: 'login_attempt',
        })
      );
    });
  });

  describe('Log-Format testen', () => {
    it('sollte alle LogContext-Felder korrekt setzen', async () => {
      const context = createMockContext({
        email: 'test@example.com',
        password: 'password123',
      });

      mockAuthService.login.mockResolvedValue({
        sessionId: 'session-123',
        user: { id: 'user-123', email: 'test@example.com' },
      });

      await POST(context as any);

      // Überprüfen, dass alle erwarteten LogContext-Felder vorhanden sind
      const logCall = mockSecurityLogger.logAuthSuccess.mock.calls[0];
      const logContext = logCall[1]; // Zweiter Parameter ist der LogContext

      expect(logContext).toHaveProperty('ipAddress', '127.0.0.1');
      expect(logContext).toHaveProperty('userAgent', 'test-agent');
      expect(logContext).toHaveProperty('resource', 'auth/login');
      expect(logContext).toHaveProperty('action');
      expect(logContext).toHaveProperty('timestamp');
      expect(logContext).toHaveProperty('requestId');
    });

    it('sollte verschiedene Action-Typen korrekt verwenden', async () => {
      // Test für verschiedene Actions
      const testCases = [
        {
          setup: () => {
            const context = createMockContext({ email: 'invalid', password: 'test' });
            return { context, expectedAction: 'validation_failed' };
          },
        },
        {
          setup: () => {
            const context = createMockContext({ email: 'test@example.com', password: 'correct' });
            mockAuthService.login.mockResolvedValue({
              sessionId: 'session-123',
              user: { id: 'user-123' },
            });
            return { context, expectedAction: 'login_success' };
          },
        },
        {
          setup: () => {
            const context = createMockContext({ email: 'test@example.com', password: 'wrong' });
            mockAuthService.login.mockRejectedValue(ServiceError.authentication('Invalid'));
            return { context, expectedAction: 'login_failed' };
          },
        },
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        const { context, expectedAction } = testCase.setup();

        await POST(context as any);

        // Überprüfen, dass die richtige Action verwendet wurde
        const allLogCalls = [
          ...mockSecurityLogger.logAuthSuccess.mock.calls,
          ...mockSecurityLogger.logAuthFailure.mock.calls,
          ...mockSecurityLogger.logSecurityEvent.mock.calls,
          ...mockSecurityLogger.logApiError.mock.calls,
        ];

        expect(allLogCalls.length).toBeGreaterThan(0);
        const lastCall = allLogCalls[allLogCalls.length - 1];
        const logContext = lastCall[1] || lastCall[0]; // LogContext kann an verschiedenen Positionen sein

        if (logContext && typeof logContext === 'object' && 'action' in logContext) {
          expect(logContext.action).toBe(expectedAction);
        }
      }
    });

    it('sollte sensible Daten in Logs nicht preisgeben', async () => {
      const context = createMockContext({
        email: 'user@example.com',
        password: 'secretpassword123',
      });

      mockAuthService.login.mockResolvedValue({
        sessionId: 'session-123',
        user: { id: 'user-123', email: 'user@example.com' },
      });

      await POST(context as any);

      // Überprüfen, dass Passwort nicht in Logs erscheint
      const logCall = mockSecurityLogger.logAuthSuccess.mock.calls[0];
      const logDetails = logCall[0]; // Erster Parameter enthält die Details

      expect(logDetails).not.toHaveProperty('password');
      expect(logDetails).toHaveProperty('email', 'user@example.com');
      expect(logDetails).toHaveProperty('sessionId', 'session-123');
    });
  });
});
