import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadEnv } from 'vite';
import { execa } from 'execa';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

// Lade Umgebungsvariablen
const env = loadEnv(process.env.NODE_ENV || 'test', process.cwd(), '');

// Pfade für Testumgebung
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

// Test-Server-URL
const TEST_URL = 'http://localhost:4321';

// Hilfsfunktion zum Abrufen einer Seite
async function fetchPage(path: string) {
  const response = await fetch(`${TEST_URL}${path}`);
  return {
    status: response.status,
    contentType: response.headers.get('content-type'),
    text: await response.text(),
    isOk: response.ok,
  };
}

describe('Blog Integration', () => {
  let serverProcess: any;
  
  // Starte den Entwicklungsserver vor den Tests
  beforeAll(async () => {
    // Starte den Astro-Entwicklungsserver
    serverProcess = execa('npm', ['run', 'dev', '--', '--host'], {
      cwd: rootDir,
      env: { ...process.env, NODE_ENV: 'test' },
      detached: false,
    });
    
    // Warte bis der Server gestartet ist (max. 30 Sekunden)
    const maxWaitTime = 30000; // 30 Sekunden
    const startTime = Date.now();
    let serverReady = false;
    
    while (!serverReady && Date.now() - startTime < maxWaitTime) {
      try {
        const response = await fetch(TEST_URL);
        if (response.ok) {
          serverReady = true;
          console.log('Testserver erfolgreich gestartet');
        }
      } catch (error) {
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
  
  // Teste die Blog-Übersichtsseite
  it('sollte die Blog-Übersichtsseite korrekt anzeigen', async () => {
    const { status, contentType, text } = await fetchPage('/blog');
    
    expect(status).toBe(200);
    expect(contentType).toContain('text/html');
    expect(text).toContain('<h1 class="text-4xl font-bold text-gray-900 dark:text-white">EvolutionHub Blog</h1>');
    expect(text).toContain('Die Zukunft der Webentwicklung mit Astro');
  });
  
  // Teste die Einzelansicht eines Blog-Posts
  it('sollte einen einzelnen Blog-Post korrekt anzeigen', async () => {
    const { status, contentType, text } = await fetchPage('/blog/zukunft-webentwicklung-astro');
    
    expect(status).toBe(200);
    expect(contentType).toContain('text/html');
    expect(text).toContain('<h1 class="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">');
    expect(text).toContain('Die Zukunft der Webentwicklung mit Astro');
    expect(text).toContain('Max Mustermann');
  });
  
  // Teste die Kategorie-Filterung
  it('sollte Blog-Posts nach Kategorie filtern können', async () => {
    const { status, text } = await fetchPage('/blog/kategorie/webentwicklung');
    
    expect(status).toBe(200);
    expect(text).toContain('Kategorie: Webentwicklung');
    expect(text).toContain('Die Zukunft der Webentwicklung mit Astro');
  });
  
  // Teste die Tag-Filterung
  it('sollte Blog-Posts nach Tag filtern können', async () => {
    const { status, text } = await fetchPage('/blog/tag/astro');
    
    expect(status).toBe(200);
    expect(text).toContain('Tag: Astro');
    expect(text).toContain('Die Zukunft der Webentwicklung mit Astro');
  });
  
  // Teste die 404-Seite für nicht vorhandene Blog-Posts
  it('sollte eine 404-Seite für nicht vorhandene Blog-Posts anzeigen', async () => {
    const { status } = await fetchPage('/blog/nicht-vorhanden');
    expect(status).toBe(404);
  });
});
