import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadEnv } from 'vite';
import { execa } from 'execa';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

// Lade Umgebungsvariablen
loadEnv(process.env.NODE_ENV || 'test', process.cwd(), '');

// Pfade für Testumgebung
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

// Test-Server-URL (Cloudflare Wrangler default: 8787). Prefer TEST_BASE_URL from global-setup
const TEST_URL = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

// Interface für HTTP-Response
interface FetchResponse {
  status: number;
  contentType: string | null;
  text: string;
  isOk: boolean;
  headers: Headers;
  redirected: boolean;
  redirectUrl: string | null;
  cookies: Record<string, string>;
}

// Hilfsfunktion zum Abrufen einer Seite
async function fetchPage(path: string): Promise<FetchResponse> {
  const response = await fetch(`${TEST_URL}${path}`, {
    redirect: 'manual' // Wichtig für Tests: Redirects nicht automatisch folgen
  });

  return {
    status: response.status,
    contentType: response.headers.get('content-type'),
    text: response.status !== 302 ? await response.text() : '',
    isOk: response.ok,
    headers: response.headers,
    redirected: response.type === 'opaqueredirect' || response.status === 302,
    redirectUrl: response.headers.get('location'),
    cookies: parseCookies(response.headers.get('set-cookie') || '')
  };
}

// Hilfsfunktion zum Parsen von Cookies aus dem Set-Cookie-Header
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) return cookies;

  const cookiePairs = cookieHeader.split(', ');
  for (const pair of cookiePairs) {
    const [name, ...rest] = pair.split('=');
    const value = rest.join('=').split(';')[0];
    cookies[name.trim()] = value.trim();
  }

  return cookies;
}

