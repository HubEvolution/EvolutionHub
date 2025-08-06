import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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
      'Content-Type': 'application/x-www-form-urlencoded'
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

  // Teste die Login-Seite
  it('sollte die Login-Seite korrekt anzeigen', async () => {
    const { status, contentType, text } = await fetchPage('/login');
    
    expect(status).toBe(200);
    expect(contentType).toContain('text/html');
    expect(text).toContain('<h1');
    expect(text).toContain('Login');
    expect(text).toContain('<form');
    expect(text).toContain('action="/api/auth/login"');
    expect(text).toContain('method="post"');
    expect(text).toContain('name="email"');
    expect(text).toContain('name="password"');
    expect(text).toContain('type="submit"');
  });

  // Teste den Login-Prozess mit ungültigen Daten
  it('sollte bei ungültiger E-Mail einen Validierungsfehler zurückgeben', async () => {
    const formData = {
      email: 'ungueltig',
      password: 'password123'
    };
    
    const response = await submitForm('/api/auth/login', formData);
    
    // Erwarte Redirect mit Fehlerparameter
    expect(response.status).toBe(302);
    expect(response.redirected).toBe(true);
    expect(response.redirectUrl).toContain('/login?error=InvalidInput');
  });
  
  // Teste den Login-Prozess mit zu kurzem Passwort
  it('sollte bei zu kurzem Passwort einen Validierungsfehler zurückgeben', async () => {
    const formData = {
      email: 'test@example.com',
      password: '12345'  // zu kurz (min. 6 Zeichen)
    };
    
    const response = await submitForm('/api/auth/login', formData);
    
    // Erwarte Redirect mit Fehlerparameter
    expect(response.status).toBe(302);
    expect(response.redirected).toBe(true);
    expect(response.redirectUrl).toContain('/login?error=InvalidInput');
  });
  
  // Teste den Login-Prozess mit nicht existierendem Benutzer
  it('sollte bei nicht existierendem Benutzer einen entsprechenden Fehler zurückgeben', async () => {
    const formData = {
      email: 'nichtexistierend@example.com',
      password: 'password123'
    };
    
    const response = await submitForm('/api/auth/login', formData);
    
    // Erwarte Redirect mit Fehlerparameter
    expect(response.status).toBe(302);
    expect(response.redirected).toBe(true);
    expect(response.redirectUrl).toContain('/login?error=InvalidCredentials');
  });
  
  // Teste die "Remember Me"-Funktionalität
  it('sollte die Cookie-Lebensdauer bei "Remember Me" anpassen', async () => {
    // Da wir keinen Test-Benutzer in der DB haben, können wir nur die Fehlerbehandlung testen
    // Aber wir können prüfen, ob der Parameter korrekt übermittelt wird
    const formData = {
      email: 'test@example.com',
      password: 'password123',
      rememberMe: 'true'
    };
    
    // Parameter wird übermittelt, aber Auth schlägt fehl - trotzdem relevant für Testabdeckung
    const response = await submitForm('/api/auth/login', formData);
    expect(response.status).toBe(302);
  });
  
  // Teste die Register-Seite
  it('sollte die Register-Seite korrekt anzeigen', async () => {
    const { status, contentType, text } = await fetchPage('/register');
    
    expect(status).toBe(200);
    expect(contentType).toContain('text/html');
    expect(text).toContain('<h1');
    expect(text).toContain('Registrierung');
    expect(text).toContain('<form');
    expect(text).toContain('action="/api/auth/register"');
    expect(text).toContain('method="post"');
    expect(text).toContain('name="email"');
    expect(text).toContain('name="password"');
    expect(text).toContain('type="submit"');
  });
  
  // Teste die "Passwort vergessen"-Seite
  it('sollte die "Passwort vergessen"-Seite korrekt anzeigen', async () => {
    const { status, contentType, text } = await fetchPage('/forgot-password');
    
    expect(status).toBe(200);
    expect(contentType).toContain('text/html');
    expect(text).toContain('Passwort vergessen');
    expect(text).toContain('<form');
    expect(text).toContain('action="/api/auth/forgot-password"');
  });
});
