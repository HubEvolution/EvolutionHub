#!/usr/bin/env tsx

/**
 * Interaktives Entwicklungsmenü für Evolution Hub
 * 
 * Dieses Skript bietet ein einfaches interaktives Menü für die wichtigsten Entwicklungsbefehle.
 */

import * as readline from 'readline';
import { execSync } from 'child_process';

// Chalk-Konfiguration für ESM-Kompatibilität
const chalk = {
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`
};

// CI/TTY-Guard: In nicht-interaktiven Umgebungen sofort beenden
const IS_INTERACTIVE = Boolean(process.stdin.isTTY) && !process.env.CI;

// Erstelle eine readline-Schnittstelle
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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

// Hauptmenü-Optionen
const mainMenuOptions = [
  { key: '1', label: 'Lokale Entwicklung', action: 'dev-menu' },
  { key: '2', label: 'Remote-Entwicklung (Live-Daten)', action: 'wrangler dev --remote' },
  { key: '3', label: 'Lokale Umgebung einrichten', action: 'setup:local' },
  { key: '4', label: 'Datenbank-Verwaltung', action: 'db-menu' },
  { key: '5', label: 'Build & Deployment', action: 'build-menu' },
  { key: '6', label: 'Tests ausführen', action: 'test-menu' },
  { key: '0', label: 'Beenden', action: 'exit' }
];

// Lokale Entwicklungs-Menü-Optionen
const devMenuOptions = [
  { key: '1', label: 'UI-Entwicklung (Astro-Server)', action: 'dev:astro' },
  { key: '2', label: 'Cloudflare-Entwicklung (Wrangler mit D1/R2/KV)', action: 'dev' },
  { key: '3', label: 'Lokale Datenbank zurücksetzen & Migrationen anwenden', action: 'reset-db-menu' },
  { key: '0', label: 'Zurück zum Hauptmenü', action: 'main-menu' }
];

// Datenbank-Reset-Menü-Optionen
const resetDbMenuOptions = [
  { key: '1', label: 'Alle Migrationen neu anwenden', action: 'apply-all-migrations' },
  { key: '2', label: 'Lokale Datenbank löschen und neu erstellen', action: 'recreate-db' },
  { key: '0', label: 'Zurück zum Entwicklungsmenü', action: 'dev-menu' }
];

// Datenbank-Menü-Optionen
const dbMenuOptions = [
  { key: '1', label: 'Lokale Datenbank einrichten', action: 'db:setup' },
  { key: '2', label: 'Datenbank-Schema generieren', action: 'db:generate' },
  { key: '3', label: 'Migrationen ausführen', action: 'db:migrate' },
  { key: '4', label: 'D1-Datenbank anzeigen', action: 'npx --no-install wrangler d1 list' },
  { key: '5', label: 'Remote-DB-Migrationen', action: 'remote-migrations-menu' },
  { key: '0', label: 'Zurück zum Hauptmenü', action: 'main-menu' }
];

// Build-Menü-Optionen
const buildMenuOptions = [
  { key: '1', label: 'Build erstellen', action: 'build' },
  { key: '2', label: 'Build mit Watch-Modus', action: 'build:watch' },
  { key: '3', label: 'Preview starten', action: 'preview' },
  { key: '4', label: 'Deployment', action: 'deploy-menu' },
  { key: '0', label: 'Zurück zum Hauptmenü', action: 'main-menu' }
];

// Deployment-Menü-Optionen
const deployMenuOptions = [
  { key: '1', label: 'Deploy zu Staging', action: 'deploy-staging' },
  { key: '2', label: 'Deploy zu Production (mit Bestätigung)', action: 'deploy-production' },
  { key: '3', label: 'Logs ansehen (Staging)', action: 'tail-staging' },
  { key: '4', label: 'Logs ansehen (Production)', action: 'tail-production' },
  { key: '5', label: 'Staging öffnen', action: 'open-staging' },
  { key: '6', label: 'Production öffnen', action: 'open-production' },
  { key: '0', label: 'Zurück zum Build & Deployment', action: 'build-menu' }
];

// Remote-Migrationen-Menü-Optionen
const remoteMigrationsMenuOptions = [
  { key: '1', label: 'Neueste Migration auf Staging anwenden', action: 'apply-latest-migration-staging' },
  { key: '2', label: 'Neueste Migration auf Production anwenden (mit Bestätigung)', action: 'apply-latest-migration-production' },
  { key: '0', label: 'Zurück zur DB-Verwaltung', action: 'db-menu' }
];

// Test-Menü-Optionen
const testMenuOptions = [
  { key: '1', label: 'Unit-Tests ausführen', action: 'test' },
  { key: '2', label: 'Unit-Tests im Watch-Modus', action: 'test:watch' },
  { key: '3', label: 'E2E-Tests ausführen', action: 'test:e2e' },
  { key: '4', label: 'E2E-Tests mit UI', action: 'test:e2e:ui' },
  { key: '0', label: 'Zurück zum Hauptmenü', action: 'main-menu' }
];

// Funktion zum Anzeigen des Menüs
function displayMenu(options: typeof mainMenuOptions, title: string) {
  console.clear();
  console.log(chalk.cyan(logo));
  console.log(chalk.yellow(`=== ${title} ===`));
  console.log('');
  
  options.forEach(option => {
    console.log(`${chalk.green(option.key)}: ${option.label}`);
  });
  
  console.log('');
  rl.question(chalk.yellow('Wählen Sie eine Option: '), (answer) => {
    handleMenuSelection(answer, options);
  });
}

// Funktion zum Ausführen eines npm-Befehls
function runNpmCommand(command: string) {
  console.clear();
  console.log(chalk.yellow(`Führe aus: npm run ${command}`));
  console.log(chalk.gray('-------------------------------------'));
  
  try {
    execSync(`npm run ${command}`, { stdio: 'inherit' });
  } catch (error) {
    console.error(chalk.red(`Fehler beim Ausführen von 'npm run ${command}'`));
  }
  
  console.log('');
  console.log(chalk.gray('-------------------------------------'));
  console.log(chalk.green('Befehl abgeschlossen.'));
  
  rl.question(chalk.yellow('Drücken Sie Enter, um fortzufahren...'), () => {
    displayMainMenu();
  });
}

// Funktion zum Ausführen eines direkten Befehls
function runCommand(command: string) {
  console.clear();
  console.log(chalk.yellow(`Führe aus: ${command}`));
  console.log(chalk.gray('-------------------------------------'));
  
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(chalk.red(`Fehler beim Ausführen von '${command}'`));
  }
  
  console.log('');
  console.log(chalk.gray('-------------------------------------'));
  console.log(chalk.green('Befehl abgeschlossen.'));
  
  rl.question(chalk.yellow('Drücken Sie Enter, um fortzufahren...'), () => {
    displayMainMenu();
  });
}

// Hilfsfunktionen für das Deployment-Menü
function displayDeployMenu() {
  displayMenu(deployMenuOptions as any, 'Deployment');
}

function deployToEnv(env: 'staging' | 'production') {
  console.clear();
  console.log(chalk.yellow(`Starte Deployment für ${env.toUpperCase()}...`));
  console.log(chalk.gray('-------------------------------------'));
  try {
    console.log(chalk.cyan('Schritt 1/2: Worker-Build ausführen (npm run build:worker)...'));
    execSync('npm run build:worker', { stdio: 'inherit' });
    console.log(chalk.cyan('\nSchritt 2/2: Wrangler Deploy ausführen...'));
    execSync(`npx --no-install wrangler deploy --env ${env}`, { stdio: 'inherit' });
    console.log(chalk.green('\n✓ Deployment abgeschlossen.'));
  } catch (error) {
    console.error(chalk.red(`✗ Deployment fehlgeschlagen: ${error}`));
  }
  console.log('');
  rl.question(chalk.yellow('Drücken Sie Enter, um zum Deployment-Menü zurückzukehren...'), () => {
    displayDeployMenu();
  });
}

function confirmProductionDeploy(onConfirm: () => void) {
  console.clear();
  console.log(chalk.red('Achtung: Sie sind dabei, auf PRODUCTION zu deployen!'));
  console.log('');
  console.log(chalk.yellow('Zur Bestätigung tippen Sie bitte exakt: hub-evolution.com'));
  rl.question(chalk.yellow('Eingabe: '), (answer) => {
    if (answer.trim() === 'hub-evolution.com') {
      onConfirm();
    } else {
      console.log(chalk.red('Abgebrochen: Eingabe stimmte nicht überein.'));
      setTimeout(displayDeployMenu, 1500);
    }
  });
}

function tailEnv(env: 'staging' | 'production') {
  console.clear();
  console.log(chalk.yellow(`Starte Log Tail für ${env.toUpperCase()}... (Beenden mit Ctrl+C)`));
  console.log(chalk.gray('-------------------------------------'));
  try {
    execSync(`npx --no-install wrangler tail --env ${env} --format=pretty`, { stdio: 'inherit' });
  } catch (error) {
    // tail beendet typischerweise per Ctrl+C; Fehler hier ignorieren
  }
  console.log('');
  rl.question(chalk.yellow('Drücken Sie Enter, um zum Deployment-Menü zurückzukehren...'), () => {
    displayDeployMenu();
  });
}

function openUrl(url: string) {
  try {
    execSync(`open ${url}`, { stdio: 'inherit' });
  } catch (error) {
    console.error(chalk.red(`Konnte URL nicht öffnen: ${url}`));
  }
  rl.question(chalk.yellow('Drücken Sie Enter, um zum Deployment-Menü zurückzukehren...'), () => {
    displayDeployMenu();
  });
}

// Remote-Migrationen: Menü und Aktionen
function displayRemoteMigrationsMenu() {
  displayMenu(remoteMigrationsMenuOptions as any, 'Remote-DB-Migrationen');
}

async function applyLatestMigrationToEnv(env: 'staging' | 'production') {
  console.clear();
  console.log(chalk.yellow(`Wende neueste Migration auf ${env.toUpperCase()} an...`));
  console.log(chalk.gray('-------------------------------------'));
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log(chalk.red('Keine Migrationsdateien gefunden.'));
      rl.question(chalk.yellow('Enter zum Zurückkehren...'), () => displayRemoteMigrationsMenu());
      return;
    }

    const latestMigration = migrationFiles[migrationFiles.length - 1];
    const migrationPath = path.join(MIGRATIONS_DIR, latestMigration);
    const dbName = getDbNameForEnv(env);

    if (env === 'production') {
      console.log(chalk.red('Achtung: Migration auf PRODUCTION!'));
      console.log(chalk.yellow('Zur Bestätigung tippen Sie bitte exakt: hub-evolution.com'));
      rl.question(chalk.yellow('Eingabe: '), (answer) => {
        if (answer.trim() !== 'hub-evolution.com') {
          console.log(chalk.red('Abgebrochen: Eingabe stimmte nicht überein.'));
          setTimeout(displayRemoteMigrationsMenu, 1500);
        } else {
          try {
            execSync(`npx --no-install wrangler d1 execute ${dbName} --env ${env} --file=${migrationPath}`, { stdio: 'inherit' });
            console.log(chalk.green(`✓ Migration angewendet: ${latestMigration}`));
          } catch (err) {
            console.error(chalk.red(`✗ Fehler bei Migration: ${err}`));
          }
          rl.question(chalk.yellow('Enter zum Zurückkehren...'), () => displayRemoteMigrationsMenu());
        }
      });
      return;
    }

    try {
      execSync(`npx --no-install wrangler d1 execute ${dbName} --env ${env} --file=${migrationPath}`, { stdio: 'inherit' });
      console.log(chalk.green(`✓ Migration angewendet: ${latestMigration}`));
    } catch (err) {
      console.error(chalk.red(`✗ Fehler bei Migration: ${err}`));
    }
  } catch (error) {
    console.error(chalk.red(`Fehler beim Anwenden der Migration: ${error}`));
  }
  rl.question(chalk.yellow('Enter zum Zurückkehren...'), () => displayRemoteMigrationsMenu());
}

function getDbNameForEnv(env: 'staging' | 'production') {
  // Basierend auf wrangler.toml Konfiguration
  return env === 'production' ? 'evolution-hub-main' : 'evolution-hub-main-local';
}

// Funktion zum Anzeigen des Hauptmenüs
function displayMainMenu() {
  displayMenu(mainMenuOptions, 'Evolution Hub Entwicklungsmenü');
}

// Funktion zum Anzeigen des Datenbank-Menüs
function displayDbMenu() {
  displayMenu(dbMenuOptions, 'Datenbank-Verwaltung');
}

// Funktion zum Anzeigen des Build-Menüs
function displayBuildMenu() {
  displayMenu(buildMenuOptions, 'Build & Deployment');
}

// Funktion zum Anzeigen des Test-Menüs
function displayTestMenu() {
  displayMenu(testMenuOptions, 'Tests');
}

// Funktion zum Anzeigen des Entwicklungsmenüs
function displayDevMenu() {
  displayMenu(devMenuOptions, 'Lokale Entwicklung');
}

// Funktion zum Anzeigen des Datenbank-Reset-Menüs
function displayResetDbMenu() {
  displayMenu(resetDbMenuOptions, 'Datenbank zurücksetzen');
}

// Funktion zum Anwenden aller Migrationen (lokal)
async function applyAllMigrations() {
  console.clear();
  console.log(chalk.yellow('Wende alle Migrationen auf die lokale D1-Datenbank an...'));
  console.log(chalk.gray('-------------------------------------'));
  
  try {
    // Lese alle Migrationsdateien aus dem migrations-Verzeichnis
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
    
    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sortiere nach Namen (0000_..., 0001_..., usw.)
    
    // Wende jede Migrationsdatei an
    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
      console.log(chalk.cyan(`Wende Migration an: ${migrationFile}`));
      
      try {
        execSync(`npx --no-install wrangler d1 execute evolution-hub-main-local --local --file=${migrationPath}`, { stdio: 'inherit' });
        console.log(chalk.green(`✓ Migration erfolgreich angewendet: ${migrationFile}`));
      } catch (error) {
        console.error(chalk.red(`✗ Fehler bei Migration ${migrationFile}: ${error}`));
      }
    }
    
    console.log(chalk.green('\n✓ Alle Migrationen wurden angewendet!'));
  } catch (error) {
    console.error(chalk.red(`Fehler beim Anwenden der Migrationen: ${error}`));
  }
  
  console.log('');
  console.log(chalk.gray('-------------------------------------'));
  
  rl.question(chalk.yellow('Drücken Sie Enter, um fortzufahren...'), () => {
    displayResetDbMenu();
  });
}

// Funktion zum Löschen und Neuerstellen der lokalen Datenbank
async function recreateLocalDb() {
  console.clear();
  console.log(chalk.yellow('Lösche und erstelle die lokale D1-Datenbank neu...'));
  console.log(chalk.gray('-------------------------------------'));
  
  try {
    // Lösche die lokale D1-Datenbank
    console.log(chalk.cyan('Lösche lokale D1-Datenbank...'));
    
    // Finde alle SQLite-Dateien, die vom Wrangler-Server verwendet werden könnten
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const ROOT_DIR = path.join(__dirname, '..');
    
    // Haupt-SQLite-Datei im miniflare/databases-Verzeichnis
    const mainDbDir = path.join(ROOT_DIR, '.wrangler', 'd1', 'miniflare', 'databases');
    if (fs.existsSync(mainDbDir)) {
      const mainDbPath = path.join(mainDbDir, 'evolution-hub-main-local.sqlite');
      if (fs.existsSync(mainDbPath)) {
        fs.unlinkSync(mainDbPath);
        console.log(chalk.green(`✓ Gelöscht: ${mainDbPath}`));
      }
    }
    
    // Suche nach weiteren SQLite-Dateien im state/v3/d1-Verzeichnis
    const stateDbDir = path.join(ROOT_DIR, '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
    if (fs.existsSync(stateDbDir)) {
      const stateFiles = fs.readdirSync(stateDbDir);
      for (const file of stateFiles) {
        if (file.endsWith('.sqlite')) {
          const filePath = path.join(stateDbDir, file);
          fs.unlinkSync(filePath);
          console.log(chalk.green(`✓ Gelöscht: ${filePath}`));
        }
      }
    }
    
    // Erstelle die lokale D1-Datenbank neu
    console.log(chalk.cyan('\nErstelle lokale D1-Datenbank neu...'));
    try {
      execSync('npx --no-install wrangler d1 create evolution-hub-main-local', { stdio: 'inherit' });
    } catch (error) {
      // Ignoriere Fehler, wenn die Datenbank bereits existiert
      console.log(chalk.yellow('Hinweis: Die Datenbank existiert möglicherweise bereits.'));
    }
    
    // Wende alle Migrationen an
    console.log(chalk.cyan('\nWende alle Migrationen an...'));
    await applyAllMigrations();
    
  } catch (error) {
    console.error(chalk.red(`Fehler beim Neuerstellen der Datenbank: ${error}`));
  }
  
  console.log('');
  console.log(chalk.gray('-------------------------------------'));
  
  rl.question(chalk.yellow('Drücken Sie Enter, um fortzufahren...'), () => {
    displayResetDbMenu();
  });
}

// Funktion zum Behandeln der Menüauswahl
function handleMenuSelection(answer: string, options: typeof mainMenuOptions) {
  const selectedOption = options.find(option => option.key === answer);
  
  if (!selectedOption) {
    console.log(chalk.red('Ungültige Option. Bitte versuchen Sie es erneut.'));
    setTimeout(() => {
      if (options === mainMenuOptions) displayMainMenu();
      else if (options === dbMenuOptions) displayDbMenu();
      else if (options === buildMenuOptions) displayBuildMenu();
      else if (options === testMenuOptions) displayTestMenu();
      else if (options === devMenuOptions) displayDevMenu();
      else if (options === resetDbMenuOptions) displayResetDbMenu();
      else if (options === deployMenuOptions as any) displayDeployMenu();
      else if (options === remoteMigrationsMenuOptions as any) displayRemoteMigrationsMenu();
    }, 1500);
    return;
  }
  
  switch (selectedOption.action) {
    case 'exit':
      console.log(chalk.green('Auf Wiedersehen!'));
      rl.close();
      break;
    case 'main-menu':
      displayMainMenu();
      break;
    case 'db-menu':
      displayDbMenu();
      break;
    case 'build-menu':
      displayBuildMenu();
      break;
    case 'test-menu':
      displayTestMenu();
      break;
    case 'dev-menu':
      displayDevMenu();
      break;
    case 'reset-db-menu':
      displayResetDbMenu();
      break;
    case 'deploy-menu':
      displayDeployMenu();
      break;
    case 'deploy-staging':
      deployToEnv('staging');
      break;
    case 'deploy-production':
      confirmProductionDeploy(() => deployToEnv('production'));
      break;
    case 'tail-staging':
      tailEnv('staging');
      break;
    case 'tail-production':
      tailEnv('production');
      break;
    case 'open-staging':
      openUrl('https://staging.hub-evolution.com');
      break;
    case 'open-production':
      openUrl('https://hub-evolution.com');
      break;
    case 'remote-migrations-menu':
      displayRemoteMigrationsMenu();
      break;
    case 'apply-latest-migration-staging':
      applyLatestMigrationToEnv('staging');
      break;
    case 'apply-latest-migration-production':
      applyLatestMigrationToEnv('production');
      break;
    case 'apply-all-migrations':
      applyAllMigrations();
      break;
    case 'recreate-db':
      recreateLocalDb();
      break;
    default:
      if (selectedOption.action.startsWith('wrangler') || 
          selectedOption.action.startsWith('npx')) {
        let cmd = selectedOption.action;
        if (cmd.startsWith('wrangler')) {
          cmd = `npx --no-install ${cmd}`;
        } else if (cmd.startsWith('npx wrangler')) {
          cmd = cmd.replace(/^npx wrangler\b/, 'npx --no-install wrangler');
        }
        runCommand(cmd);
      } else {
        runNpmCommand(selectedOption.action);
      }
      break;
  }
}

// Starte das Hauptmenü (nicht in CI/Non-TTY)
if (!IS_INTERACTIVE) {
  console.log(chalk.yellow('Nicht-interaktive Umgebung erkannt (CI oder kein TTY). Menü wird übersprungen.'));
  try { rl.close(); } catch {}
  process.exit(0);
}
displayMainMenu();

// Event-Handler für das Schließen der readline-Schnittstelle
rl.on('close', () => {
  process.exit(0);
});