#!/usr/bin/env tsx

/**
 * Evolution Hub Onboarding-Skript
 *
 * Dieses Skript führt neue Entwickler durch den Einrichtungsprozess
 * und stellt sicher, dass alle notwendigen Abhängigkeiten installiert sind.
 */

import * as readline from 'readline';
import { execSync } from 'child_process';

// Chalk-Konfiguration für ESM-Kompatibilität
const chalk = {
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
};
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

// Pfade für ESM-Module und Projekt-Root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

// DB-Name aus wrangler.toml (Fallback auf lokalen Standard)
function extractConfigValue(config: string, key: string): string | null {
  const regex = new RegExp(`${key}\\s*=\\s*["']([^"']+)["']`);
  const match = config.match(regex);
  return match ? match[1] : null;
}
const wranglerTomlPath = path.join(ROOT_DIR, 'wrangler.toml');
let DB_NAME = 'evolution-hub-main-local';
if (fs.existsSync(wranglerTomlPath)) {
  try {
    const wranglerConfigText = fs.readFileSync(wranglerTomlPath, 'utf-8');
    const maybe = extractConfigValue(wranglerConfigText, 'preview_database_id');
    if (maybe) DB_NAME = maybe;
  } catch {
    // still fallback to default
  }
}

// Erstelle eine readline-Schnittstelle
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// CI/TTY-Guard: Nur in interaktiven TTYs nach Eingaben fragen
const IS_INTERACTIVE = process.stdin.isTTY && !process.env.CI;

