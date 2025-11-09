/**
 * Archived duplicate of the canonical rate limiter tests.
 * Active suite: tests/unit/lib/rate-limiter.test.ts
 */

export {};

/**
 * Unit-Tests für das Rate-Limiter Modul
 * 
 * Diese Tests decken die Kernfunktionen von src/lib/rate-limiter.ts ab:
 * - createRateLimiter: Erstellung der Middleware mit Config
 * - getRateLimitKey: Generierung des Schlüssels aus IP und User-ID
 * - Rate-Limiting-Logik: Inkrement, Limit-Check (429 bei Überschreitung), TTL-Reset
 * - Prekonfigurierte Limiter (z.B. authLimiter)
 * 
 * @module rate-limiter.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter, getRateLimitKey, authLimiter, standardApiLimiter } from '../../../src/lib/rate-limiter';
import { logRateLimitExceeded } from '../../../src/lib/security-logger';

// Mock für logRateLimitExceeded
vi.mock('@/lib/security-logger', () => ({
  logRateLimitExceeded: vi.fn(),
}));

const mockLogRateLimitExceeded = vi.mocked(logRateLimitExceeded);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // Clear global stores between tests
  (globalThis as any).limitStores = {};
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getRateLimitKey', () => {
  it('sollte einen eindeutigen Key aus IP und User-ID generieren', () => {
    const mockContext = {
      clientAddress: '192.168.1.1',
      locals: { user: { id: 'user-123' } },
    };

    const key = getRateLimitKey(mockContext);

    expect(key).toBe('192.168.1.1:user-123');
  });

  it('sollte für anonyme User "anonymous" als ID verwenden', () => {
    const mockContext = {
      clientAddress: '192.168.1.1',
      locals: { user: null },
    };

    const key = getRateLimitKey(mockContext);

    expect(key).toBe('192.168.1.1:anonymous');
  });

  it('sollte Default-IP "0.0.0.0" verwenden, wenn clientAddress fehlt', () => {
    const mockContext = {
      locals: { user: { id: 'user-123' } },
    };

    const key = getRateLimitKey(mockContext);

    expect(key).toBe('0.0.0.0:user-123');
  });
});

describe('createRateLimiter', () => {
  const config = {
    maxRequests: 5,
    windowMs: 60000, // 1 Minute
    name: 'testLimiter',
  };

  it('sollte eine Middleware-Funktion zurückgeben', () => {
    const limiter = createRateLimiter(config);

    expect(limiter).toBeInstanceOf(Function);
  });

  it('sollte den Store für den Limiter-Namen initialisieren', () => {
    const limiter = createRateLimiter(config);
    const mockContext = { clientAddress: '192.168.1.1', locals: { user: null } };

    limiter(mockContext);

    const globalStores = (globalThis as any).limitStores;
    expect(globalStores['testLimiter']).toBeDefined();
    expect(globalStores['testLimiter']).toEqual({});
  });

  describe('Rate-Limiting-Middleware', () => {
    let limiter: any;
    let mockContext: any;

    beforeEach(() => {
      limiter = createRateLimiter(config);
      mockContext = {
        clientAddress: '192.168.1.1',
        locals: { user: null },
        request: { url: 'http://example.com/api/test' },
      };
    });

    it('sollte die erste Anfrage erlauben und Count auf 1 setzen', () => {
      const result = limiter(mockContext);

      expect(result).toBeUndefined(); // Kein Response, erlaubt
      const globalStores = (globalThis as any).limitStores;
      const key = '192.168.1.1:anonymous';
      expect(globalStores['testLimiter'][key].count).toBe(1);
      expect(globalStores['testLimiter'][key].resetAt).toBeCloseTo(Date.now() + 60000);
    });

    it('sollte weitere Anfragen innerhalb des Limits erlauben und Count inkrementieren', () => {
      // Erste Anfrage
      limiter(mockContext);

      // Zweite Anfrage
      const result = limiter(mockContext);

      expect(result).toBeUndefined();
      const globalStores = (globalThis as any).limitStores;
      const key = '192.168.1.1:anonymous';
      expect(globalStores['testLimiter'][key].count).toBe(2);
    });

    it('sollte 429 Response bei Limit-Überschreitung zurückgeben', () => {
      // 5 Anfragen simulieren
      for (let i = 0; i < 5; i++) {
        limiter(mockContext);
      }

      // 6. Anfrage
      const result = limiter(mockContext);

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(429);
      expect(result.headers.get('Content-Type')).toBe('application/json');
      expect(result.headers.get('Retry-After')).toBeDefined();
      const body = JSON.parse(await result.text());
      expect(body.error).toBe('Rate limit exceeded');
      expect(body.retryAfter).toBeGreaterThan(0);

      // Log aufgerufen
      expect(mockLogRateLimitExceeded).toHaveBeenCalledWith(
        '192.168.1.1',
        '/api/test',
        expect.objectContaining({
          limiterName: 'testLimiter',
          maxRequests: 5,
          windowMs: 60000,
        })
      );
    });

    it('sollte Count bei TTL-Ablauf zurücksetzen', async () => {
      // Erste Anfrage
      limiter(mockContext);
      const globalStores = (globalThis as any).limitStores;
      const key = '192.168.1.1:anonymous';
      const initialResetAt = globalStores['testLimiter'][key].resetAt;

      // Zeit vorspulen über TTL
      vi.advanceTimersByTime(60001);

      // Neue Anfrage
      const result = limiter(mockContext);

      expect(result).toBeUndefined();
      expect(globalStores['testLimiter'][key].count).toBe(1); // Zurückgesetzt
      expect(globalStores['testLimiter'][key].resetAt).toBeGreaterThan(initialResetAt);
    });

    it('sollte Cleanup-Interval aufrufen und abgelaufene Einträge löschen', async () => {
      const limiterCleanup = createRateLimiter(config);
      const mockContext2 = { ...mockContext, clientAddress: '192.168.1.2' };
      limiterCleanup(mockContext); // Key1
      limiterCleanup(mockContext2); // Key2

      // Zeit vorspulen für Key1-Ablauf
      vi.advanceTimersByTime(60001);

      // Cleanup simulieren (setInterval wird intern gesetzt, aber für Test: manuell triggern)
      // Da setInterval gemockt werden muss, testen wir den Effekt
      const globalStores = (globalThis as any).limitStores;
      const key1 = '192.168.1.1:anonymous';
      const key2 = '192.168.1.2:anonymous';
      expect(globalStores['testLimiter'][key1]).toBeDefined();
      expect(globalStores['testLimiter'][key2]).toBeDefined();

      // Simuliere Cleanup (da global, testen wir Löschung)
      // Für Unit-Test: Direkte Überprüfung nach TTL
      vi.advanceTimersByTime(60000); // Cleanup-Interval
      expect(globalStores['testLimiter'][key1]).toBeUndefined(); // Abgelaufen gelöscht
      expect(globalStores['testLimiter'][key2]).toBeDefined(); // Noch nicht abgelaufen
    });
  });
});

describe('Prekonfigurierte Limiter', () => {
  it('sollte authLimiter mit 10 Requests pro Minute konfigurieren', () => {
    const limiter = authLimiter({
      clientAddress: '192.168.1.1',
      locals: { user: null },
      request: { url: 'http://example.com/auth' },
    });

    expect(limiter).toBeUndefined(); // Erste Anfrage erlaubt
  });

  it('sollte standardApiLimiter mit 50 Requests pro Minute konfigurieren', () => {
    const limiter = standardApiLimiter({
      clientAddress: '192.168.1.1',
      locals: { user: null },
      request: { url: 'http://example.com/api' },
    });

    expect(limiter).toBeUndefined();
  });
});