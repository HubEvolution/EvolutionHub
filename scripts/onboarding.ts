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
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`
};
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

// Hauptfunktion
async function main() {
  console.clear();
  console.log(chalk.cyan(logo));
  console.log(chalk.yellow('=== Evolution Hub Onboarding ==='));
  console.log('');
  console.log(chalk.green('Willkommen beim Evolution Hub Onboarding-Prozess!'));
  console.log('Dieses Skript führt Sie durch die Einrichtung Ihrer Entwicklungsumgebung.');
  console.log('');
  
  await checkDependencies();
  await setupEnvironment();
  await setupShellAliases();
  await showDocumentation();
  
  console.log('');
  console.log(chalk.green('✅ Onboarding abgeschlossen!'));
  console.log('');
  console.log(chalk.yellow('Nächste Schritte:'));
  console.log('1. Starten Sie das interaktive Menü mit: ' + chalk.cyan('npm run menu'));
  console.log('2. Oder starten Sie direkt den Entwicklungsserver mit: ' + chalk.cyan('npm run dev'));
  console.log('3. Schauen Sie sich die Dokumentation unter ' + chalk.cyan('./docs/') + ' an');
  console.log('');
  
  rl.close();
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
      const wranglerVersion = execSync('npx wrangler --version').toString().trim();
      console.log(`Wrangler-Version: ${chalk.green(wranglerVersion)}`);
    } catch (error) {
      console.log(`Wrangler: ${chalk.red('Nicht installiert')}`);
      console.log('Installiere Wrangler...');
      execSync('npm install -g wrangler', { stdio: 'inherit' });
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
  
  return new Promise<void>(resolve => {
    console.log('');
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
  
  return new Promise<void>(resolve => {
    console.log('');
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
  console.log('Shell-Aliase können Ihnen helfen, schnell auf häufig verwendete Befehle zuzugreifen.');
  console.log('');
  
  const shellAliasPath = path.join(process.cwd(), 'scripts', 'shell-aliases.sh');
  const shellConfigPath = path.join(os.homedir(), getDefaultShellConfigFile());
  
  console.log(`Shell-Aliase befinden sich in: ${chalk.cyan(shellAliasPath)}`);
  console.log(`Ihre Shell-Konfigurationsdatei ist vermutlich: ${chalk.cyan(shellConfigPath)}`);
  console.log('');
  
  return new Promise<void>(resolve => {
    rl.question(chalk.yellow('Möchten Sie die Shell-Aliase zu Ihrer Shell-Konfiguration hinzufügen? (j/n) '), async (answer) => {
      if (answer.toLowerCase() === 'j' || answer.toLowerCase() === 'ja') {
        try {
          // Prüfen, ob die Zeile bereits existiert
          const shellConfig = fs.existsSync(shellConfigPath) ? fs.readFileSync(shellConfigPath, 'utf8') : '';
          const sourceLine = `source "${shellAliasPath}"`;
          
          if (!shellConfig.includes(sourceLine)) {
            // Zeile zur Shell-Konfiguration hinzufügen
            fs.appendFileSync(shellConfigPath, `\n# Evolution Hub Aliase\n${sourceLine}\n`);
            console.log(chalk.green('✅ Shell-Aliase wurden zu Ihrer Shell-Konfiguration hinzugefügt!'));
            console.log(`Bitte führen Sie ${chalk.cyan('source ' + shellConfigPath)} aus, um die Änderungen zu aktivieren.`);
          } else {
            console.log(chalk.green('✅ Shell-Aliase sind bereits in Ihrer Shell-Konfiguration vorhanden.'));
          }
        } catch (error) {
          console.error(chalk.red('Fehler beim Hinzufügen der Shell-Aliase:'));
          console.error(error);
          console.log('');
          console.log(`Sie können die Aliase manuell hinzufügen, indem Sie folgende Zeile zu ${chalk.cyan(shellConfigPath)} hinzufügen:`);
          console.log(chalk.cyan(`source "${shellAliasPath}"`));
        }
      } else {
        console.log('');
        console.log(`Sie können die Aliase später manuell hinzufügen, indem Sie folgende Zeile zu ${chalk.cyan(shellConfigPath)} hinzufügen:`);
        console.log(chalk.cyan(`source "${shellAliasPath}"`));
      }
      
      console.log('');
      rl.question(chalk.yellow('Drücken Sie Enter, um fortzufahren...'), () => {
        resolve();
      });
    });
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
  console.log(`- ${chalk.cyan('./docs/local-development.md')}: Anleitung zur lokalen Entwicklung`);
  console.log(`- ${chalk.cyan('./docs/cheat-sheet.md')}: Übersicht über häufig verwendete Befehle`);
  console.log(`- ${chalk.cyan('./docs/db_schema.md')}: Dokumentation des Datenbankschemas`);
  console.log('');
  
  return new Promise<void>(resolve => {
    rl.question(chalk.yellow('Möchten Sie die Cheat-Sheet-Dokumentation öffnen? (j/n) '), (answer) => {
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
    });
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

// Starte das Hauptprogramm
main().catch(error => {
  console.error(chalk.red('Ein Fehler ist aufgetreten:'));
  console.error(error);
  process.exit(1);
});
