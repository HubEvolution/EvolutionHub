#!/usr/bin/env node
/**
 * Migrationsskript für die Umstellung von relativen Imports auf Alias-Imports
 *
 * Dieses Skript analysiert alle TypeScript, JavaScript und Astro-Dateien im Projekt,
 * identifiziert relative Imports und wandelt sie in Alias-Imports um.
 *
 * Der Benutzer erhält eine Vorschau aller geplanten Änderungen und kann bestätigen,
 * welche Änderungen durchgeführt werden sollen.
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

// Pfad zum Projekt-Root
const projectRoot = path.resolve(__dirname, '..');

// Alias-Konfiguration aus astro.config.mjs
const ALIAS_MAP = {
  '@/lib': '/src/lib',
  '@/components': '/src/components',
  '@/layouts': '/src/layouts',
  '@/content': '/src/content',
  '@/types': '/src/types',
  '@/utils': '/src/utils',
  '@/assets': '/src/assets',
  '@/styles': '/src/styles',
  '@/api': '/src/pages/api',
  '@/tests': '/tests',
};

// Dateitypen, die durchsucht werden sollen
const FILE_EXTENSIONS = ['.ts', '.js', '.astro', '.tsx', '.jsx'];

// Regex zum Erkennen von Import-Statements mit relativen Pfaden (beginnen mit './')
const IMPORT_REGEX =
  /import\s+(?:(?:\w+(?:\s+as\s+\w+)?|\{\s*[\w\s,]+\s*\}|\*\s+as\s+\w+)\s+from\s+)?['"](\.\.[^'"]+)['"]/g;

/**
 * Funktion zum Lesen einer Datei und Identifizieren relativer Imports
 */
async function analyzeFile(filePath) {
  const changes = [];
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matches = Array.from(line.matchAll(IMPORT_REGEX));

    for (const match of matches) {
      const relativeImport = match[1]; // z.B. '../components/Header.astro'
      const aliasImport = mapToAlias(relativeImport, filePath);

      if (aliasImport !== relativeImport) {
        const originalImport = match[0]; // Vollständiger Import-Statement
        const newImport = originalImport.replace(relativeImport, aliasImport);

        changes.push({
          file: filePath,
          originalImport: relativeImport,
          newImport: aliasImport,
          lineNumber: i + 1, // 1-basierte Zeilennummer
          fullLine: line,
          newLine: line.replace(originalImport, newImport),
        });
      }
    }
  }

  return changes;
}

/**
 * Funktion zum Umwandeln eines relativen Pfads in einen Alias-Pfad
 */
function mapToAlias(relativePath, filePath) {
  // Bestimme den absoluten Pfad des Import-Ziels
  const fileDir = path.dirname(filePath);
  const targetPath = path.resolve(fileDir, relativePath);
  const normalizedTargetPath = path.normalize(targetPath);

  // Entferne den Project-Root vom Pfad um den relativen Pfad zum Projektroot zu erhalten
  const projectRelativePath = normalizedTargetPath.substring(projectRoot.length);

  // Überprüfe, ob der Pfad einem der definierten Aliase entspricht
  for (const [alias, dir] of Object.entries(ALIAS_MAP)) {
    if (projectRelativePath.startsWith(dir)) {
      // Ersetze das Verzeichnis-Prefix mit dem Alias
      return alias + projectRelativePath.substring(dir.length);
    }
  }

  // Wenn kein passender Alias gefunden wurde, gib den ursprünglichen Pfad zurück
  return relativePath;
}

/**
 * Funktion zum Anwenden der Änderungen auf eine Datei
 */
async function applyChanges(filePath, changes) {
  // Sortiere Änderungen nach Zeilennummer (absteigend), um Offsets zu vermeiden
  const sortedChanges = [...changes].sort((a, b) => b.lineNumber - a.lineNumber);

  // Lese den Dateiinhalt
  let content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  // Wende Änderungen an
  for (const change of sortedChanges) {
    lines[change.lineNumber - 1] = change.newLine;
  }

  // Schreibe den aktualisierten Inhalt zurück in die Datei
  await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
}

/**
 * Hauptfunktion zum Durchsuchen aller Dateien und Identifizieren von Änderungen
 */
