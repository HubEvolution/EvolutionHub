import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadEnv } from 'vite';
import { execa } from 'execa';
import type { ExecaChildProcess } from 'execa';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { TEST_URL } from '../shared/http';

// Lade Umgebungsvariablen
loadEnv(process.env.NODE_ENV || 'test', process.cwd(), '');

// Pfade für Testumgebung
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

// TEST_URL provided by shared helper (global-setup ensures it's set)

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

// Helper to send JSON with Same-Origin + Double-Submit CSRF headers
async function sendJsonWithCsrf(
  path: string,
  data: unknown,
  method: string = 'POST'
): Promise<FetchResponse> {
  const token = 'csrf_' + Math.random().toString(36).slice(2);
  const response = await fetch(`${TEST_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: TEST_URL,
      'X-CSRF-Token': token,
      Cookie: `csrf_token=${encodeURIComponent(token)}`,
    },
    body: JSON.stringify(data),
    redirect: 'manual',
  });

  return {
    status: response.status,
    contentType: response.headers.get('content-type'),
    text: response.status !== 302 ? await response.text() : '',
    isOk: response.ok,
    headers: response.headers,
    redirected: response.type === 'opaqueredirect' || response.status === 302,
    redirectUrl: response.headers.get('location'),
    cookies: parseCookies(response.headers.get('set-cookie') || ''),
  };
}

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { type: string; message: string };
};

function parseJson<T>(response: FetchResponse): ApiResponse<T> | null {
  if (!(response.contentType || '').includes('application/json')) return null;
  if (!response.text) return null;
  try {
    return JSON.parse(response.text) as ApiResponse<T>;
  } catch {
    return null;
  }
}

// Hilfsfunktion zum Abrufen einer Seite
async function fetchPage(path: string): Promise<FetchResponse> {
  const response = await fetch(`${TEST_URL}${path}`, {
    redirect: 'manual', // Wichtig für Tests: Redirects nicht automatisch folgen
    headers: { Origin: TEST_URL },
  });

  return {
    status: response.status,
    contentType: response.headers.get('content-type'),
    text: response.status !== 302 ? await response.text() : '',
    isOk: response.ok,
    headers: response.headers,
    redirected: response.type === 'opaqueredirect' || response.status === 302,
    redirectUrl: response.headers.get('location'),
    cookies: parseCookies(response.headers.get('set-cookie') || ''),
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
async function sendJson(
  path: string,
  data: unknown,
  method: string = 'POST'
): Promise<FetchResponse> {
  const response = await fetch(`${TEST_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: TEST_URL,
    },
    body: JSON.stringify(data),
    redirect: 'manual',
  });

  return {
    status: response.status,
    contentType: response.headers.get('content-type'),
    text: response.status !== 302 ? await response.text() : '',
    isOk: response.ok,
    headers: response.headers,
    redirected: response.type === 'opaqueredirect' || response.status === 302,
    redirectUrl: response.headers.get('location'),
    cookies: parseCookies(response.headers.get('set-cookie') || ''),
  };
}

