import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/pages/api/dashboard/perform-action';
import * as rateLimiter from '@/lib/rate-limiter';
import * as securityHeaders from '@/lib/security-headers';
import * as securityLogger from '@/lib/security-logger';
import { mockRateLimitOnce } from '../../../helpers/rateLimiter';

describe('Dashboard Perform-Action API Tests', () => {
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

    // Mock für crypto.randomUUID mit gültigem UUID-String
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-1111-1111-111111111111');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('sollte 401 zurückgeben, wenn kein Benutzer authentifiziert ist', async () => {
    // Mock-Context ohne Benutzer
    const context = {
      locals: {},
      clientAddress: '192.168.1.1',
      url: new URL('https://example.com/api/dashboard/perform-action'),
      request: {
        url: 'https://example.com/api/dashboard/perform-action',
        json: vi.fn().mockResolvedValue({ action: 'create_project' }),
      },
    };

    // API-Aufruf
    const response = await POST(context as any);

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
        endpoint: '/api/dashboard/perform-action',
      })
    );
  });

  it('sollte 400 zurückgeben, wenn die JSON-Anfrage ungültig ist', async () => {
    // Mock-Benutzerdaten
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    // Mock-Context mit authentifiziertem Benutzer, aber ungültiger JSON-Anfrage
    const context = {
      locals: {
        user: mockUser,
        runtime: {
          env: {},
        },
      },
      clientAddress: '192.168.1.1',
      url: new URL('https://example.com/api/dashboard/perform-action'),
      request: {
        url: 'https://example.com/api/dashboard/perform-action',
        method: 'POST',
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      },
    };

    // API-Aufruf
    const response = await POST(context as any);

    // Überprüfungen
    expect(response.status).toBe(400);

    // Response-Body überprüfen
    const responseText = await response.text();
    const responseData = JSON.parse(responseText);
    expect(responseData.success).toBe(false);
    expect(responseData.error.type).toBe('validation_error');
    expect(responseData.error.message).toBe('Invalid JSON in request body');

    // Überprüfen, ob Security-Features angewendet wurden
    expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    expect(securityLogger.logUserEvent).toHaveBeenCalledWith(
      mockUser.id,
      'invalid_dashboard_request',
      expect.objectContaining({
        error: 'Invalid JSON in request body',
        ipAddress: '192.168.1.1',
      })
    );
  });

  it('sollte ein Projekt erstellen und 200 zurückgeben', async () => {
    // Mock-Benutzerdaten
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    // Mock für die Datenbank
    const mockRun = vi.fn().mockResolvedValue({});
    const mockBind = vi.fn().mockReturnValue({ run: mockRun });
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
      url: new URL('https://example.com/api/dashboard/perform-action'),
      request: {
        url: 'https://example.com/api/dashboard/perform-action',
        json: vi.fn().mockResolvedValue({
          action: 'create_project',
          name: 'New Project',
          description: 'A placeholder project.',
        }),
      },
    };

    // API-Aufruf
    const response = await POST(context as any);

    // Überprüfungen
    expect(response.status).toBe(200);

    // Response-Body überprüfen
    const responseText = await response.text();
    const responseData = JSON.parse(responseText);
    expect(responseData.data.message).toBe('Project created successfully');
    expect(responseData.data.projectId).toBe('11111111-1111-1111-1111-111111111111');

    // Überprüfen, ob Datenbankabfrage korrekt ausgeführt wurde
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO projects'));
    expect(mockBind).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      mockUser.id,
      'New Project',
      'A placeholder project.',
      'active',
      0
    );
    expect(mockRun).toHaveBeenCalled();

    // Überprüfen, ob Security-Features angewendet wurden
    expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    expect(securityLogger.logApiAccess).toHaveBeenCalledWith(
      mockUser.id,
      '192.168.1.1',
      expect.objectContaining({
        endpoint: '/api/dashboard/perform-action',
        method: 'POST',
        action: 'perform_dashboard_action',
      })
    );
    expect(securityLogger.logUserEvent).toHaveBeenCalledWith(
      mockUser.id,
      'project_created',
      expect.objectContaining({
        projectId: '11111111-1111-1111-1111-111111111111',
        ipAddress: '192.168.1.1',
      })
    );
  });

  it('sollte einen Task erstellen und 200 zurückgeben', async () => {
    // Mock-Benutzerdaten
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    // Mock für die Datenbank
    const mockRun = vi.fn().mockResolvedValue({});
    const mockBind = vi.fn().mockReturnValue({ run: mockRun });
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
      url: new URL('https://example.com/api/dashboard/perform-action'),
      request: {
        url: 'https://example.com/api/dashboard/perform-action',
        method: 'POST',
        json: vi.fn().mockResolvedValue({ action: 'create_task' }),
      },
    };

    // API-Aufruf
    const response = await POST(context as any);

    // Überprüfungen
    expect(response.status).toBe(200);

    // Response-Body überprüfen
    const responseText = await response.text();
    const responseData = JSON.parse(responseText);
    expect(responseData.data.message).toBe('Task created successfully');
    expect(responseData.data.taskId).toBe('11111111-1111-1111-1111-111111111111');

    // Überprüfen, ob Datenbankabfrage korrekt ausgeführt wurde
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO tasks'));
    expect(mockBind).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      mockUser.id,
      'New Task',
      'pending'
    );
    expect(mockRun).toHaveBeenCalled();

    // Überprüfen, ob Security-Features angewendet wurden
    expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    expect(securityLogger.logApiAccess).toHaveBeenCalledWith(
      mockUser.id,
      '192.168.1.1',
      expect.objectContaining({
        endpoint: '/api/dashboard/perform-action',
        method: 'POST',
        action: 'perform_dashboard_action',
      })
    );
    expect(securityLogger.logUserEvent).toHaveBeenCalledWith(
      mockUser.id,
      'task_created',
      expect.objectContaining({
        taskId: '11111111-1111-1111-1111-111111111111',
        ipAddress: '192.168.1.1',
      })
    );
  });

  it('sollte 400 zurückgeben, wenn die Aktion ungültig ist', async () => {
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
      url: new URL('https://example.com/api/dashboard/perform-action'),
      request: {
        url: 'https://example.com/api/dashboard/perform-action',
        method: 'POST',
        json: vi.fn().mockResolvedValue({ action: 'invalid_action' }),
      },
    };

    // API-Aufruf
    const response = await POST(context as any);

    // Überprüfungen
    expect(response.status).toBe(400);

    // Response-Body überprüfen
    const responseText = await response.text();
    const responseData = JSON.parse(responseText);
    expect(responseData.success).toBe(false);
    expect(responseData.error.type).toBe('validation_error');
    expect(responseData.error.message).toBe('Invalid action: invalid_action');

    // Überprüfen, ob Security-Features angewendet wurden
    expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    expect(securityLogger.logUserEvent).toHaveBeenCalledWith(
      mockUser.id,
      'invalid_dashboard_action',
      expect.objectContaining({
        action: 'invalid_action',
        ipAddress: '192.168.1.1',
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
    const mockRun = vi.fn().mockRejectedValue(new Error('Database error'));
    const mockBind = vi.fn().mockReturnValue({ run: mockRun });
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
      url: new URL('https://example.com/api/dashboard/perform-action'),
      request: {
        url: 'https://example.com/api/dashboard/perform-action',
        method: 'POST',
        json: vi.fn().mockResolvedValue({ action: 'create_project' }),
      },
    };

    // Spy auf console.error
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // API-Aufruf
    const response = await POST(context as any);

    // Überprüfungen
    expect(response.status).toBe(500);

    // Response-Body überprüfen
    const responseText = await response.text();
    const responseData = JSON.parse(responseText);
    expect(responseData.success).toBe(false);
    expect(responseData.error.type).toBe('server_error');
    expect(responseData.error.message).toBe('Error performing dashboard action');

    // Überprüfen, ob Fehler protokolliert wurde
    expect(consoleErrorSpy).toHaveBeenCalled();

    // Überprüfen, ob Security-Features angewendet wurden
    expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    expect(securityLogger.logUserEvent).toHaveBeenCalledWith(
      mockUser.id,
      'dashboard_action_error',
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
        url: new URL('https://example.com/api/dashboard/perform-action'),
        request: {
          url: 'https://example.com/api/dashboard/perform-action',
          method: 'POST',
          json: vi.fn().mockResolvedValue({ action: 'view_docs' }),
        },
      };

      // API-Aufruf
      await POST(context as any);

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
        url: new URL('https://example.com/api/dashboard/perform-action'),
        request: {
          url: 'https://example.com/api/dashboard/perform-action',
          method: 'POST',
          json: vi.fn().mockResolvedValue({ action: 'view_docs' }),
        },
      };

      // Rate-Limiting-Antwort simulieren (einmalig)
      mockRateLimitOnce();

      // API-Aufruf
      const response = await POST(context as any);

      // Überprüfen, ob die Rate-Limit-Antwort zurückgegeben wurde
      // Erwartet: 429 Too Many Requests
      expect(response.status).toBe(429);
    });

    it('sollte Security-Headers auf Antworten anwenden', async () => {
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
        url: new URL('https://example.com/api/dashboard/perform-action'),
        request: {
          url: 'https://example.com/api/dashboard/perform-action',
          method: 'POST',
          json: vi.fn().mockResolvedValue({ action: 'view_docs' }),
        },
      };

      // API-Aufruf
      await POST(context as any);

      // Überprüfen, ob Security-Headers angewendet wurden
      expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    });
  });
});
