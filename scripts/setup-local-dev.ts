#!/usr/bin/env tsx

/**
 * Setup-Skript für lokale Entwicklungsumgebung
 * 
 * Dieses Skript automatisiert die Einrichtung der lokalen Entwicklungsumgebung:
 * 1. Erstellt lokale D1-Datenbank, falls nicht vorhanden
 * 2. Führt alle Migrations-Dateien aus
 * 3. Erstellt lokalen R2-Bucket, falls nicht vorhanden
 * 4. Erstellt lokalen KV-Namespace, falls nicht vorhanden
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Lade Umgebungsvariablen aus .env-Datei
dotenv.config();

// Pfade für ESM-Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT_DIR, 'migrations');

// Konfiguration aus wrangler.toml lesen
const WRANGLER_CONFIG = fs.readFileSync(path.join(ROOT_DIR, 'wrangler.toml'), 'utf-8');

// Extrahiere Konfigurationswerte
function extractConfigValue(config: string, key: string): string | null {
  const regex = new RegExp(`${key}\\s*=\\s*["']([^"']+)["']`);
  const match = config.match(regex);
  return match ? match[1] : null;
}

// Extrahiere Binding-Namen
const DB_BINDING = extractConfigValue(WRANGLER_CONFIG, 'binding') || 'DB';
const DB_NAME = extractConfigValue(WRANGLER_CONFIG, 'preview_database_id') || 'evolution-hub-main-local';
const R2_BINDING = extractConfigValue(WRANGLER_CONFIG, 'binding') || 'R2_AVATARS';
const R2_BUCKET = extractConfigValue(WRANGLER_CONFIG, 'preview_bucket_name') || 'evolution-hub-avatars-local';
const KV_BINDING = extractConfigValue(WRANGLER_CONFIG, 'binding') || 'SESSION';
const KV_NAMESPACE = extractConfigValue(WRANGLER_CONFIG, 'preview_id') || 'SESSION_LOCAL';

console.log('🚀 Starte Einrichtung der lokalen Entwicklungsumgebung...');

// 1. Lokale D1-Datenbank erstellen
console.log('\n📦 Erstelle lokale D1-Datenbank...');
try {
  // Prüfe, ob die Datenbank bereits existiert
  const dbList = execSync('npx wrangler d1 list', { encoding: 'utf-8' });
  
  if (!dbList.includes(DB_NAME)) {
    console.log(`Erstelle neue D1-Datenbank: ${DB_NAME}`);
    execSync(`npx wrangler d1 create ${DB_NAME}`, { stdio: 'inherit' });
  } else {
    console.log(`D1-Datenbank ${DB_NAME} existiert bereits.`);
  }
  
  // 2. Datenbankmigrationen ausführen
  console.log('\n🔄 Führe Datenbankmigrationen aus...');
  try {
    // Lese alle Migrationsdateien
    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sortiere nach Namen (0000_..., 0001_..., usw.)
    
    // Finde alle SQLite-Dateien, die vom Wrangler-Server verwendet werden könnten
    const sqliteFiles = [];
    
    // Haupt-SQLite-Datei im miniflare/databases-Verzeichnis
    const mainDbDir = path.join(ROOT_DIR, '.wrangler', 'd1', 'miniflare', 'databases');
    if (!fs.existsSync(mainDbDir)) {
      console.log(`Erstelle Verzeichnis für lokale D1-Datenbank: ${mainDbDir}`);
      fs.mkdirSync(mainDbDir, { recursive: true });
    }
    const mainDbPath = path.join(mainDbDir, `${DB_NAME}.sqlite`);
    sqliteFiles.push(mainDbPath);
    
    // Suche nach weiteren SQLite-Dateien im state/v3/d1-Verzeichnis
    const stateDbDir = path.join(ROOT_DIR, '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
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
    
    console.log(`Gefundene SQLite-Dateien: ${sqliteFiles.length}`);
    sqliteFiles.forEach(file => console.log(` - ${file}`));
    
    // Lese alle Migrations-SQL-Dateien und kombiniere sie zu einer einzigen SQL-Datei
    console.log('Kombiniere alle Migrationen zu einer einzigen SQL-Datei...');
    let combinedSQL = '';
    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
      const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
      
      // Füge IF NOT EXISTS zu CREATE TABLE-Anweisungen hinzu
      const safeSQL = sqlContent.replace(
        /CREATE TABLE ([^\(]+)/gi, 
        'CREATE TABLE IF NOT EXISTS $1'
      );
      
      combinedSQL += `\n-- Migration: ${migrationFile}\n${safeSQL}\n`;
    }
    
    // Schreibe die kombinierte SQL in eine temporäre Datei
    const tempSQLPath = path.join(os.tmpdir(), `combined_migrations_${Date.now()}.sql`);
    fs.writeFileSync(tempSQLPath, combinedSQL);
    
    // Führe die kombinierte SQL-Datei für jede gefundene SQLite-Datei aus
    for (const dbPath of sqliteFiles) {
      console.log(`Führe Migrationen für Datenbank aus: ${dbPath}`);
      
      try {
        // Stelle sicher, dass das Verzeichnis existiert
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
        }
        
        // Führe die SQL-Datei aus
        execSync(`cat ${tempSQLPath} | sqlite3 ${dbPath}`, { stdio: 'inherit' });
        console.log(`✅ Migrationen erfolgreich auf ${dbPath} angewendet`);
      } catch (error) {
        console.error(`❌ Fehler beim Ausführen der Migrationen auf ${dbPath}:`, error);
      }
    }
    
    // Lösche die temporäre Datei
    fs.unlinkSync(tempSQLPath);
    
    // Versuche auch den Wrangler-Befehl für die Hauptdatenbank
    try {
      console.log('Versuche auch Wrangler-Befehl für Migrationen...');
      for (const migrationFile of migrationFiles) {
        const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
        try {
          execSync(`npx wrangler d1 execute ${DB_NAME} --local --file=${migrationPath}`, { stdio: 'inherit' });
        } catch (error) {
          console.log(`Wrangler-Befehl für ${migrationFile} fehlgeschlagen (ignoriert).`);
        }
      }
    } catch (error) {
      console.log('Wrangler-Migrations-Befehle fehlgeschlagen (ignoriert).');
    }
  } catch (error) {
    console.error('❌ Fehler bei der D1-Migration:', error);
  }

  // 3. Lokalen R2-Bucket erstellen
  console.log('\n📁 Erstelle lokalen R2-Bucket...');
  try {
    // Prüfe, ob der Bucket bereits existiert
    const r2List = execSync('npx wrangler r2 bucket list', { encoding: 'utf-8' });
    
    if (!r2List.includes(R2_BUCKET)) {
      console.log(`Erstelle neuen R2-Bucket: ${R2_BUCKET}`);
      execSync(`npx wrangler r2 bucket create ${R2_BUCKET}`, { stdio: 'inherit' });
    } else {
      console.log(`R2-Bucket ${R2_BUCKET} existiert bereits.`);
    }
  } catch (error) {
    console.error('❌ Fehler bei der R2-Bucket-Erstellung:', error);
  }

  // 4. Lokalen KV-Namespace erstellen
  console.log('\n🔑 Erstelle lokalen KV-Namespace...');
  try {
    // Prüfe, ob der Namespace bereits existiert
    const kvList = execSync('npx wrangler kv namespace list', { encoding: 'utf-8' });
    
    if (!kvList.includes(KV_NAMESPACE)) {
      console.log(`Erstelle neuen KV-Namespace: ${KV_NAMESPACE}`);
      const createOutput = execSync(`npx wrangler kv namespace create ${KV_NAMESPACE}`, { encoding: 'utf-8' });
      
      // Extrahiere die ID aus der Ausgabe mit einem Regex
      const idMatch = createOutput.match(/id = "([^"]+)"/i);
      const namespaceId = idMatch ? idMatch[1] : null;
      
      if (namespaceId) {
        console.log(`KV-Namespace erstellt mit ID: ${namespaceId}`);
        // Aktualisiere wrangler.toml mit der neuen KV-Namespace-ID
        let updatedConfig = WRANGLER_CONFIG.replace(
          /preview_id\s*=\s*["'][^"']+["']/,
          `preview_id = "${namespaceId}"`
        );
        fs.writeFileSync(path.join(ROOT_DIR, 'wrangler.toml'), updatedConfig);
      }
    } else {
      console.log(`KV-Namespace ${KV_NAMESPACE} existiert bereits.`);
    }
  } catch (error) {
    console.error('❌ Fehler bei der KV-Namespace-Erstellung:', error);
  }

  console.log('\n✅ Lokale Entwicklungsumgebung wurde erfolgreich eingerichtet!');
  console.log('\nSie können jetzt den lokalen Entwicklungsserver starten mit:');
  console.log('  npm run dev');
  console.log('\nOder mit Verbindung zu Remote-Ressourcen:');
  console.log('  npm run dev:remote');

} catch (error) {
  console.error('❌ Fehler bei der Einrichtung der lokalen Entwicklungsumgebung:', error);
  process.exit(1);
}

console.log('\n✅ Lokale Entwicklungsumgebung wurde erfolgreich eingerichtet!');
console.log('\nSie können jetzt den lokalen Entwicklungsserver starten mit:');
console.log('  npm run dev');
console.log('\nOder mit Verbindung zu Remote-Ressourcen:');
console.log('  npm run dev:remote');
