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
  { key: '1', label: 'Lokale Entwicklung', action: 'dev' },
  { key: '2', label: 'Remote-Entwicklung (Live-Daten)', action: 'dev:remote' },
  { key: '3', label: 'Lokale Umgebung einrichten', action: 'setup:local' },
  { key: '4', label: 'Datenbank-Verwaltung', action: 'db-menu' },
  { key: '5', label: 'Build & Deployment', action: 'build-menu' },
  { key: '6', label: 'Tests ausführen', action: 'test-menu' },
  { key: '0', label: 'Beenden', action: 'exit' }
];

// Datenbank-Menü-Optionen
const dbMenuOptions = [
  { key: '1', label: 'Lokale Datenbank einrichten', action: 'db:setup' },
  { key: '2', label: 'Datenbank-Schema generieren', action: 'db:generate' },
  { key: '3', label: 'Migrationen ausführen', action: 'db:migrate' },
  { key: '4', label: 'D1-Datenbank anzeigen', action: 'wrangler d1 list' },
  { key: '0', label: 'Zurück zum Hauptmenü', action: 'main-menu' }
];

// Build-Menü-Optionen
const buildMenuOptions = [
  { key: '1', label: 'Build erstellen', action: 'build' },
  { key: '2', label: 'Build mit Watch-Modus', action: 'build:watch' },
  { key: '3', label: 'Preview starten', action: 'preview' },
  { key: '0', label: 'Zurück zum Hauptmenü', action: 'main-menu' }
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
    default:
      if (selectedOption.action.startsWith('wrangler') || 
          selectedOption.action.startsWith('npx')) {
        runCommand(selectedOption.action);
      } else {
        runNpmCommand(selectedOption.action);
      }
      break;
  }
}

// Starte das Hauptmenü
displayMainMenu();

// Event-Handler für das Schließen der readline-Schnittstelle
rl.on('close', () => {
  process.exit(0);
});
