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
      'Origin': TEST_URL
    },
    body: body.toString(),
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

describe('Lead-Magnet-API-Integration', () => {
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

  describe('POST /api/lead-magnets/download', () => {
    it('sollte erfolgreich Lead-Magnet-Download initiieren', async () => {
      const formData = {
        email: 'lead-magnet-test@example.com',
        name: 'Lead Magnet Test User',
        magnetId: 'ki-tools-checkliste-2025'
      };

      const response = await submitForm('/api/lead-magnets/download', formData);

      expect(response.status).toBe(200);
      expect(response.contentType).toContain('application/json');
      const json = JSON.parse(response.text);
      expect(json.success).toBe(true);
      expect(json.data.downloadUrl).toBeDefined();
      expect(json.data.downloadUrl).toContain('r2');
    });

    it('sollte Rate-Limiting korrekt handhaben', async () => {
      const formData = {
        email: 'ratelimit-lead@example.com',
        name: 'Rate Limit Lead Test',
        magnetId: 'ki-tools-checkliste-2025'
      };

      // Mehrere Anfragen senden um Rate-Limit zu triggern
      const requests = Array(15).fill(null).map(() =>
        submitForm('/api/lead-magnets/download', formData)
      );

      const responses = await Promise.all(requests);

      // Mindestens eine sollte Rate-Limited sein (429)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Rate-Limit Response sollte Retry-After Header haben
      const rateLimitResponse = rateLimitedResponses[0];
      expect(rateLimitResponse.headers.get('Retry-After')).toBeDefined();
    });

    it('sollte Validierungsfehler für ungültige E-Mail zurückgeben', async () => {
      const formData = {
        email: 'invalid-email-format',
        name: 'Test User',
        magnetId: 'ki-tools-checkliste-2025'
      };

      const response = await submitForm('/api/lead-magnets/download', formData);

      expect(response.status).toBe(400);
      const json = JSON.parse(response.text);
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('VALIDATION_ERROR');
    });

    it('sollte Validierungsfehler für fehlende E-Mail zurückgeben', async () => {
      const formData = {
        name: 'Test User',
        magnetId: 'ki-tools-checkliste-2025'
        // email fehlt
      };

      const response = await submitForm('/api/lead-magnets/download', formData);

      expect(response.status).toBe(400);
      const json = JSON.parse(response.text);
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('VALIDATION_ERROR');
    });

    it('sollte Validierungsfehler für fehlende magnetId zurückgeben', async () => {
      const formData = {
        email: 'test@example.com',
        name: 'Test User'
        // magnetId fehlt
      };

      const response = await submitForm('/api/lead-magnets/download', formData);

      expect(response.status).toBe(400);
      const json = JSON.parse(response.text);
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('VALIDATION_ERROR');
    });

    it('sollte Validierungsfehler für nicht existierende magnetId zurückgeben', async () => {
      const formData = {
        email: 'test@example.com',
        name: 'Test User',
        magnetId: 'non-existent-magnet'
      };

      const response = await submitForm('/api/lead-magnets/download', formData);

      expect(response.status).toBe(400);
      const json = JSON.parse(response.text);
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('VALIDATION_ERROR');
    });

    it('sollte 405 für GET-Methode zurückgeben', async () => {
      const response = await fetchPage('/api/lead-magnets/download');

      expect(response.status).toBe(405);
      const json = JSON.parse(response.text);
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('METHOD_NOT_ALLOWED');
    });

    it('sollte CSRF-Schutz korrekt handhaben', async () => {
      const formData = {
        email: 'csrf-lead-test@example.com',
        name: 'CSRF Lead Test',
        magnetId: 'ki-tools-checkliste-2025'
      };

      // Ohne CSRF-Token senden
      const response = await fetch(`${TEST_URL}/api/lead-magnets/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': TEST_URL
        },
        body: new URLSearchParams(formData).toString(),
        redirect: 'manual'
      });

      expect(response.status).toBe(400);
      const json = JSON.parse(response.text);
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('CSRF_INVALID');
    });

    it('sollte Security-Headers setzen', async () => {
      const formData = {
        email: 'headers-lead-test@example.com',
        name: 'Headers Lead Test',
        magnetId: 'ki-tools-checkliste-2025'
      };

      const response = await submitForm('/api/lead-magnets/download', formData);

      // Prüfe wichtige Security-Headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Content-Security-Policy')).toBeDefined();
    });

    it('sollte Audit-Logging für erfolgreiche Downloads durchführen', async () => {
      const formData = {
        email: 'audit-lead-test@example.com',
        name: 'Audit Lead Test',
        magnetId: 'ki-tools-checkliste-2025'
      };

      const response = await submitForm('/api/lead-magnets/download', formData);

      expect(response.status).toBe(200);
      const json = JSON.parse(response.text);
      expect(json.success).toBe(true);

      // Prüfe strukturierte Response
      expect(json.data.downloadUrl).toBeDefined();
      expect(json.data.expiresAt).toBeDefined();
    });

    it('sollte verschiedene Lead-Magnet-IDs unterstützen', async () => {
      const testMagnets = [
        'ki-tools-checkliste-2025',
        'new-work-transformation-guide',
        'produktivitaets-masterclass'
      ];

      for (const magnetId of testMagnets) {
        const formData = {
          email: `test-${magnetId}@example.com`,
          name: `Test User for ${magnetId}`,
          magnetId: magnetId
        };

        const response = await submitForm('/api/lead-magnets/download', formData);

        expect(response.status).toBe(200);
        const json = JSON.parse(response.text);
        expect(json.success).toBe(true);
        expect(json.data.downloadUrl).toBeDefined();
      }
    });
  });
});