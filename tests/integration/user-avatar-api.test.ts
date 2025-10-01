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

// Hilfsfunktion zum Erstellen von Multipart-Form-Data für Datei-Uploads
async function createMultipartRequest(path: string, fileContent: string, fileName: string, options: RequestInit = {}) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substr(2, 9);
  const bodyParts = [];

  // CSRF-Token hinzufügen
  if (options.headers && 'X-CSRF-Token' in options.headers) {
    bodyParts.push(`--${boundary}\r\n`);
    bodyParts.push('Content-Disposition: form-data; name="csrf_token"\r\n\r\n');
    bodyParts.push(options.headers['X-CSRF-Token']);
    bodyParts.push('\r\n');
  }

  // Datei hinzufügen
  bodyParts.push(`--${boundary}\r\n`);
  bodyParts.push(`Content-Disposition: form-data; name="avatar"; filename="${fileName}"\r\n`);
  bodyParts.push('Content-Type: image/jpeg\r\n\r\n');
  bodyParts.push(fileContent);
  bodyParts.push('\r\n');
  bodyParts.push(`--${boundary}--\r\n`);

  const body = bodyParts.join('');

  const headers = new Headers({
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Origin': TEST_URL,
    ...options.headers
  });

  return fetch(`${TEST_URL}${path}`, {
    method: 'POST',
    headers,
    body,
    credentials: 'include',
    redirect: 'manual'
  });
}

describe('User-Avatar-API-Integration', () => {
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

  describe('POST /api/user/avatar', () => {
    it('sollte erfolgreich Avatar hochladen für authentifizierten Benutzer', async () => {
      const validImageContent = 'fake-image-content';
      const csrfToken = 'valid-csrf-token-for-avatar';

      const response = await createMultipartRequest('/api/user/avatar', validImageContent, 'test-avatar.jpg', {
        headers: {
          'X-CSRF-Token': csrfToken,
          'Cookie': `csrf_token=${csrfToken}; session_id=valid-session`
        }
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.message).toContain('successfully');
    });

    it('sollte Rate-Limiting für Avatar-Uploads korrekt handhaben', async () => {
      const validImageContent = 'fake-image-content-for-rate-limit';
      const csrfToken = 'valid-csrf-token-rate-limit';

      // Mehrere Anfragen senden um Rate-Limit zu triggern (Avatar-Limit ist 5/Minute)
      const requests = Array(8).fill(null).map((_, index) =>
        createMultipartRequest('/api/user/avatar', `${validImageContent}-${index}`, `test-avatar-${index}.jpg`, {
          headers: {
            'X-CSRF-Token': csrfToken,
            'Cookie': `csrf_token=${csrfToken}; session_id=valid-session`
          }
        })
      );

      const responses = await Promise.all(requests);

      // Mindestens eine sollte Rate-Limited sein (429)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Rate-Limit Response sollte Retry-After Header haben
      const rateLimitResponse = rateLimitedResponses[0];
      expect(rateLimitResponse.headers.get('Retry-After')).toBeDefined();
    });

    it('sollte Validierungsfehler für ungültige Dateitypen zurückgeben', async () => {
      const invalidContent = 'not-an-image';
      const csrfToken = 'valid-csrf-token-invalid-file';

      const response = await createMultipartRequest('/api/user/avatar', invalidContent, 'test.txt', {
        headers: {
          'X-CSRF-Token': csrfToken,
          'Cookie': `csrf_token=${csrfToken}; session_id=valid-session`
        }
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('VALIDATION_ERROR');
    });

    it('sollte Validierungsfehler für zu große Dateien zurückgeben', async () => {
      const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB (über 5MB Limit)
      const csrfToken = 'valid-csrf-token-large-file';

      const response = await createMultipartRequest('/api/user/avatar', largeContent, 'large-avatar.jpg', {
        headers: {
          'X-CSRF-Token': csrfToken,
          'Cookie': `csrf_token=${csrfToken}; session_id=valid-session`
        }
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('VALIDATION_ERROR');
    });

    it('sollte 401 für nicht authentifizierte Anfragen zurückgeben', async () => {
      const validImageContent = 'fake-image-content-unauth';
      const csrfToken = 'valid-csrf-token-unauth';

      const response = await createMultipartRequest('/api/user/avatar', validImageContent, 'test-avatar.jpg', {
        headers: {
          'X-CSRF-Token': csrfToken
          // Kein session_id Cookie
        }
      });

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('UNAUTHORIZED');
    });

    it('sollte CSRF-Schutz korrekt handhaben', async () => {
      const validImageContent = 'fake-image-content-csrf';
      const invalidCsrfToken = 'invalid-csrf-token';

      const response = await createMultipartRequest('/api/user/avatar', validImageContent, 'test-avatar.jpg', {
        headers: {
          'X-CSRF-Token': invalidCsrfToken,
          'Cookie': `csrf_token=different-token; session_id=valid-session`
        }
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('CSRF_INVALID');
    });

    it('sollte 405 für GET-Methode zurückgeben', async () => {
      const response = await fetchPage('/api/user/avatar');

      expect(response.status).toBe(405);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('METHOD_NOT_ALLOWED');
    });

    it('sollte Security-Headers setzen', async () => {
      const validImageContent = 'fake-image-content-headers';
      const csrfToken = 'valid-csrf-token-headers';

      const response = await createMultipartRequest('/api/user/avatar', validImageContent, 'test-avatar.jpg', {
        headers: {
          'X-CSRF-Token': csrfToken,
          'Cookie': `csrf_token=${csrfToken}; session_id=valid-session`
        }
      });

      // Prüfe wichtige Security-Headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Content-Security-Policy')).toBeDefined();
    });

    it('sollte verschiedene gültige Bildformate akzeptieren', async () => {
      const csrfToken = 'valid-csrf-token-formats';
      const validFormats = ['test.jpg', 'test.jpeg', 'test.png', 'test.webp'];

      for (const format of validFormats) {
        const response = await createMultipartRequest('/api/user/avatar', 'fake-image-content', format, {
          headers: {
            'X-CSRF-Token': `${csrfToken}-${format}`,
            'Cookie': `csrf_token=${csrfToken}-${format}; session_id=valid-session`
          }
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.success).toBe(true);
      }
    });

    it('sollte Audit-Logging für Avatar-Uploads durchführen', async () => {
      const validImageContent = 'fake-image-content-audit';
      const csrfToken = 'valid-csrf-token-audit';

      const response = await createMultipartRequest('/api/user/avatar', validImageContent, 'audit-avatar.jpg', {
        headers: {
          'X-CSRF-Token': csrfToken,
          'Cookie': `csrf_token=${csrfToken}; session_id=valid-session`
        }
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);

      // Prüfe strukturierte Response
      expect(json.data.message).toBeDefined();
      expect(json.data.avatarUrl).toBeDefined();
    });
  });
});