// ASCII-Art-Logo
const logo = `
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   ███████╗██╗   ██╗ ██████╗ ██╗     ██╗   ██╗████████╗║
║   ██╔════╝██║   ██║██╔═══██╗██║     ██║   ██║╚══██╔══╝║
║   █████╗  ██║   ██║██║   ██║██║     ██║   ██║   ██║   ║
║   ██╔══╝  ╚██╗ ██╔╝██║   ██║██║     ██║   ██║   ██║   ║
║   ███████╗ ╚████╔╝ ╚██████╔╝███████╗╚██████╔╝   ██║   ║
║   ╚══════╝  ╚═══╝   ╚═════╝ ╚══════╝ ╚═════╝    ╚═╝   ║
║                                                       ║
║   ██╗  ██╗██╗   ██╗██████╗                           ║
║   ██║  ██║██║   ██║██╔══██╗                          ║
║   ███████║██║   ██║██████╔╝                          ║
║   ██╔══██║██║   ██║██╔══██╗                          ║
║   ██║  ██║╚██████╔╝██████╔╝                          ║
║   ╚═╝  ╚═╝ ╚═════╝ ╚═════╝                           ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`;
// Funktion zum Erstellen eines Test-Benutzers
async function createTestUser() {
  console.log('\n👤 Erstelle Test-Benutzer für lokale Entwicklung...');
  try {
    // Importiere bcrypt für Passwort-Hashing
    const bcrypt = await import('bcrypt');

    // Test-Benutzer-Daten
    const testUser = {
      id: 'test-user-id-123',
      name: 'Test User',
      username: 'testuser',
      full_name: 'Test User',
      email: 'test@example.com',
      image: null,
      created_at: new Date().toISOString(),
      password_hash: await bcrypt.hash('password123', 10), // Einfaches Passwort für Testzwecke
    };

    // SQL für das Einfügen oder Aktualisieren des Test-Benutzers
    const insertUserSQL = `
      INSERT OR REPLACE INTO users (id, name, username, full_name, email, image, created_at, password_hash)
      VALUES ('${testUser.id}', '${testUser.name}', '${testUser.username}', '${testUser.full_name}', 
              '${testUser.email}', ${testUser.image === null ? 'NULL' : `'${testUser.image}'`}, 
              '${testUser.created_at}', '${testUser.password_hash}')
    `;

    // Finde alle SQLite-Dateien
    const sqliteFiles: string[] = [];

    // Haupt-SQLite-Datei
    const mainDbPath = path.join(
      ROOT_DIR,
      '.wrangler',
      'd1',
      'miniflare',
      'databases',
      `${DB_NAME}.sqlite`
    );
    if (fs.existsSync(mainDbPath)) {
      sqliteFiles.push(mainDbPath);
    }

    // Suche nach weiteren SQLite-Dateien
    const stateDbDir = path.join(
      ROOT_DIR,
      '.wrangler',
      'state',
      'v3',
      'd1',
      'miniflare-D1DatabaseObject'
    );
    if (fs.existsSync(stateDbDir)) {
      try {
        const stateFiles = fs.readdirSync(stateDbDir);
        for (const file of stateFiles) {
          if (file.endsWith('.sqlite')) {
            sqliteFiles.push(path.join(stateDbDir, file));
          }
        }
      } catch (error) {
        console.warn(`Konnte Verzeichnis ${stateDbDir} nicht lesen:`, error);
      }
    }

    // Schreibe SQL in eine temporäre Datei
    const tempSQLPath = path.join(os.tmpdir(), `test_user_${Date.now()}.sql`);
    fs.writeFileSync(tempSQLPath, insertUserSQL);

    // Führe SQL für jede gefundene SQLite-Datei aus
    let successCount = 0;
    for (const dbPath of sqliteFiles) {
      try {
        execSync(`cat ${tempSQLPath} | sqlite3 ${dbPath}`, { stdio: 'inherit' });
        console.log(`✅ Test-Benutzer in ${dbPath} erstellt/aktualisiert`);
        successCount++;
      } catch (error) {
        console.error(`❌ Fehler beim Erstellen des Test-Benutzers in ${dbPath}:`, error);
      }
    }

    // Lösche die temporäre Datei
    fs.unlinkSync(tempSQLPath);

    if (successCount > 0) {
      console.log(`\n✅ Test-Benutzer erfolgreich erstellt/aktualisiert!`);
      console.log('Login-Daten für lokale Entwicklung:');
      console.log('  E-Mail:    test@example.com');
      console.log('  Passwort:  password123');
    } else {
      console.error('❌ Konnte Test-Benutzer nicht erstellen.');
    }
  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Test-Benutzers:', error);
  }
}
// Hauptfunktion
async function main() {
  console.log('🚀 Starte Einrichtung der lokalen Entwicklungsumgebung...');

  if (!IS_INTERACTIVE) {
    console.log('\nNicht-interaktive Umgebung erkannt (CI oder kein TTY).');
    console.log(
      'Onboarding wird übersprungen. Führen Sie für die lokale Einrichtung stattdessen aus:'
    );
    console.log('  npm run setup:local');
    try {
      rl.close();
    } catch {}
    return;
  }

  await checkDependencies();
  // Nutze das vorhandene Setup, das alle Schritte orchestriert
  await setupEnvironment();

  console.log('\n✅ Lokale Entwicklungsumgebung wurde erfolgreich eingerichtet!');

  console.log('\nSie können jetzt den lokalen Entwicklungsserver starten mit:');
  console.log('  npm run dev');

  console.log('\nOder mit Verbindung zu Remote-Ressourcen:');
  console.log('  npx --no-install wrangler dev --remote');
}

