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
const WRANGLER_TOML_PATH = path.join(ROOT_DIR, 'wrangler.toml');
let WRANGLER_CONFIG = '';
let WRANGLER_TOML_EXISTS = false;
try {
  if (fs.existsSync(WRANGLER_TOML_PATH)) {
    WRANGLER_CONFIG = fs.readFileSync(WRANGLER_TOML_PATH, 'utf-8');
    WRANGLER_TOML_EXISTS = true;
  } else {
    console.warn('wrangler.toml nicht gefunden – verwende Fallback-Defaults für lokale Entwicklung.');
  }
} catch (err) {
  console.warn('Konnte wrangler.toml nicht lesen – verwende Fallback-Defaults für lokale Entwicklung.', err);
}

// Interaktivitäts- und Wrangler-Verfügbarkeits-Checks
const IS_INTERACTIVE = Boolean(process.stdin.isTTY) && !process.env.CI;
let WRANGLER_AVAILABLE = false;
try {
  execSync('npx --no-install wrangler --version', { stdio: 'pipe' });
  WRANGLER_AVAILABLE = true;
} catch {
  WRANGLER_AVAILABLE = false;
}

// Utility: check if a column exists in a table
function columnExists(dbPath: string, table: string, column: string): boolean {
  try {
    const out = execSync(`sqlite3 ${dbPath} "PRAGMA table_info('${table}');"`, {
      encoding: 'utf-8',
    });
    return out.split('\n').some((line) => line.includes(`|${column}|`) || line.split('|')[1] === column);
  } catch {
    return false;
  }
}

// Utility: add a column if it does not exist
function addColumnIfMissing(dbPath: string, table: string, column: string, definition: string) {
  if (!columnExists(dbPath, table, column)) {
    try {
      execSync(`sqlite3 ${dbPath} "ALTER TABLE ${table} ADD COLUMN ${column} ${definition};"`, { stdio: 'inherit' });
      console.log(`✅ Added column ${table}.${column} to ${dbPath}`);
    } catch (err) {
      console.warn(`⚠️ Could not add column ${table}.${column} on ${dbPath} (may already exist).`, err);
    }
  } else {
    console.log(`ℹ️ Column ${table}.${column} already exists on ${dbPath}`);
  }
}

