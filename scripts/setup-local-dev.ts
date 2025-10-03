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
    console.warn(
      'wrangler.toml nicht gefunden – verwende Fallback-Defaults für lokale Entwicklung.'
    );
  }
} catch (err) {
  console.warn(
    'Konnte wrangler.toml nicht lesen – verwende Fallback-Defaults für lokale Entwicklung.',
    err
  );
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
    return out
      .split('\n')
      .some((line) => line.includes(`|${column}|`) || line.split('|')[1] === column);
  } catch {
    return false;
  }
}

// Utility: add a column if it does not exist
function addColumnIfMissing(dbPath: string, table: string, column: string, definition: string) {
  if (!columnExists(dbPath, table, column)) {
    try {
      execSync(`sqlite3 ${dbPath} "ALTER TABLE ${table} ADD COLUMN ${column} ${definition};"`, {
        stdio: 'inherit',
      });
      console.log(`✅ Added column ${table}.${column} to ${dbPath}`);
    } catch (err) {
      console.warn(
        `⚠️ Could not add column ${table}.${column} on ${dbPath} (may already exist).`,
        err
      );
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
    const nowIso = new Date().toISOString();
    const nowUnix = Math.floor(Date.now() / 1000);

    // Test-Benutzer-Daten
    const testUser = {
      id: 'test-user-id-123',
      name: 'Test User',
      username: 'testuser',
      full_name: 'Test User',
      email: 'test@example.com',
      image: null,
      created_at: nowIso,
    };

    // SQL für das Einfügen oder Aktualisieren des Test-Benutzers
    const insertUserSQL = `
      INSERT OR REPLACE INTO users (id, name, username, full_name, email, image, created_at, email_verified, email_verified_at, plan)
      VALUES ('${testUser.id}', '${testUser.name}', '${testUser.username}', '${testUser.full_name}',
              '${testUser.email}', ${testUser.image === null ? 'NULL' : `'${testUser.image}'`},
              '${testUser.created_at}', 1, ${nowUnix}, 'free')
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

// Zusätzliche Test-Suite-v2 Benutzer (admin, regular, premium) anlegen und verifizieren
async function createSuiteV2TestUsers() {
  console.log('\n👥 Erstelle Test-Suite v2 Benutzer (admin, user, premium)...');
  try {
    const nowIso = new Date().toISOString();
    const nowUnix = Math.floor(Date.now() / 1000);

    const users = [
      {
        id: 'e2e-admin-0001',
        name: 'Test Admin',
        username: 'admin',
        full_name: 'Test Admin',
        email: 'admin@test-suite.local',
        password: 'AdminPass123!',
      },
      {
        id: 'e2e-user-0001',
        name: 'Test User',
        username: 'user',
        full_name: 'Test User',
        email: 'user@test-suite.local',
        password: 'UserPass123!',
      },
      {
        id: 'e2e-premium-0001',
        name: 'Test Premium',
        username: 'premium',
        full_name: 'Test Premium',
        email: 'premium@test-suite.local',
        password: 'PremiumPass123!',
      },
    ];

    // Finde alle SQLite-Dateien (wie oben)
    const sqliteFiles: string[] = [];
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

    let successCount = 0;
    for (const u of users) {
      const insertSQL = `
        INSERT INTO users (id, name, username, full_name, email, image, created_at, email_verified, email_verified_at, plan)
        VALUES ('${u.id}', '${u.name}', '${u.username}', '${u.full_name}', '${u.email}', NULL, '${nowIso}', 1, ${nowUnix}, 'free')
        ON CONFLICT(email) DO UPDATE SET
          name=excluded.name,
          username=excluded.username,
          full_name=excluded.full_name,
          image=excluded.image,
          created_at=excluded.created_at,
          email_verified=excluded.email_verified,
          email_verified_at=excluded.email_verified_at,
          plan=excluded.plan;
      `;

      const tempSQLPath = path.join(os.tmpdir(), `suitev2_user_${u.username}_${Date.now()}.sql`);
      fs.writeFileSync(tempSQLPath, insertSQL);

      for (const dbPath of sqliteFiles) {
        try {
          execSync(`cat ${tempSQLPath} | sqlite3 ${dbPath}`, { stdio: 'inherit' });
          console.log(`✅ Benutzer ${u.email} in ${dbPath} erstellt/aktualisiert`);
          successCount++;
        } catch (error) {
          console.error(
            `❌ Fehler beim Erstellen/Aktualisieren für ${u.email} in ${dbPath}:`,
            error
          );
        }
      }

      fs.unlinkSync(tempSQLPath);
    }

    if (successCount > 0) {
      console.log('\n✅ Test-Suite v2 Benutzer erfolgreich erstellt/aktualisiert!');
      console.log('Login-Daten:');
      console.log('  Admin   : admin@test-suite.local / AdminPass123!');
      console.log('  User    : user@test-suite.local / UserPass123!');
      console.log('  Premium : premium@test-suite.local / PremiumPass123!');
    } else {
      console.error('❌ Keine Test-Suite v2 Benutzer konnten erstellt werden.');
    }
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Test-Suite v2 Benutzer:', error);
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
const DB_NAME =
  extractConfigValue(WRANGLER_CONFIG, 'preview_database_id') || 'evolution-hub-main-local';
const R2_BINDING = extractConfigValue(WRANGLER_CONFIG, 'binding') || 'R2_AVATARS';
const R2_BUCKET =
  extractConfigValue(WRANGLER_CONFIG, 'preview_bucket_name') || 'evolution-hub-avatars-local';
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
    console.log(
      '⏭️  Überspringe Remote-D1-Setup (nicht-interaktiv oder Wrangler nicht verfügbar).'
    );
  }

  // 2. Datenbankmigrationen ausführen
  console.log('\n🔄 Führe Datenbankmigrationen aus...');
  try {
    // Lese alle Migrationsdateien
    const migrationFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
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

      console.log(
        `\n✅ ${migrationsApplied} von ${migrationFiles.length} Migrationen erfolgreich angewendet!`
      );
    } else {
      console.log(
        '\nℹ️ Überspringe Migrationen auf Hauptdatenbank (bereits vorhanden). Schema-Guards folgen.'
      );
    }

    // Suche nach weiteren SQLite-Dateien im state/v3/d1-Verzeichnis
    console.log('\n🔍 Suche nach weiteren Wrangler-Datenbanken...');
    const sqliteFiles: string[] = [];
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

    if (sqliteFiles.length > 0) {
      console.log(`Gefundene zusätzliche SQLite-Dateien: ${sqliteFiles.length}`);
      sqliteFiles.forEach((file) => console.log(` - ${file}`));
      // Hinweis: Wir wenden KEINE kombinierten Migrationen mehr auf zusätzliche DBs an.
      // Stattdessen verlassen wir uns vollständig auf die idempotenten Schema-Guards weiter unten,
      // um notwendige Tabellen/Spalten/Indizes sicher zu erstellen. Das vermeidet laute Parse-Fehler
      // durch doppelte Indizes/Trigger oder nicht vorhandene Spalten in optionalen Features.
      console.log(
        '\n⏭️  Überspringe das Anwenden kombinierter Migrationen auf zusätzliche DBs. Guards übernehmen Konsistenz.'
      );
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
      const stateDbDir2 = path.join(
        ROOT_DIR,
        '.wrangler',
        'state',
        'v3',
        'd1',
        'miniflare-D1DatabaseObject'
      );
      if (fs.existsSync(stateDbDir2)) {
        for (const f of fs.readdirSync(stateDbDir2)) {
          if (f.endsWith('.sqlite')) dbPaths.push(path.join(stateDbDir2, f));
        }
      }

      for (const dbPath of dbPaths) {
        // Ensure modern comments table exists
        runSafeSQL(
          dbPath,
          `
        CREATE TABLE IF NOT EXISTS comments (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          author_id INTEGER NOT NULL DEFAULT 0,
          author_name TEXT NOT NULL,
          author_email TEXT NOT NULL,
          parent_id TEXT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          is_edited INTEGER DEFAULT 0,
          edited_at INTEGER NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `
        );
        // Migrate legacy comments table (postId/author/createdAt) → modern schema if detected
        const hasLegacyPostId = columnExists(dbPath, 'comments', 'postId');
        const hasLegacyAuthor = columnExists(dbPath, 'comments', 'author');
        const hasLegacyCreatedAt = columnExists(dbPath, 'comments', 'createdAt');
        if (hasLegacyPostId && hasLegacyAuthor && hasLegacyCreatedAt) {
          console.log(`\n⚙️  Migriere Legacy-Comments-Schema in ${dbPath} → modernes Schema...`);
          runSafeSQL(
            dbPath,
            `
          PRAGMA foreign_keys=OFF;
          BEGIN TRANSACTION;
          CREATE TABLE IF NOT EXISTS comments_new (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            author_id INTEGER DEFAULT 0,
            author_name TEXT NOT NULL DEFAULT 'Anonymous',
            author_email TEXT NOT NULL DEFAULT '',
            parent_id TEXT,
            entity_type TEXT NOT NULL DEFAULT 'blog_post',
            entity_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            is_edited INTEGER DEFAULT 0,
            edited_at INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          );
          INSERT INTO comments_new (
            id, content, author_id, author_name, author_email, parent_id,
            entity_type, entity_id, status, is_edited, edited_at, created_at, updated_at
          )
          SELECT
            id,
            content,
            0 as author_id,
            COALESCE(author, 'Anonymous') as author_name,
            '' as author_email,
            NULL as parent_id,
            'blog_post' as entity_type,
            postId as entity_id,
            CASE approved WHEN 1 THEN 'approved' ELSE 'pending' END as status,
            0 as is_edited,
            NULL as edited_at,
            CAST(strftime('%s', createdAt) AS INTEGER) as created_at,
            CAST(strftime('%s', 'now') AS INTEGER) as updated_at
          FROM comments;
          DROP TABLE comments;
          ALTER TABLE comments_new RENAME TO comments;
          COMMIT;
          PRAGMA foreign_keys=ON;
        `
          );
          // Rebuild indices for modern schema
          if (
            columnExists(dbPath, 'comments', 'entity_type') &&
            columnExists(dbPath, 'comments', 'entity_id')
          ) {
            runSafeSQL(
              dbPath,
              'CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);'
            );
          }
          if (columnExists(dbPath, 'comments', 'status')) {
            runSafeSQL(
              dbPath,
              'CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);'
            );
          }
          if (columnExists(dbPath, 'comments', 'author_id')) {
            runSafeSQL(
              dbPath,
              'CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);'
            );
          }
          if (columnExists(dbPath, 'comments', 'parent_id')) {
            runSafeSQL(
              dbPath,
              'CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);'
            );
          }
          if (columnExists(dbPath, 'comments', 'created_at')) {
            runSafeSQL(
              dbPath,
              'CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);'
            );
          }
        }
        // users.email_verified (INTEGER as boolean)
        addColumnIfMissing(dbPath, 'users', 'email_verified', 'INTEGER NOT NULL DEFAULT 0');
        // users.email_verified_at (Unix timestamp seconds)
        addColumnIfMissing(dbPath, 'users', 'email_verified_at', 'INTEGER NULL');
        // users.plan (plan-based entitlements; default 'free')
        addColumnIfMissing(dbPath, 'users', 'plan', "TEXT NOT NULL DEFAULT 'free'");

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

        // comments table: ensure required columns exist (idempotent guards)
        addColumnIfMissing(dbPath, 'comments', 'entity_type', 'TEXT');
        addColumnIfMissing(dbPath, 'comments', 'entity_id', 'TEXT');
        addColumnIfMissing(dbPath, 'comments', 'status', "TEXT DEFAULT 'pending'");
        addColumnIfMissing(dbPath, 'comments', 'author_id', 'INTEGER');
        addColumnIfMissing(dbPath, 'comments', 'parent_id', 'TEXT');
        addColumnIfMissing(dbPath, 'comments', 'created_at', 'INTEGER');
        addColumnIfMissing(dbPath, 'comments', 'updated_at', 'INTEGER');
        addColumnIfMissing(dbPath, 'comments', 'is_edited', 'INTEGER DEFAULT 0');
        addColumnIfMissing(dbPath, 'comments', 'edited_at', 'INTEGER');
        addColumnIfMissing(dbPath, 'comments', 'author_name', 'TEXT');
        addColumnIfMissing(dbPath, 'comments', 'author_email', 'TEXT');

        // comments indices: only create if referenced columns exist
        if (
          columnExists(dbPath, 'comments', 'entity_type') &&
          columnExists(dbPath, 'comments', 'entity_id')
        ) {
          runSafeSQL(
            dbPath,
            'CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);'
          );
        }
        if (columnExists(dbPath, 'comments', 'status')) {
          runSafeSQL(dbPath, 'CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);');
        }
        if (columnExists(dbPath, 'comments', 'author_id')) {
          runSafeSQL(
            dbPath,
            'CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);'
          );
        }
        if (columnExists(dbPath, 'comments', 'parent_id')) {
          runSafeSQL(
            dbPath,
            'CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);'
          );
        }
        if (columnExists(dbPath, 'comments', 'created_at')) {
          runSafeSQL(
            dbPath,
            'CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);'
          );
        }

        // comment_reports table
        runSafeSQL(
          dbPath,
          `
        CREATE TABLE IF NOT EXISTS comment_reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          comment_id TEXT NOT NULL,
          reporter_id INTEGER NULL,
          reporter_email TEXT NULL,
          reason TEXT NOT NULL,
          description TEXT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at INTEGER NOT NULL,
          reviewed_at INTEGER NULL,
          reviewed_by INTEGER NULL
        );
        CREATE INDEX IF NOT EXISTS idx_comment_reports_comment ON comment_reports(comment_id);
        CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON comment_reports(status);
        CREATE INDEX IF NOT EXISTS idx_comment_reports_created_at ON comment_reports(created_at);
      `
        );

        // comment_moderation table
        runSafeSQL(
          dbPath,
          `
        CREATE TABLE IF NOT EXISTS comment_moderation (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          comment_id TEXT NOT NULL,
          moderator_id INTEGER NULL,
          action TEXT NOT NULL,
          reason TEXT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_comment_moderation_comment ON comment_moderation(comment_id);
        CREATE INDEX IF NOT EXISTS idx_comment_moderation_moderator ON comment_moderation(moderator_id);
        CREATE INDEX IF NOT EXISTS idx_comment_moderation_created_at ON comment_moderation(created_at);
      `
        );

        // comment_audit_logs table
        runSafeSQL(
          dbPath,
          `
        CREATE TABLE IF NOT EXISTS comment_audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          comment_id TEXT NOT NULL,
          user_id INTEGER NULL,
          action TEXT NOT NULL,
          old_values TEXT NULL,
          new_values TEXT NULL,
          reason TEXT NULL,
          ip_address TEXT NULL,
          user_agent TEXT NULL,
          metadata TEXT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_comment_audit_logs_comment_id ON comment_audit_logs(comment_id);
        CREATE INDEX IF NOT EXISTS idx_comment_audit_logs_user_id ON comment_audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_comment_audit_logs_action ON comment_audit_logs(action);
        CREATE INDEX IF NOT EXISTS idx_comment_audit_logs_created_at ON comment_audit_logs(created_at);
      `
        );

        // notifications table: ensure is_read column exists and indices
        addColumnIfMissing(dbPath, 'notifications', 'is_read', 'INTEGER DEFAULT 0');
        if (columnExists(dbPath, 'notifications', 'is_read')) {
          runSafeSQL(
            dbPath,
            'CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);'
          );
          if (columnExists(dbPath, 'notifications', 'user_id')) {
            runSafeSQL(
              dbPath,
              'CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = 0;'
            );
          }
        }
      }
      console.log('✅ Schema-Guards abgeschlossen.');
    } catch (error) {
      console.warn(
        '⚠️ Schema-Guards konnten nicht vollständig ausgeführt werden (fortgesetzt).',
        error
      );
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
      console.log(
        '⏭️  Überspringe Remote-R2-Setup (nicht-interaktiv oder Wrangler nicht verfügbar).'
      );
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
        const createOutput = execSync(
          `npx --no-install wrangler kv namespace create ${KV_NAMESPACE}`,
          { encoding: 'utf-8' }
        );

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
            console.warn(
              'wrangler.toml ist nicht vorhanden – bitte fügen Sie die preview_id manuell hinzu oder erstellen Sie eine wrangler.toml.'
            );
            console.warn(`Vorgeschlagene Zeile: preview_id = "${namespaceId}"`);
          }
        }
      } else {
        console.log(`KV-Namespace ${KV_NAMESPACE} existiert bereits.`);
      }
    } else {
      console.log(
        '⏭️  Überspringe Remote-KV-Setup (nicht-interaktiv oder Wrangler nicht verfügbar).'
      );
    }
  } catch (error) {
    console.error('❌ Fehler bei der KV-Namespace-Erstellung:', error);
  }

  // 5. Test-Benutzer erstellen (nur wenn Legacy-Auth verwendet wird)
  if ((process.env.AUTH_PROVIDER || '').toLowerCase() !== 'stytch') {
    await createTestUser();
    await createSuiteV2TestUsers();
  } else {
    console.log('\n⏭️  Überspringe Passwort-basierte Test-User-Seeds (AUTH_PROVIDER=stytch)');
  }

  console.log('\n✅ Lokale Entwicklungsumgebung wurde erfolgreich eingerichtet!');
  console.log('\nSie können jetzt den lokalen Entwicklungsserver starten mit:');
  console.log('  npm run dev');
  console.log('\nOder mit Verbindung zu Remote-Ressourcen:');
  console.log('  npx --no-install wrangler dev --remote');
} catch (error) {
  console.error('❌ Fehler bei der Einrichtung der lokalen Entwicklungsumgebung:', error);
  process.exit(1);
}