// Überprüfe, ob alle Abhängigkeiten installiert sind
async function checkDependencies() {
  console.log(chalk.yellow('=== Abhängigkeiten überprüfen ==='));

  try {
    // Node.js-Version überprüfen
    const nodeVersion = execSync('node --version').toString().trim();
    console.log(`Node.js-Version: ${chalk.green(nodeVersion)}`);

    // npm-Version überprüfen
    const npmVersion = execSync('npm --version').toString().trim();
    console.log(`npm-Version: ${chalk.green(npmVersion)}`);

    // Wrangler überprüfen
    try {
      const wranglerVersion = execSync('npx --no-install wrangler --version').toString().trim();
      console.log(`Wrangler-Version: ${chalk.green(wranglerVersion)}`);
    } catch (error) {
      console.log(`Wrangler: ${chalk.red('Nicht gefunden')}`);
      console.log(chalk.yellow('Bitte installieren Sie Wrangler als Dev-Dependency im Projekt:'));
      console.log(chalk.cyan('  npm i -D wrangler'));
      console.log('Abbruch, damit Sie die Installation nachholen können.');
      process.exit(1);
    }

    // Abhängigkeiten installieren
    console.log('Installiere Projektabhängigkeiten...');
    execSync('npm install', { stdio: 'inherit' });

    console.log(chalk.green('✅ Alle Abhängigkeiten sind installiert!'));
  } catch (error) {
    console.error(chalk.red('Fehler beim Überprüfen der Abhängigkeiten:'));
    console.error(error);
    process.exit(1);
  }

  return new Promise<void>((resolve) => {
    console.log('');
    if (!IS_INTERACTIVE) return resolve();
    rl.question(chalk.yellow('Drücken Sie Enter, um fortzufahren...'), () => {
      resolve();
    });
  });
}

// Umgebung einrichten
async function setupEnvironment() {
  console.clear();
  console.log(chalk.cyan(logo));
  console.log(chalk.yellow('=== Entwicklungsumgebung einrichten ==='));

  try {
    // Lokale Umgebung einrichten
    console.log('Richte lokale Entwicklungsumgebung ein...');
    execSync('npm run setup:local', { stdio: 'inherit' });

    console.log(chalk.green('✅ Entwicklungsumgebung erfolgreich eingerichtet!'));
  } catch (error) {
    console.error(chalk.red('Fehler beim Einrichten der Entwicklungsumgebung:'));
    console.error(error);
  }

  return new Promise<void>((resolve) => {
    console.log('');
    if (!IS_INTERACTIVE) return resolve();
    rl.question(chalk.yellow('Drücken Sie Enter, um fortzufahren...'), () => {
      resolve();
    });
  });
}

// Shell-Aliase einrichten
async function setupShellAliases() {
  console.clear();
  console.log(chalk.cyan(logo));
  console.log(chalk.yellow('=== Shell-Aliase einrichten ==='));
  console.log('');
  console.log(
    'Shell-Aliase können Ihnen helfen, schnell auf häufig verwendete Befehle zuzugreifen.'
  );
  console.log('');

  const shellAliasPath = path.join(process.cwd(), 'scripts', 'shell-aliases.sh');
  const shellConfigPath = path.join(os.homedir(), getDefaultShellConfigFile());

  console.log(`Shell-Aliase befinden sich in: ${chalk.cyan(shellAliasPath)}`);
  console.log(`Ihre Shell-Konfigurationsdatei ist vermutlich: ${chalk.cyan(shellConfigPath)}`);
  console.log('');

  return new Promise<void>((resolve) => {
    if (!IS_INTERACTIVE) return resolve();
    rl.question(
      chalk.yellow('Möchten Sie die Shell-Aliase zu Ihrer Shell-Konfiguration hinzufügen? (j/n) '),
      async (answer) => {
        if (answer.toLowerCase() === 'j' || answer.toLowerCase() === 'ja') {
          try {
            // Prüfen, ob die Zeile bereits existiert
            const shellConfig = fs.existsSync(shellConfigPath)
              ? fs.readFileSync(shellConfigPath, 'utf8')
              : '';
            const sourceLine = `source "${shellAliasPath}"`;

            if (!shellConfig.includes(sourceLine)) {
              // Zeile zur Shell-Konfiguration hinzufügen
              fs.appendFileSync(shellConfigPath, `\n# Evolution Hub Aliase\n${sourceLine}\n`);
              console.log(
                chalk.green('✅ Shell-Aliase wurden zu Ihrer Shell-Konfiguration hinzugefügt!')
              );
              console.log(
                `Bitte führen Sie ${chalk.cyan('source ' + shellConfigPath)} aus, um die Änderungen zu aktivieren.`
              );
            } else {
              console.log(
                chalk.green('✅ Shell-Aliase sind bereits in Ihrer Shell-Konfiguration vorhanden.')
              );
            }
          } catch (error) {
            console.error(chalk.red('Fehler beim Hinzufügen der Shell-Aliase:'));
            console.error(error);
            console.log('');
            console.log(
              `Sie können die Aliase manuell hinzufügen, indem Sie folgende Zeile zu ${chalk.cyan(shellConfigPath)} hinzufügen:`
            );
            console.log(chalk.cyan(`source "${shellAliasPath}"`));
          }
        } else {
          console.log('');
          console.log(
            `Sie können die Aliase später manuell hinzufügen, indem Sie folgende Zeile zu ${chalk.cyan(shellConfigPath)} hinzufügen:`
          );
          console.log(chalk.cyan(`source "${shellAliasPath}"`));
        }

        console.log('');
        if (!IS_INTERACTIVE) return resolve();
        rl.question(chalk.yellow('Drücken Sie Enter, um fortzufahren...'), () => {
          resolve();
        });
      }
    );
  });
}

