import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GET, POST } from '../../../src/pages/api/comments';
import * as rateLimiter from '@/lib/rate-limiter';
import * as securityHeaders from '@/lib/security-headers';
import * as securityLogger from '@/lib/security-logger';

describe('Comments API Tests', () => {
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
    }));

    // Mock für crypto.randomUUID
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-comment-id-123');
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET', () => {
    it('sollte 400 zurückgeben, wenn kein postId Parameter vorhanden ist', async () => {
      // Mock-Context ohne postId
      const context = {
        request: {
          url: 'https://example.com/api/comments'
        },
        locals: {
          runtime: {
            env: {}
          }
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/comments')
      };
      
      // API-Aufruf
      const response = await GET(context as any);
      
      // Überprüfungen
      expect(response.status).toBe(400);
      
      // Response-Body überprüfen
      const responseText = await response.text();
      const responseData = JSON.parse(responseText);
      expect(responseData.error).toBe('postId is required');
      
      // Überprüfen, ob Security-Features angewendet wurden
      expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
      expect(securityLogger.logAuthFailure).toHaveBeenCalledWith(
        '192.168.1.1',
        expect.objectContaining({
          reason: 'invalid_request',
          endpoint: '/api/comments'
        })
      );
    });

    it('sollte Kommentare für einen Post zurückgeben', async () => {
      // Mock-Daten für Kommentare
      const mockComments = [
        { id: 'comment-1', postId: 'post-123', author: 'User1', content: 'Great post!' },
        { id: 'comment-2', postId: 'post-123', author: 'User2', content: 'I agree!' }
      ];
      
      // Mock für die Datenbank
      const mockAll = vi.fn().mockResolvedValue({ results: mockComments });
      const mockBind = vi.fn().mockReturnValue({ all: mockAll });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      
      // Mock-Context mit postId
      const context = {
        request: {
          url: 'https://example.com/api/comments?postId=post-123'
        },
        locals: {
          runtime: {
            env: {
              DB: {
                prepare: mockPrepare
              }
            }
          }
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/comments?postId=post-123')
      };
      
      // API-Aufruf
      const response = await GET(context as any);
      
      // Überprüfungen
      expect(response.status).toBe(200);
      
      // Response-Body überprüfen
      const responseText = await response.text();
      const responseData = JSON.parse(responseText);
      expect(responseData).toEqual(mockComments);
      
      // Überprüfen, ob Datenbankabfrage korrekt ausgeführt wurde
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM comments'));
      expect(mockBind).toHaveBeenCalledWith('post-123');
      expect(mockAll).toHaveBeenCalled();
      
      // Überprüfen, ob Security-Features angewendet wurden
      expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
      expect(securityLogger.logApiAccess).toHaveBeenCalledWith(
        '192.168.1.1',
        '192.168.1.1',
        expect.objectContaining({
          endpoint: '/api/comments',
          method: 'GET',
          action: 'get_comments',
          postId: 'post-123'
        })
      );
    });

    it('sollte 500 zurückgeben, wenn ein Datenbankfehler auftritt', async () => {
      // Mock für die Datenbank mit Fehler
      const mockBind = vi.fn().mockReturnValue({ 
        all: vi.fn().mockRejectedValue(new Error('Database error')) 
      });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      
      // Mock-Context mit postId
      const context = {
        request: {
          url: 'https://example.com/api/comments?postId=post-123'
        },
        locals: {
          runtime: {
            env: {
              DB: {
                prepare: mockPrepare
              }
            }
          }
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/comments?postId=post-123')
      };
      
      // Spy auf console.error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // API-Aufruf
      const response = await GET(context as any);
      
      // Überprüfungen
      expect(response.status).toBe(500);
      
      // Response-Body überprüfen
      const responseText = await response.text();
      const responseData = JSON.parse(responseText);
      expect(responseData.error).toBe('Internal Server Error');
      
      // Überprüfen, ob Fehler protokolliert wurde
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      // Überprüfen, ob Security-Features angewendet wurden
      expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
      expect(securityLogger.logAuthFailure).toHaveBeenCalledWith(
        '192.168.1.1',
        expect.objectContaining({
          reason: 'server_error',
          endpoint: '/api/comments'
        })
      );
      
      // Spy zurücksetzen
      consoleErrorSpy.mockRestore();
    });
  });

  describe('POST', () => {
    it('sollte einen neuen Kommentar erstellen', async () => {
      // Mock für die Datenbank
      const mockRun = vi.fn().mockResolvedValue({});
      const mockBind = vi.fn().mockReturnValue({ run: mockRun });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
      
      // Mock-Context für Kommentarerstellung
      const context = {
        request: {
          url: 'https://example.com/api/comments',
          json: vi.fn().mockResolvedValue({
            postId: 'post-123',
            author: 'Test User',
            content: 'This is a test comment'
          })
        },
        locals: {
          runtime: {
            env: {
              DB: {
                prepare: mockPrepare
              }
            }
          }
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/comments')
      };
      
      // API-Aufruf
      const response = await POST(context as any);
      
      // Überprüfungen
      expect(response.status).toBe(201);
      
      // Response-Body überprüfen
      const responseText = await response.text();
      const responseData = JSON.parse(responseText);
      expect(responseData).toEqual({
        id: 'test-comment-id-123',
        postId: 'post-123',
        author: 'Test User',
        content: 'This is a test comment',
        createdAt: expect.any(String),
        approved: false
      });
      
      // Überprüfen, ob Datenbankabfrage korrekt ausgeführt wurde
      expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO comments'));
      expect(mockBind).toHaveBeenCalledWith(
        'test-comment-id-123',
        'post-123',
        'Test User',
        'This is a test comment',
        expect.any(String)
      );
      expect(mockRun).toHaveBeenCalled();
      
      // Überprüfen, ob Security-Features angewendet wurden
      expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
      expect(securityLogger.logApiAccess).toHaveBeenCalledWith(
        '192.168.1.1',
        '192.168.1.1',
        expect.objectContaining({
          endpoint: '/api/comments',
          method: 'POST',
          action: 'create_comment',
          postId: 'post-123',
          commentId: 'test-comment-id-123'
        })
      );
    });

    it('sollte 400 zurückgeben, wenn erforderliche Felder fehlen', async () => {
      // Mock-Context mit fehlenden Feldern
      const context = {
        request: {
          url: 'https://example.com/api/comments',
          json: vi.fn().mockResolvedValue({
            postId: 'post-123',
            // author fehlt
            content: 'This is a test comment'
          })
        },
        locals: {
          runtime: {
            env: {
              DB: {}
            }
          }
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/comments')
      };
      
      // API-Aufruf
      const response = await POST(context as any);
      
      // Überprüfungen
      expect(response.status).toBe(400);
      
      // Response-Body überprüfen
      const responseText = await response.text();
      const responseData = JSON.parse(responseText);
      expect(responseData.error).toBe('Missing required fields');
      
      // Überprüfen, ob Security-Features angewendet wurden
      expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
      expect(securityLogger.logAuthFailure).toHaveBeenCalledWith(
        '192.168.1.1',
        expect.objectContaining({
          reason: 'invalid_request',
          endpoint: '/api/comments',
          details: 'Missing required fields in comment creation'
        })
      );
    });

    it('sollte 400 zurückgeben, wenn die Eingabe zu lang ist', async () => {
      // Sehr langer Inhalt erstellen
      const longContent = 'a'.repeat(2500); // Über 2000 Zeichen
      
      // Mock-Context mit zu langem Inhalt
      const context = {
        request: {
          url: 'https://example.com/api/comments',
          json: vi.fn().mockResolvedValue({
            postId: 'post-123',
            author: 'Test User',
            content: longContent
          })
        },
        locals: {
          runtime: {
            env: {
              DB: {}
            }
          }
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/comments')
      };
      
      // API-Aufruf
      const response = await POST(context as any);
      
      // Überprüfungen
      expect(response.status).toBe(400);
      
      // Response-Body überprüfen
      const responseText = await response.text();
      const responseData = JSON.parse(responseText);
      expect(responseData.error).toBe('Input exceeds maximum length');
      
      // Überprüfen, ob Security-Features angewendet wurden
      expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
      expect(securityLogger.logAuthFailure).toHaveBeenCalledWith(
        '192.168.1.1',
        expect.objectContaining({
          reason: 'invalid_request',
          endpoint: '/api/comments',
          details: 'Input exceeds maximum length'
        })
      );
    });

    it('sollte 400 zurückgeben, wenn die JSON-Anfrage ungültig ist', async () => {
      // Mock-Context mit ungültiger JSON-Anfrage
      const context = {
        request: {
          url: 'https://example.com/api/comments',
          json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
        },
        locals: {
          runtime: {
            env: {
              DB: {}
            }
          }
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/comments')
      };
      
      // Spy auf console.error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // API-Aufruf
      const response = await POST(context as any);
      
      // Überprüfungen
      expect(response.status).toBe(400);
      
      // Response-Body überprüfen
      const responseText = await response.text();
      const responseData = JSON.parse(responseText);
      expect(responseData.error).toBe('Invalid request body');
      
      // Überprüfen, ob Fehler protokolliert wurde
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      // Überprüfen, ob Security-Features angewendet wurden
      expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
      expect(securityLogger.logAuthFailure).toHaveBeenCalledWith(
        '192.168.1.1',
        expect.objectContaining({
          reason: 'invalid_request',
          endpoint: '/api/comments',
          details: 'Invalid request body format'
        })
      );
      
      // Spy zurücksetzen
      consoleErrorSpy.mockRestore();
    });
  });

  // Tests für Security-Features
  describe('Security-Features', () => {
    it('sollte Rate-Limiting anwenden', async () => {
      // Mock-Context
      const context = {
        request: {
          url: 'https://example.com/api/comments?postId=post-123'
        },
        locals: {
          runtime: {
            env: {
              DB: {
                prepare: vi.fn().mockReturnValue({
                  bind: vi.fn().mockReturnValue({
                    all: vi.fn().mockResolvedValue({ results: [] })
                  })
                })
              }
            }
          }
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/comments?postId=post-123')
      };
      
      // API-Aufruf
      await GET(context as any);
      
      // Überprüfen, ob Rate-Limiting angewendet wurde
      expect(rateLimiter.apiRateLimiter).toHaveBeenCalledWith(context);
    });
    
    it('sollte abbrechen, wenn Rate-Limiting ausgelöst wird', async () => {
      // Mock-Context
      const context = {
        request: {
          url: 'https://example.com/api/comments?postId=post-123'
        },
        locals: {
          runtime: {
            env: {
              DB: {}
            }
          }
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/comments?postId=post-123')
      };
      
      // Rate-Limiting-Antwort simulieren
      const rateLimitResponse = new Response(null, { 
        status: 429, 
        statusText: 'Too Many Requests'
      });
      vi.spyOn(rateLimiter, 'apiRateLimiter').mockResolvedValueOnce(rateLimitResponse);
      
      // API-Aufruf
      const response = await GET(context as any);
      
      // Überprüfen, ob die Rate-Limit-Antwort zurückgegeben wurde
      expect(response.status).toBe(429);
    });
    
    it('sollte Security-Headers auf Antworten anwenden', async () => {
      // Mock-Context
      const context = {
        request: {
          url: 'https://example.com/api/comments?postId=post-123'
        },
        locals: {
          runtime: {
            env: {
              DB: {
                prepare: vi.fn().mockReturnValue({
                  bind: vi.fn().mockReturnValue({
                    all: vi.fn().mockResolvedValue({ results: [] })
                  })
                })
              }
            }
          }
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/comments?postId=post-123')
      };
      
      // API-Aufruf
      await GET(context as any);
      
      // Überprüfen, ob Security-Headers angewendet wurden
      expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    });
  });
});
