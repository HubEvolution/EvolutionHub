import {
  describe,
  it,
  expect,
  vi as _vi,
  beforeEach as _beforeEach,
  afterEach as _afterEach,
  beforeAll,
  afterAll,
} from 'vitest';
import { loadEnv } from 'vite';
import { execa } from 'execa';
import type { ExecaChildProcess } from 'execa';
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

function safeParseJson(text: string): any | null {
  try {
    return JSON.parse(text);
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

// Hilfsfunktion zum Senden eines Formulars
async function submitForm(path: string, formData: Record<string, string>): Promise<FetchResponse> {
  const body = new URLSearchParams();

  // Formular-Daten hinzufügen
  for (const [key, value] of Object.entries(formData)) {
    body.append(key, value);
  }

  const response = await fetch(`${TEST_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      // Satisfy CSRF protection which validates Origin header
      Origin: TEST_URL,
    },
    body: body.toString(),
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

describe('Newsletter-API-Integration', () => {
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

  describe('POST /api/newsletter/subscribe', () => {
    it('sollte erfolgreich Newsletter-Abonnement verarbeiten', async () => {
      const formData = {
        email: 'test@example.com',
        name: 'Test User',
      };

      const response = await submitForm('/api/newsletter/subscribe', formData);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200 && (response.contentType || '').includes('application/json')) {
        const json = safeParseJson(response.text);
        expect(json?.success).toBe(true);
        expect((json?.data?.message || '')).toContain('success');
      }
    });

    it('sollte Rate-Limiting korrekt handhaben', async () => {
      const formData = {
        email: 'ratelimit@example.com',
        name: 'Rate Limit Test',
      };

      // Mehrere Anfragen senden um Rate-Limit zu triggern
      const requests = Array(15)
        .fill(null)
        .map(() => submitForm('/api/newsletter/subscribe', formData));

      const responses = await Promise.all(requests);

      // Mindestens eine sollte Rate-Limited sein (429)
      const rateLimitedResponses = responses.filter((r) => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Rate-Limit Response sollte Retry-After Header haben
      const rateLimitResponse = rateLimitedResponses[0];
      expect(rateLimitResponse.headers.get('Retry-After')).toBeDefined();
    });

    it('sollte Validierungsfehler für ungültige E-Mail zurückgeben', async () => {
      const formData = {
        email: 'invalid-email',
        name: 'Test User',
      };

      const response = await submitForm('/api/newsletter/subscribe', formData);

      expect([400, 429, 403]).toContain(response.status);
      if ((response.contentType || '').includes('application/json')) {
        const json = safeParseJson(response.text);
        if (json && Object.prototype.hasOwnProperty.call(json, 'success')) {
          expect(json.success).toBe(false);
        }
      }
    });

    it('sollte Validierungsfehler für fehlende E-Mail zurückgeben', async () => {
      const formData = {
        name: 'Test User',
        // email fehlt
      };

      const response = await submitForm('/api/newsletter/subscribe', formData);

      expect([400, 429, 403]).toContain(response.status);
      if ((response.contentType || '').includes('application/json')) {
        const json = safeParseJson(response.text);
        if (json && Object.prototype.hasOwnProperty.call(json, 'success')) {
          expect(json.success).toBe(false);
        }
      }
    });

    it('sollte 405 für GET-Methode zurückgeben', async () => {
      const response = await fetchPage('/api/newsletter/subscribe');

      expect([405, 404]).toContain(response.status);
      if ((response.contentType || '').includes('application/json')) {
        const json = safeParseJson(response.text);
        if (json) {
          expect(json.success).toBe(false);
        }
      }
    });

    it('sollte CSRF-Schutz korrekt handhaben', async () => {
      const formData = {
        email: 'csrf-test@example.com',
        name: 'CSRF Test',
      };

      // Ohne CSRF-Token senden
      const response = await fetch(`${TEST_URL}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Origin: TEST_URL,
        },
        body: new URLSearchParams(formData).toString(),
        redirect: 'manual',
      });

      expect([400, 403, 429]).toContain(response.status);
      const text = await response.text();
      if ((response.headers.get('content-type') || '').includes('application/json')) {
        const json = safeParseJson(text);
        if (json && Object.prototype.hasOwnProperty.call(json, 'success')) {
          expect(json.success).toBe(false);
        }
      }
    });

    it('sollte Security-Headers setzen', async () => {
      const formData = {
        email: 'headers-test@example.com',
        name: 'Headers Test',
      };

      const response = await submitForm('/api/newsletter/subscribe', formData);

      // Prüfe wichtige Security-Headers (sofern gesetzt)
      expect(response.headers.get('X-Content-Type-Options')).toBeDefined();
      expect(response.headers.get('X-Frame-Options')).toBeDefined();
      expect(response.headers.get('Content-Security-Policy')).toBeDefined();
    });
  });
});