// Hilfsfunktion zum Senden von JSON-Daten
async function sendJson(path: string, data: any, method: string = 'POST'): Promise<FetchResponse> {
  const response = await fetch(`${TEST_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Origin': TEST_URL
    },
    body: JSON.stringify(data),
    redirect: 'manual'
  });

  return {
    status: response.status,
    contentType: response.headers.get('content-type'),
    text: response.status !== 302 ? await response.text() : '',
    isOk: response.ok,
    headers: response.headers,
    redirected: response.type === 'opaqueredirect' || response.status === 302,
    redirectUrl: response.headers.get('location'),
    cookies: parseCookies(response.headers.get('set-cookie') || '')
  };
}

describe('Billing-API-Integration', () => {
  let serverProcess: any;

  // Starte den Entwicklungsserver vor den Tests (falls nicht durch Global-Setup vorgegeben)
  beforeAll(async () => {
    const externalServer = !!process.env.TEST_BASE_URL;
    if (!externalServer) {
      // Starte den Cloudflare-Entwicklungsserver (Wrangler)
      serverProcess = execa('npm', ['run', 'dev'], {
        cwd: rootDir,
        env: { ...process.env, NODE_ENV: 'test' },
        detached: false,
      });
    }

    // Warte bis der Server erreichbar ist (max. 30 Sekunden)
    const maxWaitTime = 30000; // 30 Sekunden
    const startTime = Date.now();
    let serverReady = false;

    while (!serverReady && Date.now() - startTime < maxWaitTime) {
      try {
        const response = await fetch(TEST_URL);
        if (response.ok || response.status === 302) {
          serverReady = true;
          // eslint-disable-next-line no-console
          console.log('Testserver erreichbar unter', TEST_URL);
        }
      } catch (_) {
        // Warte 500ms vor dem nächsten Versuch
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (!serverReady) {
      throw new Error('Testserver konnte nicht gestartet werden');
    }
  }, 35000); // Erhöhte Timeout für langsame Systeme

  // Stoppe den Server nach den Tests
  afterAll(async () => {
    if (serverProcess) {
      try {
        process.kill(-serverProcess.pid, 'SIGTERM');
      } catch (error) {
        console.error('Fehler beim Stoppen des Servers:', error);
      }
    }
  });

  describe('POST /api/billing/session', () => {
    it('sollte erfolgreich Billing-Session erstellen', async () => {
      const requestData = {
        priceId: 'price_test_123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      };

      const response = await sendJson('/api/billing/session', requestData);

      expect(response.status).toBe(200);
      expect(response.contentType).toContain('application/json');
      const json = JSON.parse(response.text);
      expect(json.success).toBe(true);
      expect(json.data.sessionId).toBeDefined();
      expect(json.data.url).toBeDefined();
    });

    it('sollte Validierungsfehler für fehlende priceId zurückgeben', async () => {
      const requestData = {
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
        // priceId fehlt
      };

      const response = await sendJson('/api/billing/session', requestData);

      expect(response.status).toBe(400);
      const json = JSON.parse(response.text);
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('VALIDATION_ERROR');
    });

    it('sollte 401 für nicht authentifizierte Anfragen zurückgeben', async () => {
      const requestData = {
        priceId: 'price_test_123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      };

      const response = await sendJson('/api/billing/session', requestData);

      expect(response.status).toBe(401);
      const json = JSON.parse(response.text);
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/billing/credits', () => {
    it('sollte Credits für authentifizierten Benutzer zurückgeben', async () => {
      const response = await fetchPage('/api/billing/credits');

      expect(response.status).toBe(200);
      expect(response.contentType).toContain('application/json');
      const json = JSON.parse(response.text);
      expect(json.success).toBe(true);
      expect(json.data.credits).toBeDefined();
      expect(typeof json.data.credits).toBe('number');
    });

    it('sollte 401 für nicht authentifizierte Anfragen zurückgeben', async () => {
      const response = await fetchPage('/api/billing/credits');

      expect(response.status).toBe(401);
      const json = JSON.parse(response.text);
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/billing/sync', () => {
    it('sollte erfolgreich Billing-Daten synchronisieren', async () => {
      const requestData = {
        subscriptionId: 'sub_test_123',
        customerId: 'cus_test_456'
      };

      const response = await sendJson('/api/billing/sync', requestData);

      expect(response.status).toBe(200);
      expect(response.contentType).toContain('application/json');
      const json = JSON.parse(response.text);
      expect(json.success).toBe(true);
      expect(json.data.message).toContain('successfully');
    });

    it('sollte 401 für nicht authentifizierte Anfragen zurückgeben', async () => {
      const requestData = {
        subscriptionId: 'sub_test_123',
        customerId: 'cus_test_456'
      };

      const response = await sendJson('/api/billing/sync', requestData);

      expect(response.status).toBe(401);
      const json = JSON.parse(response.text);
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/billing/link-pending', () => {
    it('sollte erfolgreich pending Payment-Link erstellen', async () => {
      const requestData = {
        priceId: 'price_test_123',
        email: 'customer@example.com'
      };

      const response = await sendJson('/api/billing/link-pending', requestData);

      expect(response.status).toBe(200);
      expect(response.contentType).toContain('application/json');
      const json = JSON.parse(response.text);
      expect(json.success).toBe(true);
      expect(json.data.paymentLink).toBeDefined();
    });

    it('sollte Validierungsfehler für ungültige E-Mail zurückgeben', async () => {
      const requestData = {
        priceId: 'price_test_123',
        email: 'invalid-email'
      };

      const response = await sendJson('/api/billing/link-pending', requestData);

      expect(response.status).toBe(400);
      const json = JSON.parse(response.text);
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/billing/sync-callback', () => {
    it('sollte erfolgreich Sync-Callback verarbeiten', async () => {
      const requestData = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test_123',
            customer: 'cus_test_456',
            subscription: 'sub_test_789'
          }
        }
      };

      const response = await sendJson('/api/billing/sync-callback', requestData);

      expect(response.status).toBe(200);
      expect(response.contentType).toContain('application/json');
      const json = JSON.parse(response.text);
      expect(json.success).toBe(true);
    });

    it('sollte verschiedene Webhook-Events verarbeiten', async () => {
      const events = [
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.payment_succeeded',
        'invoice.payment_failed'
      ];

      for (const eventType of events) {
        const requestData = {
          type: eventType,
          data: {
            object: {
              id: `${eventType.replace('.', '_')}_test`,
              customer: 'cus_test_456'
            }
          }
        };

        const response = await sendJson('/api/billing/sync-callback', requestData);

        expect(response.status).toBe(200);
        const json = JSON.parse(response.text);
        expect(json.success).toBe(true);
      }
    });
  });

  describe('Security-Headers für alle Billing-Endpunkte', () => {
    const billingEndpoints = [
      '/api/billing/session',
      '/api/billing/credits',
      '/api/billing/sync',
      '/api/billing/link-pending',
      '/api/billing/sync-callback'
    ];

    it.each(billingEndpoints)('sollte Security-Headers für %s setzen', async (endpoint) => {
      const requestData = endpoint.includes('credits') ? {} : {
        priceId: 'price_test_123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      };

      const response = await sendJson(endpoint, requestData);

      // Prüfe wichtige Security-Headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Content-Security-Policy')).toBeDefined();
    });
  });

  describe('Rate-Limiting für Billing-Endpunkte', () => {
    it('sollte Rate-Limiting für Billing-Session korrekt handhaben', async () => {
      const requestData = {
        priceId: 'price_test_123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      };

      // Mehrere Anfragen senden um Rate-Limit zu triggern
      const requests = Array(15).fill(null).map(() =>
        sendJson('/api/billing/session', requestData)
      );

      const responses = await Promise.all(requests);

      // Mindestens eine sollte Rate-Limited sein (429)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Rate-Limit Response sollte Retry-After Header haben
      const rateLimitResponse = rateLimitedResponses[0];
      expect(rateLimitResponse.headers.get('Retry-After')).toBeDefined();
    });
  });

  describe('Fehlerbehandlung', () => {
    it('sollte strukturierte Fehler für alle Billing-Endpunkte zurückgeben', async () => {
      const endpoints = [
        '/api/billing/session',
        '/api/billing/sync',
        '/api/billing/link-pending'
      ];

      for (const endpoint of endpoints) {
        const requestData = {}; // Leere Daten um Validierungsfehler zu triggern

        const response = await sendJson(endpoint, requestData);

        if (response.status === 400) {
          const json = JSON.parse(response.text);
          expect(json.success).toBe(false);
          expect(json.error.type).toBeDefined();
          expect(json.error.message).toBeDefined();
        }
      }
    });

    it('sollte 405 für nicht unterstützte HTTP-Methoden zurückgeben', async () => {
      const endpoints = [
        '/api/billing/session',
        '/api/billing/credits',
        '/api/billing/sync'
      ];

      for (const endpoint of endpoints) {
        const response = await sendJson(endpoint, {}, 'DELETE');

        expect(response.status).toBe(405);
        const json = JSON.parse(response.text);
        expect(json.success).toBe(false);
        expect(json.error.type).toBe('METHOD_NOT_ALLOWED');
      }
    });
  });
});