async function findAllChanges() {
  const allChanges = [];

  // Rekursive Funktion zum Durchsuchen von Verzeichnissen
  async function scanDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Überspringe node_modules und versteckte Verzeichnisse
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await scanDir(fullPath);
      } else if (entry.isFile() && FILE_EXTENSIONS.includes(path.extname(entry.name))) {
        const fileChanges = await analyzeFile(fullPath);
        allChanges.push(...fileChanges);
      }
    }
  }

  await scanDir(path.join(projectRoot, 'src'));
  return allChanges;
}

/**
 * Anzeige der geplanten Änderungen nach Dateien gruppiert
 */
function displayChanges(changes) {
  // Gruppiere Änderungen nach Datei
  const changesByFile = {};

  for (const change of changes) {
    const relativePath = path.relative(projectRoot, change.file);
    if (!changesByFile[relativePath]) {
      changesByFile[relativePath] = [];
    }
    changesByFile[relativePath].push(change);
  }

  console.log('\n=== Geplante Änderungen ===\n');
  console.log(
    `Insgesamt ${changes.length} Änderungen in ${Object.keys(changesByFile).length} Dateien gefunden.\n`
  );

  // Zeige Änderungen pro Datei
  for (const [file, fileChanges] of Object.entries(changesByFile)) {
    console.log(`\n[${file}] - ${fileChanges.length} Änderungen:`);

    for (const change of fileChanges) {
      console.log(`  Zeile ${change.lineNumber}:`);
      console.log(`    - ${change.originalImport}`);
      console.log(`    + ${change.newImport}`);
    }
  }
}

/**
 * Interaktive Benutzerabfrage
 */
async function promptUser(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Hauptfunktion
 */
async function main() {
  try {
    console.log('Suche nach relativen Imports...');
    const allChanges = await findAllChanges();

    if (allChanges.length === 0) {
      console.log('Keine relativen Imports gefunden, die migriert werden müssen.');
      return;
    }

    // Zeige alle geplanten Änderungen an
    displayChanges(allChanges);

    // Frage den Benutzer, ob die Änderungen angewendet werden sollen
    const answer = await promptUser(
      '\nMöchten Sie diese Änderungen anwenden? (j/n/f für Dateiauswahl): '
    );

    if (answer.toLowerCase() === 'j') {
      // Wende alle Änderungen an
      console.log('\nWende Änderungen an...');

      // Gruppiere Änderungen nach Datei
      const changesByFile = {};
      for (const change of allChanges) {
        if (!changesByFile[change.file]) {
          changesByFile[change.file] = [];
        }
        changesByFile[change.file].push(change);
      }

      // Wende Änderungen pro Datei an
      for (const [file, fileChanges] of Object.entries(changesByFile)) {
        await applyChanges(file, fileChanges);
        const relativePath = path.relative(projectRoot, file);
        console.log(`✓ ${relativePath} aktualisiert`);
      }

      console.log('\nMigration abgeschlossen!');
    } else if (answer.toLowerCase() === 'f') {
      // Erlaube dem Benutzer, einzelne Dateien auszuwählen
      const uniqueFiles = [...new Set(allChanges.map((c) => path.relative(projectRoot, c.file)))];
      console.log('\nVerfügbare Dateien:');

      uniqueFiles.forEach((file, idx) => {
        console.log(`${idx + 1}. ${file}`);
      });

      const selection = await promptUser(
        '\nGeben Sie die Nummern der zu migrierenden Dateien ein (durch Komma getrennt): '
      );
      const selectedIndices = selection
        .split(',')
        .map((s) => parseInt(s.trim()) - 1)
        .filter((i) => !isNaN(i) && i >= 0 && i < uniqueFiles.length);

      if (selectedIndices.length === 0) {
        console.log('Keine gültigen Dateien ausgewählt. Migration wird abgebrochen.');
        return;
      }

      const selectedFiles = selectedIndices.map((i) => uniqueFiles[i]);
      console.log(`\nAusgewählte Dateien: ${selectedFiles.join(', ')}`);

      // Wende Änderungen nur auf ausgewählte Dateien an
      for (const selectedFile of selectedFiles) {
        const fullPath = path.join(projectRoot, selectedFile);
        const fileChanges = allChanges.filter((c) => c.file === fullPath);

        if (fileChanges.length > 0) {
          await applyChanges(fullPath, fileChanges);
          console.log(`✓ ${selectedFile} aktualisiert`);
        }
      }

      console.log('\nSelektive Migration abgeschlossen!');
    } else {
      console.log('Migration abgebrochen.');
    }
  } catch (error) {
    console.error('Fehler bei der Migration:', error);
    process.exit(1);
  }
}

// Starte das Skript
main();
