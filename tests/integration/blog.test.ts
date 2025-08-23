import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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
// Locale Cookie to bypass splash and request DE content
const LOCALE_COOKIE = 'pref_locale=de';

// Hilfsfunktion zum Abrufen einer Seite
async function fetchPage(path: string) {
  const response = await fetch(`${TEST_URL}${path}`, {
    headers: { cookie: LOCALE_COOKIE },
    redirect: 'follow',
  });
  return {
    status: response.status,
    contentType: response.headers.get('content-type'),
    text: await response.text(),
    isOk: response.ok,
  };
}

describe('Blog Integration', () => {
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
        const response = await fetch(TEST_URL, { headers: { cookie: LOCALE_COOKIE } });
        if (response.ok || response.status === 302) {
          serverReady = true;
          // eslint-disable-next-line no-console
          console.log('Testserver erreichbar unter', TEST_URL);
        }
      } catch (_) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    if (!serverReady) {
      throw new Error('Testserver konnte nicht gestartet werden');
    }
  }, 35000);
  
  // Stoppe den Server nach den Tests
  afterAll(async () => {
    if (serverProcess) {
      try {
        process.kill(-serverProcess.pid, 'SIGTERM');
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Fehler beim Stoppen des Servers:', error);
      }
    }
  });
  
  // Teste die Blog-Übersichtsseite
  it('sollte die Blog-Übersichtsseite korrekt anzeigen', async () => {
    const { status, contentType, text } = await fetchPage('/blog');
    
    expect(status).toBe(200);
    expect(contentType).toContain('text/html');
    // Robuste Checks auf stabile UI-Elemente
    expect(text).toContain('Blog durchsuchen');
    expect(text).toContain('Alle Tags');
  });
  
  // Teste die Einzelansicht eines Blog-Posts
  it('sollte einen einzelnen Blog-Post korrekt anzeigen', async () => {
    // Nutze existierenden Post-Slug basierend auf Datei `new-work-ist-eine-haltung.md`
    const { status, contentType, text } = await fetchPage('/blog/new-work-ist-eine-haltung');
    
    expect(status).toBe(200);
    expect(contentType).toContain('text/html');
    expect(text).toContain('New Work ist kein Ort, sondern eine Haltung: Gestalte deine Arbeitszukunft selbst.');
    expect(text).toContain('Evolution Hub');
  });
  
  // Teste die Kategorie-Filterung
  it('sollte Blog-Posts nach Kategorie filtern können', async () => {
    // Kategorie-Filter erfolgt über Query-Parameter `kategorie`
    const { status, text } = await fetchPage('/blog?kategorie=New%20Work');
    
    expect(status).toBe(200);
    expect(text).toContain('Gefiltert nach Kategorie: New Work');
    expect(text).toContain('New Work ist kein Ort, sondern eine Haltung: Gestalte deine Arbeitszukunft selbst.');
  });
  
  // Teste die Tag-Filterung
  it('sollte Blog-Posts nach Tag filtern können', async () => {
    // Tag-Filter erfolgt über Query-Parameter `tag`
    const { status, text } = await fetchPage('/blog?tag=Technologie');
    
    expect(status).toBe(200);
    // Hinweis: UI-Text enthält aktuell einen Schreibfehler "Gefiltered"
    expect(text).toContain('Gefiltered nach Tag: Technologie');
    expect(text).toContain('KI im Alltag: Wie künstliche Intelligenz schon heute dein Leben vereinfacht.');
  });
  
  // Teste die 404-Seite für nicht vorhandene Blog-Posts
  it('sollte eine 404-Seite für nicht vorhandene Blog-Posts anzeigen', async () => {
    const { status } = await fetchPage('/blog/nicht-vorhanden');
    expect(status).toBe(404);
  });
});