// Dokumentation anzeigen
async function showDocumentation() {
  console.clear();
  console.log(chalk.cyan(logo));
  console.log(chalk.yellow('=== Dokumentation ==='));
  console.log('');
  console.log('Hier sind einige wichtige Dokumentationsdateien:');
  console.log('');
  console.log(
    `- ${chalk.cyan('./docs/development/local-development.md')}: Anleitung zur lokalen Entwicklung`
  );
  console.log(`- ${chalk.cyan('./docs/cheat-sheet.md')}: Übersicht über häufig verwendete Befehle`);
  console.log(`- ${chalk.cyan('./docs/db_schema.md')}: Dokumentation des Datenbankschemas`);
  console.log('');

  return new Promise<void>((resolve) => {
    if (!IS_INTERACTIVE) return resolve();
    rl.question(
      chalk.yellow('Möchten Sie die Cheat-Sheet-Dokumentation öffnen? (j/n) '),
      (answer) => {
        if (answer.toLowerCase() === 'j' || answer.toLowerCase() === 'ja') {
          try {
            const cheatSheetPath = path.join(process.cwd(), 'docs', 'cheat-sheet.md');

            // Betriebssystem erkennen und entsprechenden Befehl ausführen
            if (process.platform === 'darwin') {
              // macOS
              execSync(`open "${cheatSheetPath}"`, { stdio: 'inherit' });
            } else if (process.platform === 'win32') {
              // Windows
              execSync(`start "" "${cheatSheetPath}"`, { stdio: 'inherit' });
            } else {
              // Linux und andere
              execSync(`xdg-open "${cheatSheetPath}"`, { stdio: 'inherit' });
            }

            console.log(chalk.green('✅ Cheat-Sheet wurde geöffnet!'));
          } catch (error) {
            console.error(chalk.red('Fehler beim Öffnen des Cheat-Sheets:'));
            console.error(error);
          }
        }

        resolve();
      }
    );
  });
}

// Hilfsfunktion zur Bestimmung der Standard-Shell-Konfigurationsdatei
function getDefaultShellConfigFile(): string {
  const shell = process.env.SHELL || '';

  if (shell.includes('zsh')) {
    return '.zshrc';
  } else if (shell.includes('bash')) {
    return '.bashrc';
  } else if (shell.includes('fish')) {
    return '.config/fish/config.fish';
  } else {
    // Fallback auf .bashrc
    return '.bashrc';
  }
}

void createTestUser;
void setupShellAliases;
void showDocumentation;

// Starte das Hauptprogramm
main().catch((error) => {
  console.error(chalk.red('Ein Fehler ist aufgetreten:'));
  console.error(error);
  process.exit(1);
});
