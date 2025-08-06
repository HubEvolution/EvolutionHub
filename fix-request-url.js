// Script zum Hinzufügen des request.url Attributs in allen Test-Dateien
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Aktuelle Verzeichnis ermitteln
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Liste der zu korrigierenden Dateien
const filesToFix = [
  'tests/src/pages/api/dashboard/perform-action._test.ts',
  'tests/src/pages/api/dashboard/activity._test.ts',
  'tests/src/pages/api/dashboard/projects._test.ts',
  'tests/src/pages/api/projects/index._test.ts',
  'tests/src/pages/api/comments._test.ts',
  'tests/src/pages/api/tools._test.ts'
];

// Regulärer Ausdruck zum Finden von Context-Objekten
const contextRegex = /const context\s*=\s*{[^}]*url:\s*new URL\([^)]*\)[^}]*request:\s*{(?![^}]*url:)/gs;

// Regulärer Ausdruck zum Finden der request-Objekt-Zeile
const requestLineRegex = /(request:\s*{)/;

// Basis-Pfad
const basePath = __dirname;

// Jede Datei bearbeiten
filesToFix.forEach(file => {
  const filePath = path.join(basePath, file);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`Datei nicht gefunden: ${filePath}`);
      return;
    }
    
    // Backup erstellen
    const backupPath = `${filePath}.bak`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`Backup erstellt: ${backupPath}`);
    
    // Datei einlesen
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Zähler für Ersetzungen
    let replacementCount = 0;
    
    // Ersetzungen durchführen
    content = content.replace(contextRegex, (match) => {
      // URL aus dem Match extrahieren
      const urlMatch = match.match(/url:\s*new URL\(['"]([^'"]+)['"]/);
      if (!urlMatch) return match;
      
      const urlValue = urlMatch[1];
      
      // request-Zeile ersetzen
      const replacedMatch = match.replace(requestLineRegex, `$1\n        url: '${urlValue}',`);
      replacementCount++;
      
      return replacedMatch;
    });
    
    // Nur speichern, wenn Änderungen vorgenommen wurden
    if (replacementCount > 0) {
      fs.writeFileSync(filePath, content);
      console.log(`${replacementCount} Ersetzungen in ${filePath} vorgenommen`);
    } else {
      console.log(`Keine Ersetzungen in ${filePath} notwendig`);
    }
  } catch (error) {
    console.error(`Fehler bei der Bearbeitung von ${filePath}:`, error);
  }
});

console.log('Skript abgeschlossen.');
