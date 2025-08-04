import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GET } from './tools';
import * as rateLimiter from '@/lib/rate-limiter';
import * as securityHeaders from '@/lib/security-headers';
import * as securityLogger from '@/lib/security-logger';
import * as handlers from '../../lib/handlers';

describe('Tools API Tests', () => {
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
    
    // Mock für die listTools-Funktion
    vi.mock('../../lib/handlers.ts', () => ({
      listTools: vi.fn().mockResolvedValue(
        new Response(JSON.stringify([
          { id: 'tool1', name: 'Tool 1', description: 'Description 1' },
          { id: 'tool2', name: 'Tool 2', description: 'Description 2' }
        ]), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    }));
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('sollte eine Liste von Tools zurückgeben', async () => {
    // Mock-Context
    const context = {
      request: {
        url: 'https://example.com/api/tools'
      },
      locals: {
        runtime: {
          env: {}
        }
      },
      clientAddress: '192.168.1.1',
      url: new URL('https://example.com/api/tools')
    };
    
    // API-Aufruf
    const response = await GET(context as any);
    
    // Überprüfungen
    expect(response.status).toBe(200);
    
    // Response-Body überprüfen
    const responseText = await response.text();
    const responseData = JSON.parse(responseText);
    expect(responseData).toEqual([
      { id: 'tool1', name: 'Tool 1', description: 'Description 1' },
      { id: 'tool2', name: 'Tool 2', description: 'Description 2' }
    ]);
    
    // Überprüfen, ob listTools aufgerufen wurde
    expect(handlers.listTools).toHaveBeenCalledWith(context);
    
    // Überprüfen, ob Security-Features angewendet wurden
    expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
    expect(securityLogger.logApiAccess).toHaveBeenCalledWith(
      '192.168.1.1',
      '192.168.1.1',
      expect.objectContaining({
        endpoint: '/api/tools',
        method: 'GET',
        action: 'list_tools'
      })
    );
  });

  it('sollte 500 zurückgeben, wenn ein Fehler auftritt', async () => {
    // Mock für listTools mit Fehler
    vi.mocked(handlers.listTools).mockRejectedValueOnce(new Error('Test error'));
    
    // Mock-Context
    const context = {
      request: {
        url: 'https://example.com/api/tools'
      },
      locals: {
        runtime: {
          env: {}
        }
      },
      clientAddress: '192.168.1.1',
      url: new URL('https://example.com/api/tools')
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
        endpoint: '/api/tools',
        details: 'Test error'
      })
    );
    
    // Spy zurücksetzen
    consoleErrorSpy.mockRestore();
  });

  // Tests für Security-Features
  describe('Security-Features', () => {
    it('sollte Rate-Limiting anwenden', async () => {
      // Mock-Context
      const context = {
        request: {
          url: 'https://example.com/api/tools'
        },
        locals: {
          runtime: {
            env: {}
          }
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/tools')
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
          url: 'https://example.com/api/tools'
        },
        locals: {
          runtime: {
            env: {}
          }
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/tools')
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
          url: 'https://example.com/api/tools'
        },
        locals: {
          runtime: {
            env: {}
          }
        },
        clientAddress: '192.168.1.1',
        url: new URL('https://example.com/api/tools')
      };
      
      // API-Aufruf
      const response = await GET(context as any);
      
      // Überprüfen, ob Security-Headers angewendet wurden
      expect(securityHeaders.applySecurityHeaders).toHaveBeenCalled();
      
      // Überprüfen, ob die Header gesetzt wurden
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
    });
  });
});
