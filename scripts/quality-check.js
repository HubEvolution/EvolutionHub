#!/usr/bin/env node

/**
 * Quality Check Script - Manual-only Alternative zu Pre-commit Hooks
 *
 * Verwendung:
 * - Vor wichtigen Commits: node scripts/quality-check.js
 * - Vor PRs: node scripts/quality-check.js --strict
 * - Schnelle Prüfung: node scripts/quality-check.js --quick
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

const args = process.argv.slice(2);
const isStrict = args.includes('--strict');
const isQuick = args.includes('--quick');

console.log('🔍 Evolution Hub - Quality Check');
console.log('================================\n');

// Farbcodes für Terminal-Ausgabe
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bright: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  try {
    log(`⏳ ${description}...`, 'blue');
    execSync(command, { stdio: 'pipe', encoding: 'utf-8' });
    log(`✅ ${description} erfolgreich`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} fehlgeschlagen: ${error.message}`, 'red');
    return false;
  }
}

async function runQualityChecks() {
  const results = [];

  // 1. Grundlegende Linting (immer)
  log('\n📋 Schritt 1: Code-Qualität prüfen', 'bright');
  results.push(runCommand('npm run lint', 'ESLint-Prüfung'));

  // 2. TypeScript Check (immer)
  results.push(runCommand('npx astro check --tsconfig tsconfig.astro.json', 'TypeScript-Prüfung'));

  // 3. Formatierung (nur bei --strict)
  if (isStrict) {
    log('\n🎨 Schritt 2: Formatierung prüfen', 'bright');
    results.push(runCommand('npm run format:check', 'Prettier Formatierungsprüfung'));
  }

  // 4. Tests (nur bei --strict)
  if (isStrict) {
    log('\n🧪 Schritt 3: Tests ausführen', 'bright');
    results.push(runCommand('npm run test:coverage', 'Unit Tests mit Coverage'));
  }

  // 5. Security Audit (nur bei --strict)
  if (isStrict) {
    log('\n🔒 Schritt 4: Sicherheitsprüfung', 'bright');
    results.push(runCommand('npm audit --audit-level=moderate', 'Security Audit'));
  }

  // 6. Schnelle Tests (nur bei --quick)
  if (isQuick) {
    log('\n⚡ Schnelle Tests ausführen', 'bright');
    results.push(runCommand('npm run test:unit', 'Unit Tests (ohne Coverage)'));
  }

  // Zusammenfassung
  const passed = results.filter(Boolean).length;
  const total = results.length;

  log('\n📊 Zusammenfassung:', 'bright');
  log(`✅ Bestanden: ${passed}/${total}`, passed === total ? 'green' : 'yellow');
  log(`❌ Fehlgeschlagen: ${total - passed}/${total}`, passed === total ? 'green' : 'red');

  if (passed === total) {
    log('\n🎉 Alle Qualitätsprüfungen bestanden!', 'green');
    log('✅ Dein Code ist bereit für Commit/PR!', 'green');
    return true;
  } else {
    log('\n⚠️  Einige Prüfungen sind fehlgeschlagen.', 'yellow');
    log('💡 Tipp: Verwende --quick für schnellere Entwicklung oder behebe die Fehler.', 'blue');
    return false;
  }
}

// Hilfsfunktion für bessere Fehlerbehandlung
function showHelp() {
  log('\n📖 Verwendung:', 'bright');
  log('node scripts/quality-check.js [options]\n', 'blue');

  log('Optionen:', 'bright');
  log('  --quick    Schnelle Prüfung (nur Linting + TypeScript)', 'green');
  log('  --strict   Vollständige Prüfung (alle CI-Gates)', 'yellow');
  log('  --help     Diese Hilfe anzeigen', 'blue');
  log('\nOhne Optionen: Grundlegende Prüfung (Linting + TypeScript)', 'reset');
}

// Hauptlogik
if (args.includes('--help')) {
  showHelp();
  process.exit(0);
}

// Prüfe ob wir uns in einem Git-Repository befinden
if (!existsSync('.git')) {
  log('❌ Nicht in einem Git-Repository!', 'red');
  process.exit(1);
}

// Führe Qualitätsprüfungen durch
const success = await runQualityChecks();
process.exit(success ? 0 : 1);
