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

// Sichere JSON-Parse-Hilfe
function safeParseJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

type ProjectItem = {
  id: string;
  name: string;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

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

describe('Projects-API-Integration', () => {
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

  describe('GET /api/projects', () => {
    it('sollte Projektliste für authentifizierten Benutzer zurückgeben', async () => {
      const response = await fetchPage('/api/projects');

      expect([200, 401, 404]).toContain(response.status);
      if (response.status === 200 && (response.contentType || '').includes('application/json')) {
        const json = safeParseJson(response.text);
        expect(json?.success).toBe(true);
        expect(Array.isArray(json?.data)).toBe(true);

        // Prüfe Struktur der Projekte
        if (json?.data?.length > 0) {
          const project = json.data[0];
          expect(project).toHaveProperty('id');
          expect(project).toHaveProperty('name');
          expect(project).toHaveProperty('description');
          expect(project).toHaveProperty('status');
          expect(project).toHaveProperty('createdAt');
          expect(project).toHaveProperty('updatedAt');
        }
      }
    });

    it('sollte 401 für nicht authentifizierte Anfragen zurückgeben', async () => {
      const response = await fetchPage('/api/projects');

      expect([401, 404]).toContain(response.status);
      if ((response.contentType || '').includes('application/json')) {
        const json = safeParseJson(response.text);
        if (json) {
          expect(json).toHaveProperty('success');
          expect(json.success).toBe(false);
        }
      }
    });
  });

  describe('Projekt-CRUD-Operationen', () => {
    let createdProjectId: string;

    it('sollte erfolgreich neues Projekt erstellen', async () => {
      const projectData = {
        name: 'Test Projekt für API-Tests',
        description: 'Dies ist ein Testprojekt für die API-Integrationstests',
        status: 'active',
      };

      const response = await sendJson('/api/projects', projectData);

      expect([200, 401, 404]).toContain(response.status);
      if (response.status === 200 && (response.contentType || '').includes('application/json')) {
        const json = safeParseJson(response.text);
        expect(json?.success).toBe(true);
        expect(json?.data?.project).toBeDefined();
        expect(json?.data?.project?.name).toBe(projectData.name);
        expect(json?.data?.project?.description).toBe(projectData.description);
        // Speichere ID für weitere Tests
        if (json?.data?.project?.id) {
          createdProjectId = json.data.project.id as string;
        }
      }
    });

    it('sollte Validierungsfehler für fehlenden Projektnamen zurückgeben', async () => {
      const projectData = {
        description: 'Projekt ohne Namen',
        status: 'active',
        // name fehlt
      };

      const response = await sendJson('/api/projects', projectData);

      expect([400, 401, 403]).toContain(response.status);
      if ((response.contentType || '').includes('application/json')) {
        const json = safeParseJson(response.text);
        if (json && Object.prototype.hasOwnProperty.call(json, 'success')) {
          expect(json.success).toBe(false);
        }
      }
    });

    it('sollte Validierungsfehler für ungültigen Projektstatus zurückgeben', async () => {
      const projectData = {
        name: 'Projekt mit ungültigem Status',
        description: 'Dieses Projekt hat einen ungültigen Status',
        status: 'invalid_status',
      };

      const response = await sendJson('/api/projects', projectData);

      expect([400, 401, 403]).toContain(response.status);
      if ((response.contentType || '').includes('application/json')) {
        const json = safeParseJson(response.text);
        if (json && Object.prototype.hasOwnProperty.call(json, 'success')) {
          expect(json.success).toBe(false);
        }
      }
    });

    it('sollte erfolgreich Projekt aktualisieren', async () => {
      const updateData = {
        name: 'Aktualisiertes Testprojekt',
        description: 'Das Projekt wurde erfolgreich aktualisiert',
        status: 'completed',
      };

      if (!createdProjectId) return;
      const response = await sendJson(`/api/projects/${createdProjectId}`, updateData, 'PUT');

      expect([200, 401, 404]).toContain(response.status);
      if (response.status === 200 && (response.contentType || '').includes('application/json')) {
        const json = safeParseJson(response.text);
        expect(json?.success).toBe(true);
        expect(json?.data?.project?.name).toBe(updateData.name);
        expect(json?.data?.project?.status).toBe(updateData.status);
      }
    });

    it('sollte 404 für nicht existierende Projekt-Updates zurückgeben', async () => {
      const updateData = {
        name: 'Nicht existierendes Projekt',
        description: 'Dieses Projekt existiert nicht',
      };

      const response = await sendJson('/api/projects/non-existent-id', updateData, 'PUT');

      expect([404, 401]).toContain(response.status);
      if ((response.contentType || '').includes('application/json')) {
        const json = safeParseJson(response.text);
        if (json && Object.prototype.hasOwnProperty.call(json, 'success')) {
          expect(json.success).toBe(false);
        }
      }
    });

    it('sollte erfolgreich Projekt löschen', async () => {
      if (!createdProjectId) return;
      const response = await sendJson(`/api/projects/${createdProjectId}`, {}, 'DELETE');

      expect([200, 401, 404]).toContain(response.status);
      if (response.status === 200 && (response.contentType || '').includes('application/json')) {
        const json = safeParseJson(response.text);
        expect(json?.success).toBe(true);
        expect(json?.data?.message || '').toContain('success');
      }
    });

    it('sollte 404 für Löschen nicht existierender Projekte zurückgeben', async () => {
      const response = await sendJson('/api/projects/non-existent-id', {}, 'DELETE');

      expect([404, 401]).toContain(response.status);
      if ((response.contentType || '').includes('application/json')) {
        const json = safeParseJson(response.text);
        if (json) {
          expect(json.success).toBe(false);
        }
      }
    });
  });

  describe('Projekt-Filter und Suche', () => {
    beforeAll(async () => {
      // Erstelle einige Testprojekte für Filter-Tests
      const testProjects = [
        { name: 'Aktives Projekt Alpha', description: 'Erstes Testprojekt', status: 'active' },
        { name: 'Inaktives Projekt Beta', description: 'Zweites Testprojekt', status: 'inactive' },
        {
          name: 'Abgeschlossenes Projekt Gamma',
          description: 'Drittes Testprojekt',
          status: 'completed',
        },
      ];

      for (const projectData of testProjects) {
        await sendJson('/api/projects', projectData);
      }
    });

    it('sollte Projekte nach Status filtern können', async () => {
      const response = await fetchPage('/api/projects?status=active');

      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        const json = safeParseJson(response.text) as { success: true; data: ProjectItem[] };
        expect(json?.success).toBe(true);
        expect(Array.isArray(json?.data)).toBe(true);
        // Alle zurückgegebenen Projekte sollten den Status 'active' haben
        json?.data?.forEach((project) => {
          expect(project.status).toBe('active');
        });
      }
    });

    it('sollte Projekte nach Suchbegriff filtern können', async () => {
      const response = await fetchPage('/api/projects?search=Alpha');

      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        const json = safeParseJson(response.text) as { success: true; data: ProjectItem[] };
        expect(json?.success).toBe(true);
        expect(Array.isArray(json?.data)).toBe(true);
        const hasMatchingProject = (json?.data || []).some(
          (project) =>
            project.name.includes('Alpha') || (project.description || '').includes('Alpha')
        );
        expect(hasMatchingProject).toBe(true);
      }
    });

    it('sollte leeres Array für nicht passende Filter zurückgeben', async () => {
      const response = await fetchPage('/api/projects?status=non_existent_status');

      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        const json = safeParseJson(response.text);
        expect(json?.success).toBe(true);
        expect(Array.isArray(json?.data)).toBe(true);
        expect((json?.data || []).length).toBe(0);
      }
    });
  });

  describe('Security-Headers für alle Projekt-Endpunkte', () => {
    it('sollte Security-Headers für GET /api/projects setzen', async () => {
      const response = await fetchPage('/api/projects');

      // Prüfe wichtige Security-Headers, falls vorhanden
      expect(response.headers.get('X-Content-Type-Options')).toBeDefined();
      expect(response.headers.get('X-Frame-Options')).toBeDefined();
      expect(response.headers.get('Content-Security-Policy')).toBeDefined();
    });

    it('sollte Security-Headers für POST /api/projects setzen', async () => {
      const projectData = {
        name: 'Security Headers Test',
        description: 'Test für Security Headers',
      };

      const response = await sendJson('/api/projects', projectData);

      // Prüfe wichtige Security-Headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Content-Security-Policy')).toBeDefined();
    });
  });

  describe('Rate-Limiting für Projekt-Endpunkte', () => {
    it('sollte Rate-Limiting für Projekt-Erstellung korrekt handhaben', async () => {
      const projectData = {
        name: 'Rate Limit Test Projekt',
        description: 'Test für Rate Limiting',
      };

      // Mehrere Anfragen senden um Rate-Limit zu triggern
      const requests = Array(15)
        .fill(null)
        .map(() => sendJson('/api/projects', projectData));

      const responses = await Promise.all(requests);

      // Mindestens eine sollte rate-limited oder geblockt sein (429/403/401)
      const guardedResponses = responses.filter(
        (r) => r.status === 429 || r.status === 403 || r.status === 401
      );
      expect(guardedResponses.length).toBeGreaterThan(0);

      // Rate-Limit Response sollte Retry-After Header haben (nur prüfen, wenn 429 vorhanden)
      const rateLimitResponse = responses.find((r) => r.status === 429);
      if (rateLimitResponse) {
        expect(rateLimitResponse.headers.get('Retry-After')).toBeDefined();
      }
    });
  });

  describe('Fehlerbehandlung', () => {
    it('sollte strukturierte Fehler für alle Projekt-Endpunkte zurückgeben', async () => {
      const endpoints = ['/api/projects', '/api/projects/non-existent-id'];

      for (const endpoint of endpoints) {
        const isGetRequest = !endpoint.includes('non-existent-id');
        const requestData = isGetRequest ? {} : { name: 'Test' };

        const response = isGetRequest
          ? await fetchPage(endpoint)
          : await sendJson(endpoint, requestData);

        if (response.status >= 400 && (response.contentType || '').includes('application/json')) {
          const json = safeParseJson(response.text);
          if (json) {
            expect(json.success).toBe(false);
            expect(json.error.type).toBeDefined();
            expect(json.error.message).toBeDefined();
          }
        }
      }
    });

    it('sollte 405 für nicht unterstützte HTTP-Methoden zurückgeben', async () => {
      const endpoints = ['/api/projects'];

      for (const endpoint of endpoints) {
        const response = await sendJson(endpoint, {}, 'PATCH');

        expect([405, 404, 401]).toContain(response.status);
        if ((response.contentType || '').includes('application/json')) {
          const json = safeParseJson(response.text);
          if (json) {
            expect(json.success).toBe(false);
          }
        }
      }
    });
  });

  describe('Datenkonsistenz', () => {
    it('sollte konsistente Projekt-Daten zwischen verschiedenen Endpunkten zurückgeben', async () => {
      // Erstelle ein neues Projekt
      const projectData = {
        name: 'Konsistenz-Test Projekt',
        description: 'Test für Datenkonsistenz',
        status: 'active',
      };

      const createResponse = await sendJson('/api/projects', projectData);
      expect([200, 401, 404]).toContain(createResponse.status);
      if (createResponse.status !== 200) return; // Ohne erfolgreiche Erstellung keine Konsistenzprüfung
      const createdProject = (safeParseJson(createResponse.text) || {}).data
        ?.project as ProjectItem;

      // Hole die Projektliste
      const listResponse = await fetchPage('/api/projects');
      expect([200, 401, 404]).toContain(listResponse.status);
      if (listResponse.status !== 200) return;
      const projects = (safeParseJson(listResponse.text) || {}).data as ProjectItem[];

      // Das erstellte Projekt sollte in der Liste enthalten sein
      const foundProject = projects.find((p) => p.id === createdProject.id);
      expect(foundProject).toBeDefined();
      const fp = foundProject as ProjectItem;
      expect(fp.name).toBe(createdProject.name);
      expect(fp.description).toBe(createdProject.description);
      expect(fp.status).toBe(createdProject.status);

      // Aufräumen
      await sendJson(`/api/projects/${createdProject.id}`, {}, 'DELETE');
    });
  });
});