// Utility: run SQL safely with IF NOT EXISTS patterns
function runSafeSQL(dbPath: string, sql: string) {
  try {
    const tmp = path.join(os.tmpdir(), `safe_${Date.now()}.sql`);
    fs.writeFileSync(tmp, sql);
    execSync(`cat ${tmp} | sqlite3 ${dbPath}`, { stdio: 'inherit' });
    fs.unlinkSync(tmp);
  } catch (err) {
    console.warn(`⚠️ Safe SQL execution warning on ${dbPath}:`, err);
  }
}

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
      password_hash: await bcrypt.hash('password123', 10) // Einfaches Passwort für Testzwecke
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
    const mainDbPath = path.join(ROOT_DIR, '.wrangler', 'd1', 'miniflare', 'databases', `${DB_NAME}.sqlite`);
    if (fs.existsSync(mainDbPath)) {
      sqliteFiles.push(mainDbPath);
    }
    
    // Suche nach weiteren SQLite-Dateien
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
  // Optional: Remote-D1 in interaktiven Umgebungen einrichten (kann Login erfordern)
  if (IS_INTERACTIVE && WRANGLER_AVAILABLE) {
    // Prüfe, ob die Datenbank bereits existiert (remote)
    const dbList = execSync('npx --no-install wrangler d1 list', { encoding: 'utf-8' });
    if (!dbList.includes(DB_NAME)) {
      console.log(`Erstelle neue D1-Datenbank (remote): ${DB_NAME}`);
      execSync(`npx --no-install wrangler d1 create ${DB_NAME}`, { stdio: 'inherit' });
    } else {
      console.log(`D1-Datenbank (remote) ${DB_NAME} existiert bereits.`);
    }
  } else {
    console.log('⏭️  Überspringe Remote-D1-Setup (nicht-interaktiv oder Wrangler nicht verfügbar).');
  }
  
  // 2. Datenbankmigrationen ausführen
  console.log('\n🔄 Führe Datenbankmigrationen aus...');
  try {
    // Lese alle Migrationsdateien
    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sortiere nach Namen (0000_..., 0001_..., usw.)
    
    // Definiere die Hauptdatenbank-Datei, die von Wrangler verwendet wird
    const mainDbDir = path.join(ROOT_DIR, '.wrangler', 'd1', 'miniflare', 'databases');
    if (!fs.existsSync(mainDbDir)) {
      console.log(`Erstelle Verzeichnis für lokale D1-Datenbank: ${mainDbDir}`);
      fs.mkdirSync(mainDbDir, { recursive: true });
    }
    const mainDbPath = path.join(mainDbDir, `${DB_NAME}.sqlite`);
    
    // Stelle sicher, dass die Hauptdatenbank existiert und merke, ob sie neu erstellt wurde
    const mainDbExisted = fs.existsSync(mainDbPath);
    if (!mainDbExisted) {
      console.log(`Erstelle leere Datenbank-Datei: ${mainDbPath}`);
      fs.writeFileSync(mainDbPath, ''); // Erstelle eine leere Datei
    }
    
    console.log(`\n🔍 Primäre Wrangler-Datenbank: ${mainDbPath}`);
    
    if (!mainDbExisted) {
      // Wende jede Migrationsdatei einzeln auf die Hauptdatenbank an
      console.log('\n💾 Wende Migrationen direkt auf die Wrangler-Datenbank an...');
      let migrationsApplied = 0;
      
      for (const migrationFile of migrationFiles) {
        const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
        console.log(`\n📃 Wende Migration an: ${migrationFile}`);
        
        try {
          // Lese den SQL-Inhalt
          const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
          
          // Verwende die SQL-Anweisung direkt, da die Migrationsdateien bereits IF NOT EXISTS enthalten
          const safeSQL = sqlContent;
          
          // Schreibe die sichere SQL in eine temporäre Datei
          const tempSQLPath = path.join(os.tmpdir(), `migration_${Date.now()}.sql`);
          fs.writeFileSync(tempSQLPath, safeSQL);
          
          // Führe die SQL direkt auf der Hauptdatenbank aus
          execSync(`cat ${tempSQLPath} | sqlite3 ${mainDbPath}`, { stdio: 'inherit' });
          console.log(`✅ Migration ${migrationFile} erfolgreich angewendet`);
          
          // Lösche die temporäre Datei
          fs.unlinkSync(tempSQLPath);
          migrationsApplied++;
        } catch (error) {
          console.error(`❌ Fehler bei Migration ${migrationFile}:`, error);
        }
      }
      
      console.log(`\n✅ ${migrationsApplied} von ${migrationFiles.length} Migrationen erfolgreich angewendet!`);
    } else {
      console.log('\nℹ️ Überspringe Migrationen auf Hauptdatenbank (bereits vorhanden). Schema-Guards folgen.');
    }
    
    // Suche nach weiteren SQLite-Dateien im state/v3/d1-Verzeichnis
    console.log('\n🔍 Suche nach weiteren Wrangler-Datenbanken...');
    const sqliteFiles: string[] = [];
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
    
    if (sqliteFiles.length > 0) {
      console.log(`Gefundene zusätzliche SQLite-Dateien: ${sqliteFiles.length}`);
      sqliteFiles.forEach(file => console.log(` - ${file}`));
      
      // Kombiniere alle Migrationen für die zusätzlichen Datenbanken
      console.log('\nKombiniere alle Migrationen für zusätzliche Datenbanken...');
      let combinedSQL = '';
      
      for (const migrationFile of migrationFiles) {
        // Überspringe risikoreiche ALTER-Migrationen für zusätzliche DBs; Guards kümmern sich darum
        if (migrationFile.startsWith('0002_add_password_hash_to_users') ||
            migrationFile.startsWith('0007_add_email_verification')) {
          console.log(`⏭️  Überspringe ${migrationFile} für zusätzliche DBs (durch Guards abgedeckt).`);
          continue;
        }

        const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
        const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
        
        // Einige Migrationsdateien könnten ohne IF NOT EXISTS brechen; stelle sicher, dass CREATE TABLE abgesichert ist
        let safeSQL = sqlContent;
        if (!safeSQL.includes('IF NOT EXISTS')) {
          safeSQL = safeSQL.replace(
            /CREATE TABLE ([^\(]+)/gi, 
            'CREATE TABLE IF NOT EXISTS $1'
          );
        }
        
        combinedSQL += `\n-- Migration: ${migrationFile}\n${safeSQL}\n`;
      }
      
      // Schreibe die kombinierte SQL in eine temporäre Datei
      const tempSQLPath = path.join(os.tmpdir(), `combined_migrations_${Date.now()}.sql`);
      fs.writeFileSync(tempSQLPath, combinedSQL);
      
      // Führe die kombinierte SQL-Datei für jede zusätzliche SQLite-Datei aus
      for (const dbPath of sqliteFiles) {
        console.log(`Führe Migrationen für zusätzliche Datenbank aus: ${dbPath}`);
        
        try {
          execSync(`cat ${tempSQLPath} | sqlite3 ${dbPath}`, { stdio: 'inherit' });
          console.log(`✅ Migrationen erfolgreich auf ${dbPath} angewendet`);
        } catch (error) {
          console.error(`❌ Fehler beim Ausführen der Migrationen auf ${dbPath}:`, error);
        }
      }
      
      // Lösche die temporäre Datei
      fs.unlinkSync(tempSQLPath);
    } else {
      console.log('Keine zusätzlichen Datenbanken gefunden.');
    }

    
    // Überprüfe, ob die wichtigsten Tabellen existieren
    console.log('\n🔍 Überprüfe, ob alle wichtigen Tabellen existieren...');
    try {
      const tables = execSync(`sqlite3 ${mainDbPath} ".tables"`, { encoding: 'utf-8' });
      console.log(`Gefundene Tabellen: ${tables}`);
      
      // Überprüfe, ob die sessions-Tabelle existiert
    if (!tables.includes('sessions')) {
      console.log('⚠️ Die sessions-Tabelle fehlt! Wende die Migration direkt an...');
      const sessionsMigrationPath = path.join(MIGRATIONS_DIR, '0001_add_sessions_table.sql');
      if (fs.existsSync(sessionsMigrationPath)) {
        execSync(`cat ${sessionsMigrationPath} | sqlite3 ${mainDbPath}`, { stdio: 'inherit' });
        console.log(`✅ Sessions-Tabelle erfolgreich erstellt!`);
      } else {
        console.error('❌ Konnte die Sessions-Migrations-Datei nicht finden!');
      }
    } else {
      console.log('✅ Sessions-Tabelle existiert!');
    }
  } catch (error) {
    console.error('❌ Fehler beim Überprüfen der Tabellen:', error);
  }

  // 2b. Idempotente Schema-Guards für lokale DBs (stellt sicher, dass Spalten/Tabellen vorhanden sind)
  try {
    console.log('\n🛡️  Stelle Schema-Konsistenz sicher (idempotente Guards)...');
    // Sammle alle bekannten lokalen DB-Dateien
    const dbPaths: string[] = [];
    const mainDbDir = path.join(ROOT_DIR, '.wrangler', 'd1', 'miniflare', 'databases');
    const mainDbPath2 = path.join(mainDbDir, `${DB_NAME}.sqlite`);
    if (fs.existsSync(mainDbPath2)) dbPaths.push(mainDbPath2);
    const stateDbDir2 = path.join(ROOT_DIR, '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
    if (fs.existsSync(stateDbDir2)) {
      for (const f of fs.readdirSync(stateDbDir2)) {
        if (f.endsWith('.sqlite')) dbPaths.push(path.join(stateDbDir2, f));
      }
    }

    for (const dbPath of dbPaths) {
      // users.password_hash
      addColumnIfMissing(dbPath, 'users', 'password_hash', 'TEXT');
      // users.email_verified (INTEGER as boolean)
      addColumnIfMissing(dbPath, 'users', 'email_verified', 'INTEGER NOT NULL DEFAULT 0');
      // users.email_verified_at (Unix timestamp seconds)
      addColumnIfMissing(dbPath, 'users', 'email_verified_at', 'INTEGER NULL');

      // email_verification_tokens table and indexes
      runSafeSQL(
        dbPath,
        `CREATE TABLE IF NOT EXISTS email_verification_tokens (
           token TEXT PRIMARY KEY,
           user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
           email TEXT NOT NULL,
           created_at INTEGER NOT NULL,
           expires_at INTEGER NOT NULL,
           used_at INTEGER NULL
         );
         CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
         CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);
         CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_email ON email_verification_tokens(email);`
      );
    }
    console.log('✅ Schema-Guards abgeschlossen.');
  } catch (error) {
    console.warn('⚠️ Schema-Guards konnten nicht vollständig ausgeführt werden (fortgesetzt).', error);
  }
  } catch (error) {
    console.error('❌ Fehler bei der D1-Migration:', error);
  }

  // 3. Lokalen R2-Bucket erstellen
  console.log('\n🪣 Erstelle lokalen R2-Bucket...');
  try {
    if (IS_INTERACTIVE && WRANGLER_AVAILABLE) {
      // Prüfe, ob der Bucket bereits existiert (remote)
      const r2List = execSync('npx --no-install wrangler r2 bucket list', { encoding: 'utf-8' });
      if (!r2List.includes(R2_BUCKET)) {
        execSync(`npx --no-install wrangler r2 bucket create ${R2_BUCKET}`, { stdio: 'inherit' });
      } else {
        console.log(`R2-Bucket ${R2_BUCKET} existiert bereits.`);
      }
    } else {
      console.log('⏭️  Überspringe Remote-R2-Setup (nicht-interaktiv oder Wrangler nicht verfügbar).');
    }
  } catch (error) {
    console.error('❌ Fehler bei der R2-Bucket-Erstellung:', error);
  }

  // 4. Lokalen KV-Namespace erstellen
  console.log('\n🔑 Erstelle lokalen KV-Namespace...');
  try {
    if (IS_INTERACTIVE && WRANGLER_AVAILABLE) {
      // Prüfe, ob der Namespace bereits existiert (remote)
      const kvList = execSync('npx --no-install wrangler kv namespace list', { encoding: 'utf-8' });
      
      if (!kvList.includes(KV_NAMESPACE)) {
        console.log(`Erstelle neuen KV-Namespace: ${KV_NAMESPACE}`);
        const createOutput = execSync(`npx --no-install wrangler kv namespace create ${KV_NAMESPACE}`, { encoding: 'utf-8' });
        
        // Extrahiere die ID aus der Ausgabe mit einem Regex
        const idMatch = createOutput.match(/id = "([^"]+)"/i);
        let namespaceId: string | null = null;
        if (idMatch) {
          namespaceId = idMatch[1];
        }
        
        if (namespaceId) {
          console.log(`KV-Namespace erstellt mit ID: ${namespaceId}`);
          // Aktualisiere wrangler.toml mit der neuen KV-Namespace-ID (nur wenn vorhanden)
          if (WRANGLER_TOML_EXISTS) {
            const hasPreviewId = /preview_id\s*=\s*["'][^"']+["']/.test(WRANGLER_CONFIG);
            const updatedConfig = hasPreviewId
              ? WRANGLER_CONFIG.replace(
                  /preview_id\s*=\s*["'][^"']+["']/,
                  `preview_id = "${namespaceId}"`
                )
              : `${WRANGLER_CONFIG}\npreview_id = "${namespaceId}"\n`;
            fs.writeFileSync(WRANGLER_TOML_PATH, updatedConfig);
          } else {
            console.warn('wrangler.toml ist nicht vorhanden – bitte fügen Sie die preview_id manuell hinzu oder erstellen Sie eine wrangler.toml.');
            console.warn(`Vorgeschlagene Zeile: preview_id = "${namespaceId}"`);
          }
        }
      } else {
        console.log(`KV-Namespace ${KV_NAMESPACE} existiert bereits.`);
      }
    } else {
      console.log('⏭️  Überspringe Remote-KV-Setup (nicht-interaktiv oder Wrangler nicht verfügbar).');
    }
  } catch (error) {
    console.error('❌ Fehler bei der KV-Namespace-Erstellung:', error);
  }

  // 5. Test-Benutzer erstellen
  await createTestUser();

  console.log('\n✅ Lokale Entwicklungsumgebung wurde erfolgreich eingerichtet!');
  console.log('\nSie können jetzt den lokalen Entwicklungsserver starten mit:');
  console.log('  npm run dev');
  console.log('\nOder mit Verbindung zu Remote-Ressourcen:');
  console.log('  npx --no-install wrangler dev --remote');

} catch (error) {
  console.error('❌ Fehler bei der Einrichtung der lokalen Entwicklungsumgebung:', error);
  process.exit(1);
}
