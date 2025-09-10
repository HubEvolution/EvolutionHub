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
    redirect: 'manual' // Wichtig für Auth-Tests: Redirects nicht automatisch folgen
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

describe('Auth-Integration', () => {
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

  // Teste die Login-Seite
  it('sollte die Login-Seite korrekt anzeigen', async () => {
    const { status, contentType, text } = await fetchPage('/login');
    
    expect(status).toBe(200);
    expect(contentType).toContain('text/html');
    expect(text).toContain('<h1');
    // Überschrift kann je nach Locale variieren – akzeptiere DE/EN Varianten
    const loginHeadingCandidates = [
      'Login',
      'Anmeldung',
      'Anmelden',
      'Einloggen'
    ];
    expect(loginHeadingCandidates.some(h => text.includes(h))).toBe(true);
    expect(text).toContain('<form');
    // Magic Link-only flow
    expect(text).toContain('action="/api/auth/magic/request"');
    expect(text.toLowerCase()).toContain('method="post"');
    expect(text).toContain('name="email"');
    expect(text).not.toContain('name="password"');
    expect(text).toContain('type="submit"');
  });

  // Legacy password-login tests are deprecated; Magic Link flow is used instead
  it.skip('sollte bei ungültiger E-Mail einen Validierungsfehler (legacy) zurückgeben', async () => {
    // Skipped: /api/auth/login is deprecated (410 Gone). Magic Link validation is covered elsewhere.
  });
  
  it.skip('sollte bei zu kurzem Passwort einen Validierungsfehler (legacy) zurückgeben', async () => {
    // Skipped: legacy password flow removed.
  });
  
  it.skip('sollte bei nicht existierendem Benutzer einen entsprechenden Fehler (legacy) zurückgeben', async () => {
    // Skipped: legacy password flow removed.
  });
  
  it.skip('sollte die Cookie-Lebensdauer bei "Remember Me" anpassen (legacy)', async () => {
    // Skipped: legacy password flow removed.
  });
  
  // Teste die Register-Seite (Magic Link with optional profile fields)
  it('sollte die Register-Seite korrekt anzeigen (Magic Link)', async () => {
    const { status, contentType, text } = await fetchPage('/register');
    
    expect(status).toBe(200);
    expect(contentType).toContain('text/html');
    expect(text).toContain('<h1');
    const headingCandidates = [
      'Registrierung',
      'Konto erstellen',
      'Erstellen Sie Ihr Konto',
      'Create an Account',
      'Create your Account'
    ];
    expect(headingCandidates.some(h => text.includes(h))).toBe(true);
    expect(text).toContain('<form');
    expect(text).toContain('action="/api/auth/magic/request"');
    expect(text.toLowerCase()).toContain('method="post"');
    expect(text).toContain('name="email"');
    expect(text).toContain('name="name"');
    expect(text).toContain('name="username"');
    expect(text).not.toContain('name="password"');
    expect(text).toContain('type="submit"');
  });
  
  // Test zur "Passwort vergessen"-Seite entfällt im Stytch-only Flow
  it.skip('sollte die "Passwort vergessen"-Seite korrekt anzeigen (legacy)', async () => {
    // Skipped: UI-Seite wurde entfernt, Endpunkt liefert 410 Gone.
  });
});
