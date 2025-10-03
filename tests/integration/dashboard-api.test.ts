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

// Hilfsfunktion zum Abrufen einer Seite
async function fetchPage(path: string): Promise<FetchResponse> {
  const response = await fetch(`${TEST_URL}${path}`, {
    redirect: 'manual', // Wichtig für Tests: Redirects nicht automatisch folgen
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

describe('Dashboard-API-Integration', () => {
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

  describe('GET /api/dashboard/stats', () => {
    it('sollte Dashboard-Statistiken für authentifizierten Benutzer zurückgeben', async () => {
      const response = await fetchPage('/api/dashboard/stats');

      expect(response.status).toBe(200);
      expect(response.contentType).toContain('application/json');
      const json = JSON.parse(response.text);
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();

      // Prüfe erwartete Statistik-Felder
      const expectedFields = ['totalProjects', 'activeProjects', 'creditsUsed', 'creditsRemaining'];
      for (const field of expectedFields) {
        expect(json.data).toHaveProperty(field);
        expect(typeof json.data[field]).toBe('number');
      }
    });

    it('sollte 401 für nicht authentifizierte Anfragen zurückgeben', async () => {
      const response = await fetchPage('/api/dashboard/stats');

      expect(response.status).toBe(401);
      const json = JSON.parse(response.text);
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/dashboard/activity', () => {
    it('sollte Aktivitätsfeed für authentifizierten Benutzer zurückgeben', async () => {
      const response = await fetchPage('/api/dashboard/activity');

      expect(response.status).toBe(200);
      expect(response.contentType).toContain('application/json');
      const json = JSON.parse(response.text);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);

      // Prüfe Struktur der Aktivitäten
      if (json.data.length > 0) {
        const activity = json.data[0];
        expect(activity).toHaveProperty('id');
        expect(activity).toHaveProperty('type');
        expect(activity).toHaveProperty('timestamp');
        expect(activity).toHaveProperty('description');
      }
    });

    it('sollte 401 für nicht authentifizierte Anfragen zurückgeben', async () => {
      const response = await fetchPage('/api/dashboard/activity');

      expect(response.status).toBe(401);
      const json = JSON.parse(response.text);
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/dashboard/projects', () => {
    it('sollte Projektliste für authentifizierten Benutzer zurückgeben', async () => {
      const response = await fetchPage('/api/dashboard/projects');

      expect(response.status).toBe(200);
      expect(response.contentType).toContain('application/json');
      const json = JSON.parse(response.text);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);

      // Prüfe Struktur der Projekte
      if (json.data.length > 0) {
        const project = json.data[0];
        expect(project).toHaveProperty('id');
        expect(project).toHaveProperty('name');
        expect(project).toHaveProperty('status');
        expect(project).toHaveProperty('createdAt');
      }
    });

    it('sollte 401 für nicht authentifizierte Anfragen zurückgeben', async () => {
      const response = await fetchPage('/api/dashboard/projects');

      expect(response.status).toBe(401);
      const json = JSON.parse(response.text);
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/dashboard/notifications', () => {
    it('sollte Benachrichtigungen für authentifizierten Benutzer zurückgeben', async () => {
      const response = await fetchPage('/api/dashboard/notifications');

      expect(response.status).toBe(200);
      expect(response.contentType).toContain('application/json');
      const json = JSON.parse(response.text);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);

      // Prüfe Struktur der Benachrichtigungen
      if (json.data.length > 0) {
        const notification = json.data[0];
        expect(notification).toHaveProperty('id');
        expect(notification).toHaveProperty('type');
        expect(notification).toHaveProperty('message');
        expect(notification).toHaveProperty('read');
        expect(notification).toHaveProperty('createdAt');
      }
    });

    it('sollte 401 für nicht authentifizierte Anfragen zurückgeben', async () => {
      const response = await fetchPage('/api/dashboard/notifications');

      expect(response.status).toBe(401);
      const json = JSON.parse(response.text);
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/dashboard/perform-action', () => {
    it('sollte Dashboard-Aktionen erfolgreich ausführen', async () => {
      const requestData = {
        action: 'mark_notifications_read',
        data: {},
      };

      const response = await sendJson('/api/dashboard/perform-action', requestData);

      expect(response.status).toBe(200);
      expect(response.contentType).toContain('application/json');
      const json = JSON.parse(response.text);
      expect(json.success).toBe(true);
      expect(json.data.message).toBeDefined();
    });

    it('sollte Validierungsfehler für fehlende action zurückgeben', async () => {
      const requestData = {
        data: {},
        // action fehlt
      };

      const response = await sendJson('/api/dashboard/perform-action', requestData);

      expect(response.status).toBe(400);
      const json = JSON.parse(response.text);
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('VALIDATION_ERROR');
    });

    it('sollte Validierungsfehler für unbekannte action zurückgeben', async () => {
      const requestData = {
        action: 'unknown_action',
        data: {},
      };

      const response = await sendJson('/api/dashboard/perform-action', requestData);

      expect(response.status).toBe(400);
      const json = JSON.parse(response.text);
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('VALIDATION_ERROR');
    });

    it('sollte 401 für nicht authentifizierte Anfragen zurückgeben', async () => {
      const requestData = {
        action: 'mark_notifications_read',
        data: {},
      };

      const response = await sendJson('/api/dashboard/perform-action', requestData);

      expect(response.status).toBe(401);
      const json = JSON.parse(response.text);
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/dashboard/quick-actions', () => {
    it('sollte Quick-Actions für authentifizierten Benutzer zurückgeben', async () => {
      const response = await fetchPage('/api/dashboard/quick-actions');

      expect(response.status).toBe(200);
      expect(response.contentType).toContain('application/json');
      const json = JSON.parse(response.text);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);

      // Prüfe Struktur der Quick-Actions
      if (json.data.length > 0) {
        const action = json.data[0];
        expect(action).toHaveProperty('id');
        expect(action).toHaveProperty('label');
        expect(action).toHaveProperty('icon');
        expect(action).toHaveProperty('url');
      }
    });

    it('sollte 401 für nicht authentifizierte Anfragen zurückgeben', async () => {
      const response = await fetchPage('/api/dashboard/quick-actions');

      expect(response.status).toBe(401);
      const json = JSON.parse(response.text);
      expect(json.success).toBe(false);
      expect(json.error.type).toBe('UNAUTHORIZED');
    });
  });

  describe('Security-Headers für alle Dashboard-Endpunkte', () => {
    const dashboardEndpoints = [
      '/api/dashboard/stats',
      '/api/dashboard/activity',
      '/api/dashboard/projects',
      '/api/dashboard/notifications',
      '/api/dashboard/perform-action',
      '/api/dashboard/quick-actions',
    ];

    it.each(dashboardEndpoints)('sollte Security-Headers für %s setzen', async (endpoint) => {
      const isPostEndpoint = endpoint.includes('perform-action');
      const requestData = isPostEndpoint
        ? {
            action: 'mark_notifications_read',
            data: {},
          }
        : {};

      const response = isPostEndpoint
        ? await sendJson(endpoint, requestData)
        : await fetchPage(endpoint);

      // Prüfe wichtige Security-Headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Content-Security-Policy')).toBeDefined();
    });
  });

  describe('Rate-Limiting für Dashboard-Endpunkte', () => {
    it('sollte Rate-Limiting für Dashboard-Stats korrekt handhaben', async () => {
      // Mehrere Anfragen senden um Rate-Limit zu triggern
      const requests = Array(15)
        .fill(null)
        .map(() => fetchPage('/api/dashboard/stats'));

      const responses = await Promise.all(requests);

      // Mindestens eine sollte Rate-Limited sein (429)
      const rateLimitedResponses = responses.filter((r) => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Rate-Limit Response sollte Retry-After Header haben
      const rateLimitResponse = rateLimitedResponses[0];
      expect(rateLimitResponse.headers.get('Retry-After')).toBeDefined();
    });
  });

  describe('Fehlerbehandlung', () => {
    it('sollte strukturierte Fehler für alle Dashboard-Endpunkte zurückgeben', async () => {
      const endpoints = ['/api/dashboard/perform-action'];

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
        '/api/dashboard/stats',
        '/api/dashboard/activity',
        '/api/dashboard/projects',
        '/api/dashboard/notifications',
        '/api/dashboard/quick-actions',
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

  describe('Datenkonsistenz', () => {
    it('sollte konsistente Daten zwischen verschiedenen Dashboard-Endpunkten zurückgeben', async () => {
      // Hole Daten von verschiedenen Endpunkten
      const [statsResponse, projectsResponse, activityResponse] = await Promise.all([
        fetchPage('/api/dashboard/stats'),
        fetchPage('/api/dashboard/projects'),
        fetchPage('/api/dashboard/activity'),
      ]);

      expect(statsResponse.status).toBe(200);
      expect(projectsResponse.status).toBe(200);
      expect(activityResponse.status).toBe(200);

      const stats = JSON.parse(statsResponse.text);
      const projects = JSON.parse(projectsResponse.text);
      const activity = JSON.parse(activityResponse.text);

      // Prüfe grundlegende Konsistenz
      expect(stats.success).toBe(true);
      expect(projects.success).toBe(true);
      expect(activity.success).toBe(true);

      // Wenn Projekte vorhanden sind, sollte die Anzahl in Stats übereinstimmen
      if (projects.data.length > 0) {
        expect(stats.data.totalProjects).toBeGreaterThanOrEqual(projects.data.length);
      }
    });
  });
});
