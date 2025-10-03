import { execSync } from 'child_process';
import { test as base, expect, Page } from '@playwright/test';

/**
 * Findet einen laufenden Server-Port
 */
async function findRunningServerPort(): Promise<number> {
  // Verwende den festen Port 4322, da wir wissen, dass der Server darauf läuft
  const FIXED_PORT = 4322;
  console.log(`Verwende festen Port: ${FIXED_PORT}`);
  return FIXED_PORT;

  /*
  // Alternativer Code für die Port-Erkennung (deaktiviert, aber als Referenz behalten)
  try {
    // Methode 1: Überprüfe den festen Port zuerst
    try {
      execSync(`lsof -i:${FIXED_PORT}`, { stdio: 'ignore' });
      console.log(`Server auf Port ${FIXED_PORT} gefunden`);
      return FIXED_PORT;
    } catch (error) {
      console.warn(`Kein Server auf Port ${FIXED_PORT} gefunden`);
    }
    
    // Methode 2: Suche nach laufenden Node-Prozessen
    try {
      const output = execSync('lsof -i -P -n | grep LISTEN | grep node').toString();
      const lines = output.split('\n').filter(line => line.includes('LISTEN'));
      const ports = lines.map(line => {
        const match = line.match(/:([0-9]+) \(LISTEN\)/);
        return match ? parseInt(match[1], 10) : null;
      }).filter(Boolean) as number[];
      
      if (ports.length > 0) {
        console.log(`Gefundene Ports: ${ports.join(', ')}`);
        return ports[0];
      }
    } catch (error) {
      console.warn('Fehler bei der Port-Erkennung über lsof:', error);
    }
    
    // Methode 3: Überprüfe Standard-Ports
    const commonPorts = [4322, 4323, 3000, 3001, 8080, 8000, 5000];
    for (const port of commonPorts) {
      try {
        execSync(`lsof -i:${port}`, { stdio: 'ignore' });
        console.log(`Server auf Port ${port} gefunden`);
        return port;
      } catch {
        // Port nicht in Verwendung
      }
    }
    
    console.warn('Kein laufender Server gefunden, verwende Standard-Port');
    return FIXED_PORT;
  } catch (error) {
    console.warn('Fehler bei der Port-Erkennung:', error);
    return FIXED_PORT;
  }
  */
}

/**
 * Navigiert zu einer URL unter Verwendung des erkannten Ports
 */
async function navigateWithPortDetection(page: Page, path: string) {
  const port = (await findRunningServerPort()) || 4322; // Fallback auf Standard-Port
  const baseURL = `http://localhost:${port}`;
  const url = path.startsWith('http')
    ? path
    : `${baseURL}${path.startsWith('/') ? '' : '/'}${path}`;

  console.log(`Navigiere zu: ${url}`);
  await page.goto(url);
  return url;
}

// Erweiterte Test-Funktionalität
export const test = base.extend<{ navigateTo: (path: string) => Promise<string> }>({
  navigateTo: async ({ page }, use) => {
    await use((path: string) => navigateWithPortDetection(page, path));
  },
});

export { expect };

// Hilfsfunktion für die Verwendung in Tests
export async function setupPage(page: Page, path = '/') {
  const url = await navigateWithPortDetection(page, path);
  return { url };
}