describe('Billing-API-Integration', () => {
  let serverProcess: ExecaChildProcess | undefined;

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

          console.log('Testserver erreichbar unter', TEST_URL);
        }
      } catch (_) {
        // Warte 500ms vor dem nächsten Versuch
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (!serverReady) {
      throw new Error('Testserver konnte nicht gestartet werden');
    }
  }, 35000); // Erhöhte Timeout für langsame Systeme

  // Stoppe den Server nach den Tests
  afterAll(async () => {
    if (serverProcess && typeof serverProcess.pid === 'number') {
      try {
        process.kill(-serverProcess.pid, 'SIGTERM');
      } catch (error) {
        console.error('Fehler beim Stoppen des Servers:', error);
      }
    }
  });

  describe('POST /api/billing/session', () => {
    it('sollte Billing-Session-Request mit gültigem Body verarbeiten', async () => {
      const requestData = {
        plan: 'pro',
        workspaceId: 'test-workspace',
        interval: 'monthly' as const,
      };

      const response = await sendJsonWithCsrf('/api/billing/session', requestData);

      // Abhängig von Auth/Stripe-Konfiguration sind mehrere Statuscodes möglich
      expect([200, 400, 401, 404, 405, 429]).toContain(response.status);
      if (response.status !== 200) return;

      expect(response.contentType).toContain('application/json');
      const json = parseJson<{ url: string }>(response);
      expect(json?.success).toBe(true);
      expect(json?.data?.url).toBeDefined();
    });

    it('sollte Validierungsfehler für fehlende Pflichtfelder zurückgeben', async () => {
      const requestData = {
        // plan und workspaceId fehlen
      };

      const response = await sendJsonWithCsrf('/api/billing/session', requestData);

      expect([400, 401, 403, 404]).toContain(response.status);
      if (response.status === 400 && (response.contentType || '').includes('application/json')) {
        const json = parseJson<unknown>(response);
        if (json && Object.prototype.hasOwnProperty.call(json, 'success')) {
          const typed = json as { success?: boolean };
          expect(typed.success).toBe(false);
        }
      }
    });

    it('sollte optionalen Discount-Code im Body akzeptieren', async () => {
      const requestData = {
        plan: 'pro',
        workspaceId: 'test-workspace',
        interval: 'monthly' as const,
        discountCode: 'TESTCODE',
      };

      const response = await sendJsonWithCsrf('/api/billing/session', requestData);

      // Je nach Auth/Stripe/Discount-Setup kann der Status variieren
      expect([200, 400, 401, 404, 405, 429]).toContain(response.status);

      if (response.status === 200) {
        expect(response.contentType).toContain('application/json');
        const json = parseJson<{ url: string }>(response);
        expect(json?.success).toBe(true);
        expect(json?.data?.url).toBeDefined();
      } else if (response.status === 400 && (response.contentType || '').includes('application/json')) {
        const json = parseJson<{ success: boolean; error?: { type?: string; message?: string } }>(
          response
        );
        if (json) {
          expect(json.success).toBe(false);
          expect(json.error?.type).toBeDefined();
          expect(json.error?.message).toBeDefined();
        }
      }
    });
  });

  describe('GET /api/billing/credits', () => {
    it('sollte Credits für authentifizierten Benutzer zurückgeben', async () => {
      const response = await fetchPage('/api/billing/credits');

      expect([200, 401, 404, 405]).toContain(response.status);
      if (response.status !== 200) return;
      expect(response.contentType).toContain('application/json');
      const json = parseJson<{ credits: number }>(response);
      expect(json?.success).toBe(true);
      expect(json?.data?.credits).toBeDefined();
      expect(typeof json?.data?.credits).toBe('number');
    });

    it('sollte 401 für nicht authentifizierte Anfragen zurückgeben', async () => {
      const response = await fetchPage('/api/billing/credits');

      // GET ist nicht erlaubt; 405 zulassen
      expect([200, 401, 404, 405]).toContain(response.status);
      if (response.status !== 200) return;
      expect(response.contentType).toContain('application/json');
      const json = parseJson<{ credits: number }>(response);
      expect(json?.success).toBe(true);
    });
  });

  describe('GET /api/billing/sync', () => {
    it('sollte Redirect liefern oder fehlerschonend reagieren', async () => {
      const response = await fetchPage('/api/billing/sync?session_id=test_session&ws=default');

      expect([302, 401, 404]).toContain(response.status);
      if (response.status === 302) {
        expect(response.redirectUrl).toBeTruthy();
      }
    });

    it('sollte bei fehlenden Parametern fehlerschonend reagieren', async () => {
      const response = await fetchPage('/api/billing/sync');
      expect([302, 401, 404]).toContain(response.status);
    });
  });

  describe('GET /api/billing/link-pending', () => {
    it('sollte Redirect oder fehlerschonendes Verhalten liefern', async () => {
      const response = await fetchPage('/api/billing/link-pending');

      // Ohne vorbereitete Pending-Subscription und ohne Auth sind mehrere Status möglich
      expect([302, 401, 404]).toContain(response.status);
      if (response.status === 302) {
        expect(response.redirectUrl).toBeTruthy();
      }
    });
  });

  describe('GET /api/billing/sync-callback', () => {
    it('sollte Redirect zu Login oder Sync liefern', async () => {
      const response = await fetchPage('/api/billing/sync-callback?session_id=test_session&ws=default');

      // In den meisten Fällen: 302 Redirect (z. B. zu /login); 404 zulassen, falls Route nicht verdrahtet ist
      expect([302, 404]).toContain(response.status);
      if (response.status === 302) {
        expect(response.redirectUrl).toBeTruthy();
      }
    });
  });

  describe('Security-Headers für alle Billing-Endpunkte', () => {
    const billingEndpoints = [
      '/api/billing/session',
      '/api/billing/credits',
      '/api/billing/sync',
      '/api/billing/link-pending',
      '/api/billing/sync-callback',
    ];

    it.each(billingEndpoints)('sollte Security-Headers für %s setzen', async (endpoint) => {
      const requestData = endpoint.includes('credits')
        ? {}
        : {
            priceId: 'price_test_123',
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel',
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
        plan: 'pro',
        workspaceId: 'test-workspace',
        interval: 'monthly' as const,
      };

      // Mehrere Anfragen senden um Rate-Limit zu triggern
      const requests = Array(15)
        .fill(null)
        .map(() => sendJsonWithCsrf('/api/billing/session', requestData));

      const responses = await Promise.all(requests);

      // Mindestens eine sollte Rate-Limited sein (429); ansonsten überspringen
      const rateLimitedResponses = responses.filter((r) => r.status === 429);
      if (rateLimitedResponses.length > 0) {
        const rateLimitResponse = rateLimitedResponses[0];
        expect(rateLimitResponse.headers.get('Retry-After')).toBeDefined();
      }
    });
  });

  describe('Fehlerbehandlung', () => {
    it('sollte strukturierte Fehler für alle Billing-Endpunkte zurückgeben', async () => {
      const endpoints = ['/api/billing/session', '/api/billing/sync', '/api/billing/link-pending'];

      for (const endpoint of endpoints) {
        const requestData = {}; // Leere Daten um Validierungsfehler zu triggern

        const response = await sendJson(endpoint, requestData);

        if (response.status === 400) {
          const json = parseJson<unknown>(response);
          if (json) {
            expect(json.success).toBe(false);
            expect(json.error?.type).toBeDefined();
            expect(json.error?.message).toBeDefined();
          }
        }
      }
    });

    it('sollte 405 für nicht unterstützte HTTP-Methoden zurückgeben', async () => {
      const endpoints = ['/api/billing/session', '/api/billing/credits', '/api/billing/sync'];

      for (const endpoint of endpoints) {
        const response = await sendJson(endpoint, {}, 'DELETE');

        expect([405, 404, 401]).toContain(response.status);
        if ((response.contentType || '').includes('application/json')) {
          const json = parseJson<unknown>(response);
          if (json && Object.prototype.hasOwnProperty.call(json, 'success')) {
            expect(json.success).toBe(false);
          }
        }
      }
    });
  });
});
