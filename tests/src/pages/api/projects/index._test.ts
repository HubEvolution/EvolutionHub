import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/pages/api/projects/index';
import * as rateLimiter from '@/lib/rate-limiter';
import * as securityHeaders from '@/lib/security-headers';
import * as securityLogger from '@/lib/security-logger';
import { mockRateLimitOnce } from '../../../helpers/rateLimiter';

describe('Projects API Tests', () => {
  // Mock für die Security-Module
  beforeEach(() => {
    vi.mock('@/lib/rate-limiter', () => ({
      apiRateLimiter: vi.fn().mockResolvedValue({success: true}),
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
    }));

    // Korrigiertes Mock für crypto.randomUUID
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => 'mock-uuid');
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('sollte 401 zurückgeben, wenn kein Benutzer authentifiziert ist', async () => {
    // Mock-Context ohne Benutzer
    const context = {
      locals: {
        runtime: {
          env: {}
        }
      },
      clientAddress: '192.168.1.1',
      request: {
        url: 'https://example.com/api/projects',
        method: 'POST'
      },
      url: new URL('https://example.com/api/projects'),
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
        endpoint: '/api/projects'
      })
    );
  });

  it('sollte 400 zurückgeben, wenn der Titel fehlt', async () => {
    // Mock-Benutzerdaten
    const mockUser = {
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };
    
    // Mock für request.json()
    const mockRequestData = {
      json: vi.fn().mockResolvedValue({
        description: 'Test description'
        // Kein Titel
      })
    };
    
    // Mock-Context mit authentifiziertem Benutzer
    const context = {
      request: {
        ...mockRequestData,
        url: 'https://example.com/api/projects',
        method: 'POST'
      },
      locals: {
        runtime: {
          env: {},
          user: mockUser
        }
      },
      clientAddress: '192.168.1.1',
      url: new URL('https://example.com/api/projects'),
    };
    
    // API-Aufruf
    const response = await POST(context as any);
    
    // Überprüfungen
    expect(response.status).toBe(400);
    
    // Response-Body überprüfen
    const responseText = await response.text();
    const responseData = JSON.parse(responseText);
    expect(responseData.error).toBe('Title is required');
    
    // Überprüfen, ob Security-Features angewendet wurden
    expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    expect(securityLogger.logAuthFailure).toHaveBeenCalledWith(
      mockUser.sub,
      expect.objectContaining({
        reason: 'validation_failed',
        endpoint: '/api/projects'
      })
    );
  });

  it('sollte ein neues Projekt erstellen und 201 zurückgeben', async () => {
    // Mock-Benutzerdaten
    const mockUser = {
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };
    
    // Mock für request.json()
    const mockRequestData = {
      json: vi.fn().mockResolvedValue({
        title: 'Test Project',
        description: 'Test description'
      })
    };
    
    // Mock für die Datenbank
    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis()
    });
    
    const mockBatch = vi.fn().mockResolvedValue(undefined);
    
    // Mock-Context mit authentifiziertem Benutzer
    const context = {
      request: {
        ...mockRequestData,
        url: 'https://example.com/api/projects',
        method: 'POST'
      },
      locals: {
        runtime: {
          env: {
            DB: {
              prepare: mockPrepare,
              batch: mockBatch
            }
          },
          user: mockUser
        }
      },
      clientAddress: '192.168.1.1',
      url: new URL('https://example.com/api/projects'),
    };
    
    // API-Aufruf
    const response = await POST(context as any);
    
    // Überprüfungen
    expect(response.status).toBe(201);
    
    // Response-Body überprüfen
    const responseText = await response.text();
    const responseData = JSON.parse(responseText);
    expect(responseData.id).toBe('mock-uuid');
    expect(responseData.title).toBe('Test Project');
    expect(responseData.description).toBe('Test description');
    expect(responseData.user_id).toBe(mockUser.sub);
    
    // Überprüfen, ob Datenbankoperationen aufgerufen wurden
    expect(mockPrepare).toHaveBeenCalledTimes(2);
    expect(mockBatch).toHaveBeenCalledTimes(1);
    
    // Überprüfen, ob Security-Features angewendet wurden
    expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    expect(securityLogger.logApiAccess).toHaveBeenCalledWith(
      mockUser.sub,
      '192.168.1.1',
      expect.objectContaining({
        endpoint: '/api/projects',
        method: 'POST',
        action: 'project_created'
      })
    );
  });

  it('sollte 500 zurückgeben, wenn ein Datenbankfehler auftritt', async () => {
    // Mock-Benutzerdaten
    const mockUser = {
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };
    
    // Mock für request.json()
    const mockRequestData = {
      json: vi.fn().mockResolvedValue({
        title: 'Test Project',
        description: 'Test description'
      })
    };
    
    // Mock für die Datenbank mit Fehler
    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis()
    });
    
    const mockBatch = vi.fn().mockRejectedValue(new Error('Database error'));
    
    // Mock-Context mit authentifiziertem Benutzer
    const context = {
      request: {
        ...mockRequestData,
        url: 'https://example.com/api/projects',
        method: 'POST'
      },
      locals: {
        runtime: {
          env: {
            DB: {
              prepare: mockPrepare,
              batch: mockBatch
            }
          },
          user: mockUser
        }
      },
      clientAddress: '192.168.1.1',
      url: new URL('https://example.com/api/projects'),
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
    // Anpassung an das neue strukturierte Fehlerformat
    expect(responseData.type).toBe('server_error');
    expect(responseData.message).toBe('Failed to create project');
    
    // Überprüfen, ob Fehler protokolliert wurde
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    // Überprüfen, ob Security-Features angewendet wurden
    expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    expect(securityLogger.logAuthFailure).toHaveBeenCalledWith(
      mockUser.sub,
      expect.objectContaining({
        reason: 'server_error',
        endpoint: '/api/projects'
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
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };
      
      // Mock-Context mit authentifiziertem Benutzer
      const context = {
        request: {
          json: vi.fn().mockResolvedValue({
            title: 'Test Project',
            description: 'Test description'
          }),
          url: 'https://example.com/api/projects',
          method: 'POST'
        },
        locals: {
          runtime: {
            env: {
              DB: {
                prepare: vi.fn().mockReturnValue({
                  bind: vi.fn().mockReturnThis()
                }),
                batch: vi.fn().mockResolvedValue(undefined)
              }
            },
            user: mockUser
          }
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/projects'),
      };
      
      // API-Aufruf
      await POST(context as any);
      
      // Überprüfen, ob Rate-Limiting angewendet wurde
      expect(rateLimiter.apiRateLimiter).toHaveBeenCalledWith(context);
    });
    
    it('sollte abbrechen, wenn Rate-Limiting ausgelöst wird', async () => {
      // Mock-Benutzerdaten
      const mockUser = {
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };
      
      // Mock-Context mit authentifiziertem Benutzer
      const context = {
        request: {
          json: vi.fn().mockResolvedValue({
            title: 'Test Project',
            description: 'Test description'
          }),
          url: 'https://example.com/api/projects',
          method: 'POST'
        },
        locals: {
          runtime: {
            env: {
              DB: {
                prepare: vi.fn().mockReturnValue({
                  bind: vi.fn().mockReturnThis()
                }),
                batch: vi.fn().mockResolvedValue(undefined)
              }
            },
            user: mockUser
          }
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/projects'),
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
        sub: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };
      
      // Mock-Context mit authentifiziertem Benutzer
      const context = {
        request: {
          json: vi.fn().mockResolvedValue({
            title: 'Test Project',
            description: 'Test description'
          }),
          url: 'https://example.com/api/projects',
          method: 'POST'
        },
        locals: {
          runtime: {
            env: {
              DB: {
                prepare: vi.fn().mockReturnValue({
                  bind: vi.fn().mockReturnThis()
                }),
                batch: vi.fn().mockResolvedValue(undefined)
              }
            },
            user: mockUser
          }
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/projects'),
      };
      
      // API-Aufruf
      await POST(context as any);
      
      // Überprüfen, ob Security-Headers angewendet wurden
      // Da applySecurityHeaders in der API-Middleware aufgerufen wird,
      // muss der Mock korrekt konfiguriert sein
      expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    });
  });
});
