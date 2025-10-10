#!/usr/bin/env tsx
'use strict';
/**
 * Setup-Skript für lokale Entwicklungsumgebung
 *
 * Dieses Skript automatisiert die Einrichtung der lokalen Entwicklungsumgebung:
 * 1. Erstellt lokale D1-Datenbank, falls nicht vorhanden
 * 2. Führt alle Migrations-Dateien aus
 * 3. Erstellt lokalen R2-Bucket, falls nicht vorhanden
 * 4. Erstellt lokalen KV-Namespace, falls nicht vorhanden
 */
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g = Object.create((typeof Iterator === 'function' ? Iterator : Object).prototype);
    return (
      (g.next = verb(0)),
      (g['throw'] = verb(1)),
      (g['return'] = verb(2)),
      typeof Symbol === 'function' &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError('Generator is already executing.');
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y['return']
                  : op[0]
                    ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                    : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
Object.defineProperty(exports, '__esModule', { value: true });
var child_process_1 = require('child_process');
var fs = require('fs');
var path = require('path');
var os = require('os');
var dotenv = require('dotenv');
var url_1 = require('url');
// Lade Umgebungsvariablen aus .env-Datei
dotenv.config();
// Pfade für ESM-Module
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path.dirname(__filename);
var ROOT_DIR = path.resolve(__dirname, '..');
var MIGRATIONS_DIR = path.join(ROOT_DIR, 'migrations');
// Konfiguration aus wrangler.toml lesen
var WRANGLER_TOML_PATH = path.join(ROOT_DIR, 'wrangler.toml');
var WRANGLER_CONFIG = '';
var WRANGLER_TOML_EXISTS = false;
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
var IS_INTERACTIVE = Boolean(process.stdin.isTTY) && !process.env.CI;
var WRANGLER_AVAILABLE = false;
try {
  (0, child_process_1.execSync)('npx --no-install wrangler --version', { stdio: 'pipe' });
  WRANGLER_AVAILABLE = true;
} catch (_a) {
  WRANGLER_AVAILABLE = false;
}
// Utility: check if a column exists in a table
function columnExists(dbPath, table, column) {
  try {
    var out = (0, child_process_1.execSync)(
      'sqlite3 '.concat(dbPath, ' "PRAGMA table_info(\'').concat(table, '\');"'),
      {
        encoding: 'utf-8',
      }
    );
    return out.split('\n').some(function (line) {
      return line.includes('|'.concat(column, '|')) || line.split('|')[1] === column;
    });
  } catch (_a) {
    return false;
  }
}
// Utility: add a column if it does not exist
function addColumnIfMissing(dbPath, table, column, definition) {
  if (!columnExists(dbPath, table, column)) {
    try {
      (0, child_process_1.execSync)(
        'sqlite3 '
          .concat(dbPath, ' "ALTER TABLE ')
          .concat(table, ' ADD COLUMN ')
          .concat(column, ' ')
          .concat(definition, ';"'),
        {
          stdio: 'inherit',
        }
      );
      console.log('\u2705 Added column '.concat(table, '.').concat(column, ' to ').concat(dbPath));
    } catch (err) {
      console.warn(
        '\u26A0\uFE0F Could not add column '
          .concat(table, '.')
          .concat(column, ' on ')
          .concat(dbPath, ' (may already exist).'),
        err
      );
    }
  } else {
    console.log(
      '\u2139\uFE0F Column '.concat(table, '.').concat(column, ' already exists on ').concat(dbPath)
    );
  }
}
// Utility: run SQL safely with IF NOT EXISTS patterns
function runSafeSQL(dbPath, sql) {
  try {
    var tmp = path.join(os.tmpdir(), 'safe_'.concat(Date.now(), '.sql'));
    fs.writeFileSync(tmp, sql);
    (0, child_process_1.execSync)('cat '.concat(tmp, ' | sqlite3 ').concat(dbPath), {
      stdio: 'inherit',
    });
    fs.unlinkSync(tmp);
  } catch (err) {
    console.warn('\u26A0\uFE0F Safe SQL execution warning on '.concat(dbPath, ':'), err);
  }
}
// Funktion zum Erstellen eines Test-Benutzers
function createTestUser() {
  return __awaiter(this, void 0, void 0, function () {
    var nowIso,
      nowUnix,
      testUser,
      insertUserSQL,
      sqliteFiles,
      mainDbPath,
      stateDbDir,
      stateFiles,
      _i,
      stateFiles_2,
      file,
      tempSQLPath,
      successCount,
      _a,
      sqliteFiles_1,
      dbPath;
    return __generator(this, function (_b) {
      console.log('\n👤 Erstelle Test-Benutzer für lokale Entwicklung...');
      try {
        nowIso = new Date().toISOString();
        nowUnix = Math.floor(Date.now() / 1000);
        testUser = {
          id: 'test-user-id-123',
          name: 'Test User',
          username: 'testuser',
          full_name: 'Test User',
          email: 'test@example.com',
          image: null,
          created_at: nowIso,
        };
        insertUserSQL =
          "\n      INSERT OR REPLACE INTO users (id, name, username, full_name, email, image, created_at, email_verified, email_verified_at, plan)\n      VALUES ('"
            .concat(testUser.id, "', '")
            .concat(testUser.name, "', '")
            .concat(testUser.username, "', '")
            .concat(testUser.full_name, "',\n              '")
            .concat(testUser.email, "', ")
            .concat(
              testUser.image === null ? 'NULL' : "'".concat(testUser.image, "'"),
              ",\n              '"
            )
            .concat(testUser.created_at, "', 1, ")
            .concat(nowUnix, ", 'free')\n    ");
        sqliteFiles = [];
        mainDbPath = path.join(
          ROOT_DIR,
          '.wrangler',
          'd1',
          'miniflare',
          'databases',
          ''.concat(DB_NAME, '.sqlite')
        );
        if (fs.existsSync(mainDbPath)) {
          sqliteFiles.push(mainDbPath);
        }
        stateDbDir = path.join(
          ROOT_DIR,
          '.wrangler',
          'state',
          'v3',
          'd1',
          'miniflare-D1DatabaseObject'
        );
        if (fs.existsSync(stateDbDir)) {
          try {
            stateFiles = fs.readdirSync(stateDbDir);
            for (_i = 0, stateFiles_2 = stateFiles; _i < stateFiles_2.length; _i++) {
              file = stateFiles_2[_i];
              if (file.endsWith('.sqlite')) {
                sqliteFiles.push(path.join(stateDbDir, file));
              }
            }
          } catch (error) {
            console.warn('Konnte Verzeichnis '.concat(stateDbDir, ' nicht lesen:'), error);
          }
        }
        tempSQLPath = path.join(os.tmpdir(), 'test_user_'.concat(Date.now(), '.sql'));
        fs.writeFileSync(tempSQLPath, insertUserSQL);
        successCount = 0;
        for (_a = 0, sqliteFiles_1 = sqliteFiles; _a < sqliteFiles_1.length; _a++) {
          dbPath = sqliteFiles_1[_a];
          try {
            (0, child_process_1.execSync)(
              'cat '.concat(tempSQLPath, ' | sqlite3 ').concat(dbPath),
              { stdio: 'inherit' }
            );
            console.log('\u2705 Test-Benutzer in '.concat(dbPath, ' erstellt/aktualisiert'));
            successCount++;
          } catch (error) {
            console.error(
              '\u274C Fehler beim Erstellen des Test-Benutzers in '.concat(dbPath, ':'),
              error
            );
          }
        }
        // Lösche die temporäre Datei
        fs.unlinkSync(tempSQLPath);
        if (successCount > 0) {
          console.log('\n\u2705 Test-Benutzer erfolgreich erstellt/aktualisiert!');
          console.log('Login-Daten für lokale Entwicklung:');
          console.log('  E-Mail:    test@example.com');
          console.log('  Passwort:  password123');
        } else {
          console.error('❌ Konnte Test-Benutzer nicht erstellen.');
        }
      } catch (error) {
        console.error('❌ Fehler beim Erstellen des Test-Benutzers:', error);
      }
      return [2 /*return*/];
    });
  });
}
// Zusätzliche Test-Suite-v2 Benutzer (admin, regular, premium) anlegen und verifizieren
function createSuiteV2TestUsers() {
  return __awaiter(this, void 0, void 0, function () {
    var nowIso,
      nowUnix,
      users,
      sqliteFiles,
      mainDbPath,
      stateDbDir,
      stateFiles,
      _i,
      stateFiles_3,
      file,
      successCount,
      _a,
      users_1,
      u,
      insertSQL,
      tempSQLPath,
      _b,
      sqliteFiles_2,
      dbPath;
    return __generator(this, function (_c) {
      console.log('\n👥 Erstelle Test-Suite v2 Benutzer (admin, user, premium)...');
      try {
        nowIso = new Date().toISOString();
        nowUnix = Math.floor(Date.now() / 1000);
        users = [
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
        sqliteFiles = [];
        mainDbPath = path.join(
          ROOT_DIR,
          '.wrangler',
          'd1',
          'miniflare',
          'databases',
          ''.concat(DB_NAME, '.sqlite')
        );
        if (fs.existsSync(mainDbPath)) {
          sqliteFiles.push(mainDbPath);
        }
        stateDbDir = path.join(
          ROOT_DIR,
          '.wrangler',
          'state',
          'v3',
          'd1',
          'miniflare-D1DatabaseObject'
        );
        if (fs.existsSync(stateDbDir)) {
          try {
            stateFiles = fs.readdirSync(stateDbDir);
            for (_i = 0, stateFiles_3 = stateFiles; _i < stateFiles_3.length; _i++) {
              file = stateFiles_3[_i];
              if (file.endsWith('.sqlite')) {
                sqliteFiles.push(path.join(stateDbDir, file));
              }
            }
          } catch (error) {
            console.warn('Konnte Verzeichnis '.concat(stateDbDir, ' nicht lesen:'), error);
          }
        }
        successCount = 0;
        for (_a = 0, users_1 = users; _a < users_1.length; _a++) {
          u = users_1[_a];
          insertSQL =
            "\n        INSERT INTO users (id, name, username, full_name, email, image, created_at, email_verified, email_verified_at, plan)\n        VALUES ('"
              .concat(u.id, "', '")
              .concat(u.name, "', '")
              .concat(u.username, "', '")
              .concat(u.full_name, "', '")
              .concat(u.email, "', NULL, '")
              .concat(nowIso, "', 1, ")
              .concat(
                nowUnix,
                ", 'free')\n        ON CONFLICT(email) DO UPDATE SET\n          name=excluded.name,\n          username=excluded.username,\n          full_name=excluded.full_name,\n          image=excluded.image,\n          created_at=excluded.created_at,\n          email_verified=excluded.email_verified,\n          email_verified_at=excluded.email_verified_at,\n          plan=excluded.plan;\n      "
              );
          tempSQLPath = path.join(
            os.tmpdir(),
            'suitev2_user_'.concat(u.username, '_').concat(Date.now(), '.sql')
          );
          fs.writeFileSync(tempSQLPath, insertSQL);
          for (_b = 0, sqliteFiles_2 = sqliteFiles; _b < sqliteFiles_2.length; _b++) {
            dbPath = sqliteFiles_2[_b];
            try {
              (0, child_process_1.execSync)(
                'cat '.concat(tempSQLPath, ' | sqlite3 ').concat(dbPath),
                { stdio: 'inherit' }
              );
              console.log(
                '\u2705 Benutzer '.concat(u.email, ' in ').concat(dbPath, ' erstellt/aktualisiert')
              );
              successCount++;
            } catch (error) {
              console.error(
                '\u274C Fehler beim Erstellen/Aktualisieren f\u00FCr '
                  .concat(u.email, ' in ')
                  .concat(dbPath, ':'),
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
      return [2 /*return*/];
    });
  });
}
// Extrahiere Konfigurationswerte
function extractConfigValue(config, key) {
  var regex = new RegExp(''.concat(key, '\\s*=\\s*["\']([^"\']+)["\']'));
  var match = config.match(regex);
  return match ? match[1] : null;
}
// Extrahiere Binding-Namen
var DB_BINDING = extractConfigValue(WRANGLER_CONFIG, 'binding') || 'DB';
var DB_NAME =
  extractConfigValue(WRANGLER_CONFIG, 'preview_database_id') || 'evolution-hub-main-local';
var R2_BINDING = extractConfigValue(WRANGLER_CONFIG, 'binding') || 'R2_AVATARS';
var R2_BUCKET =
  extractConfigValue(WRANGLER_CONFIG, 'preview_bucket_name') || 'evolution-hub-avatars-local';
var KV_BINDING = extractConfigValue(WRANGLER_CONFIG, 'binding') || 'SESSION';
var KV_NAMESPACE = extractConfigValue(WRANGLER_CONFIG, 'preview_id') || 'SESSION_LOCAL';
console.log('🚀 Starte Einrichtung der lokalen Entwicklungsumgebung...');
// 1. Lokale D1-Datenbank erstellen
console.log('\n📦 Erstelle lokale D1-Datenbank...');
try {
  // Optional: Remote-D1 in interaktiven Umgebungen einrichten (kann Login erfordern)
  if (IS_INTERACTIVE && WRANGLER_AVAILABLE) {
    // Prüfe, ob die Datenbank bereits existiert (remote)
    var dbList = (0, child_process_1.execSync)('npx --no-install wrangler d1 list', {
      encoding: 'utf-8',
    });
    if (!dbList.includes(DB_NAME)) {
      console.log('Erstelle neue D1-Datenbank (remote): '.concat(DB_NAME));
      (0, child_process_1.execSync)('npx --no-install wrangler d1 create '.concat(DB_NAME), {
        stdio: 'inherit',
      });
    } else {
      console.log('D1-Datenbank (remote) '.concat(DB_NAME, ' existiert bereits.'));
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
    var migrationFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(function (file) {
        return file.endsWith('.sql');
      })
      .sort(); // Sortiere nach Namen (0000_..., 0001_..., usw.)
    // Definiere die Hauptdatenbank-Datei, die von Wrangler verwendet wird
    var mainDbDir = path.join(ROOT_DIR, '.wrangler', 'd1', 'miniflare', 'databases');
    if (!fs.existsSync(mainDbDir)) {
      console.log('Erstelle Verzeichnis f\u00FCr lokale D1-Datenbank: '.concat(mainDbDir));
      fs.mkdirSync(mainDbDir, { recursive: true });
    }
    var mainDbPath = path.join(mainDbDir, ''.concat(DB_NAME, '.sqlite'));
    // Stelle sicher, dass die Hauptdatenbank existiert und merke, ob sie neu erstellt wurde
    var mainDbExisted = fs.existsSync(mainDbPath);
    if (!mainDbExisted) {
      console.log('Erstelle leere Datenbank-Datei: '.concat(mainDbPath));
      fs.writeFileSync(mainDbPath, ''); // Erstelle eine leere Datei
    }
    console.log('\n\uD83D\uDD0D Prim\u00E4re Wrangler-Datenbank: '.concat(mainDbPath));
    if (!mainDbExisted) {
      // Wende jede Migrationsdatei einzeln auf die Hauptdatenbank an
      console.log('\n💾 Wende Migrationen direkt auf die Wrangler-Datenbank an...');
      var migrationsApplied = 0;
      for (var _i = 0, migrationFiles_1 = migrationFiles; _i < migrationFiles_1.length; _i++) {
        var migrationFile = migrationFiles_1[_i];
        var migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
        console.log('\n\uD83D\uDCC3 Wende Migration an: '.concat(migrationFile));
        try {
          // Lese den SQL-Inhalt
          var sqlContent = fs.readFileSync(migrationPath, 'utf-8');
          // Verwende die SQL-Anweisung direkt, da die Migrationsdateien bereits IF NOT EXISTS enthalten
          var safeSQL = sqlContent;
          // Schreibe die sichere SQL in eine temporäre Datei
          var tempSQLPath = path.join(os.tmpdir(), 'migration_'.concat(Date.now(), '.sql'));
          fs.writeFileSync(tempSQLPath, safeSQL);
          // Führe die SQL direkt auf der Hauptdatenbank aus
          (0, child_process_1.execSync)(
            'cat '.concat(tempSQLPath, ' | sqlite3 ').concat(mainDbPath),
            { stdio: 'inherit' }
          );
          console.log('\u2705 Migration '.concat(migrationFile, ' erfolgreich angewendet'));
          // Lösche die temporäre Datei
          fs.unlinkSync(tempSQLPath);
          migrationsApplied++;
        } catch (error) {
          console.error('\u274C Fehler bei Migration '.concat(migrationFile, ':'), error);
        }
      }
      console.log(
        '\n\u2705 '
          .concat(migrationsApplied, ' von ')
          .concat(migrationFiles.length, ' Migrationen erfolgreich angewendet!')
      );
    } else {
      console.log(
        '\nℹ️ Überspringe Migrationen auf Hauptdatenbank (bereits vorhanden). Schema-Guards folgen.'
      );
    }
    // Suche nach weiteren SQLite-Dateien im state/v3/d1-Verzeichnis
    console.log('\n🔍 Suche nach weiteren Wrangler-Datenbanken...');
    var sqliteFiles = [];
    var stateDbDir = path.join(
      ROOT_DIR,
      '.wrangler',
      'state',
      'v3',
      'd1',
      'miniflare-D1DatabaseObject'
    );
    if (fs.existsSync(stateDbDir)) {
      try {
        var stateFiles = fs.readdirSync(stateDbDir);
        for (var _b = 0, stateFiles_1 = stateFiles; _b < stateFiles_1.length; _b++) {
          var file = stateFiles_1[_b];
          if (file.endsWith('.sqlite')) {
            sqliteFiles.push(path.join(stateDbDir, file));
          }
        }
      } catch (error) {
        console.warn('Konnte Verzeichnis '.concat(stateDbDir, ' nicht lesen:'), error);
      }
    }
    if (sqliteFiles.length > 0) {
      console.log('Gefundene zus\u00E4tzliche SQLite-Dateien: '.concat(sqliteFiles.length));
      sqliteFiles.forEach(function (file) {
        return console.log(' - '.concat(file));
      });
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
      var tables = (0, child_process_1.execSync)('sqlite3 '.concat(mainDbPath, ' ".tables"'), {
        encoding: 'utf-8',
      });
      console.log('Gefundene Tabellen: '.concat(tables));
      // Überprüfe, ob die sessions-Tabelle existiert
      if (!tables.includes('sessions')) {
        console.log('⚠️ Die sessions-Tabelle fehlt! Wende die Migration direkt an...');
        var sessionsMigrationPath = path.join(MIGRATIONS_DIR, '0001_add_sessions_table.sql');
        if (fs.existsSync(sessionsMigrationPath)) {
          (0, child_process_1.execSync)(
            'cat '.concat(sessionsMigrationPath, ' | sqlite3 ').concat(mainDbPath),
            { stdio: 'inherit' }
          );
          console.log('\u2705 Sessions-Tabelle erfolgreich erstellt!');
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
      var dbPaths = [];
      var mainDbDir_1 = path.join(ROOT_DIR, '.wrangler', 'd1', 'miniflare', 'databases');
      var mainDbPath2 = path.join(mainDbDir_1, ''.concat(DB_NAME, '.sqlite'));
      if (fs.existsSync(mainDbPath2)) dbPaths.push(mainDbPath2);
      var stateDbDir2 = path.join(
        ROOT_DIR,
        '.wrangler',
        'state',
        'v3',
        'd1',
        'miniflare-D1DatabaseObject'
      );
      if (fs.existsSync(stateDbDir2)) {
        for (var _c = 0, _d = fs.readdirSync(stateDbDir2); _c < _d.length; _c++) {
          var f = _d[_c];
          if (f.endsWith('.sqlite')) dbPaths.push(path.join(stateDbDir2, f));
        }
      }
      for (var _e = 0, dbPaths_1 = dbPaths; _e < dbPaths_1.length; _e++) {
        var dbPath = dbPaths_1[_e];
        // Ensure modern comments table exists
        runSafeSQL(
          dbPath,
          "\n        CREATE TABLE IF NOT EXISTS comments (\n          id TEXT PRIMARY KEY,\n          content TEXT NOT NULL,\n          author_id INTEGER NOT NULL DEFAULT 0,\n          author_name TEXT NOT NULL,\n          author_email TEXT NOT NULL,\n          parent_id TEXT NULL,\n          entity_type TEXT NOT NULL,\n          entity_id TEXT NOT NULL,\n          status TEXT NOT NULL DEFAULT 'pending',\n          is_edited INTEGER DEFAULT 0,\n          edited_at INTEGER NULL,\n          created_at INTEGER NOT NULL,\n          updated_at INTEGER NOT NULL\n        );\n      "
        );
        // Migrate legacy comments table (postId/author/createdAt) → modern schema if detected
        var hasLegacyPostId = columnExists(dbPath, 'comments', 'postId');
        var hasLegacyAuthor = columnExists(dbPath, 'comments', 'author');
        var hasLegacyCreatedAt = columnExists(dbPath, 'comments', 'createdAt');
        if (hasLegacyPostId && hasLegacyAuthor && hasLegacyCreatedAt) {
          console.log(
            '\n\u2699\uFE0F  Migriere Legacy-Comments-Schema in '.concat(
              dbPath,
              ' \u2192 modernes Schema...'
            )
          );
          runSafeSQL(
            dbPath,
            "\n          PRAGMA foreign_keys=OFF;\n          BEGIN TRANSACTION;\n          CREATE TABLE IF NOT EXISTS comments_new (\n            id TEXT PRIMARY KEY,\n            content TEXT NOT NULL,\n            author_id INTEGER DEFAULT 0,\n            author_name TEXT NOT NULL DEFAULT 'Anonymous',\n            author_email TEXT NOT NULL DEFAULT '',\n            parent_id TEXT,\n            entity_type TEXT NOT NULL DEFAULT 'blog_post',\n            entity_id TEXT NOT NULL,\n            status TEXT NOT NULL DEFAULT 'pending',\n            is_edited INTEGER DEFAULT 0,\n            edited_at INTEGER,\n            created_at INTEGER NOT NULL,\n            updated_at INTEGER NOT NULL\n          );\n          INSERT INTO comments_new (\n            id, content, author_id, author_name, author_email, parent_id,\n            entity_type, entity_id, status, is_edited, edited_at, created_at, updated_at\n          )\n          SELECT\n            id,\n            content,\n            0 as author_id,\n            COALESCE(author, 'Anonymous') as author_name,\n            '' as author_email,\n            NULL as parent_id,\n            'blog_post' as entity_type,\n            postId as entity_id,\n            CASE approved WHEN 1 THEN 'approved' ELSE 'pending' END as status,\n            0 as is_edited,\n            NULL as edited_at,\n            CAST(strftime('%s', createdAt) AS INTEGER) as created_at,\n            CAST(strftime('%s', 'now') AS INTEGER) as updated_at\n          FROM comments;\n          DROP TABLE comments;\n          ALTER TABLE comments_new RENAME TO comments;\n          COMMIT;\n          PRAGMA foreign_keys=ON;\n        "
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
          'CREATE TABLE IF NOT EXISTS email_verification_tokens (\n           token TEXT PRIMARY KEY,\n           user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n           email TEXT NOT NULL,\n           created_at INTEGER NOT NULL,\n           expires_at INTEGER NOT NULL,\n           used_at INTEGER NULL\n         );\n         CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);\n         CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);\n         CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_email ON email_verification_tokens(email);'
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
          "\n        CREATE TABLE IF NOT EXISTS comment_reports (\n          id INTEGER PRIMARY KEY AUTOINCREMENT,\n          comment_id TEXT NOT NULL,\n          reporter_id INTEGER NULL,\n          reporter_email TEXT NULL,\n          reason TEXT NOT NULL,\n          description TEXT NULL,\n          status TEXT NOT NULL DEFAULT 'pending',\n          created_at INTEGER NOT NULL,\n          reviewed_at INTEGER NULL,\n          reviewed_by INTEGER NULL\n        );\n        CREATE INDEX IF NOT EXISTS idx_comment_reports_comment ON comment_reports(comment_id);\n        CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON comment_reports(status);\n        CREATE INDEX IF NOT EXISTS idx_comment_reports_created_at ON comment_reports(created_at);\n      "
        );
        // comment_moderation table
        runSafeSQL(
          dbPath,
          '\n        CREATE TABLE IF NOT EXISTS comment_moderation (\n          id INTEGER PRIMARY KEY AUTOINCREMENT,\n          comment_id TEXT NOT NULL,\n          moderator_id INTEGER NULL,\n          action TEXT NOT NULL,\n          reason TEXT NULL,\n          created_at INTEGER NOT NULL\n        );\n        CREATE INDEX IF NOT EXISTS idx_comment_moderation_comment ON comment_moderation(comment_id);\n        CREATE INDEX IF NOT EXISTS idx_comment_moderation_moderator ON comment_moderation(moderator_id);\n        CREATE INDEX IF NOT EXISTS idx_comment_moderation_created_at ON comment_moderation(created_at);\n      '
        );
        // comment_audit_logs table
        runSafeSQL(
          dbPath,
          '\n        CREATE TABLE IF NOT EXISTS comment_audit_logs (\n          id INTEGER PRIMARY KEY AUTOINCREMENT,\n          comment_id TEXT NOT NULL,\n          user_id INTEGER NULL,\n          action TEXT NOT NULL,\n          old_values TEXT NULL,\n          new_values TEXT NULL,\n          reason TEXT NULL,\n          ip_address TEXT NULL,\n          user_agent TEXT NULL,\n          metadata TEXT NULL,\n          created_at INTEGER NOT NULL\n        );\n        CREATE INDEX IF NOT EXISTS idx_comment_audit_logs_comment_id ON comment_audit_logs(comment_id);\n        CREATE INDEX IF NOT EXISTS idx_comment_audit_logs_user_id ON comment_audit_logs(user_id);\n        CREATE INDEX IF NOT EXISTS idx_comment_audit_logs_action ON comment_audit_logs(action);\n        CREATE INDEX IF NOT EXISTS idx_comment_audit_logs_created_at ON comment_audit_logs(created_at);\n      '
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
      var r2List = (0, child_process_1.execSync)('npx --no-install wrangler r2 bucket list', {
        encoding: 'utf-8',
      });
      if (!r2List.includes(R2_BUCKET)) {
        (0, child_process_1.execSync)(
          'npx --no-install wrangler r2 bucket create '.concat(R2_BUCKET),
          { stdio: 'inherit' }
        );
      } else {
        console.log('R2-Bucket '.concat(R2_BUCKET, ' existiert bereits.'));
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
      var kvList = (0, child_process_1.execSync)('npx --no-install wrangler kv namespace list', {
        encoding: 'utf-8',
      });
      if (!kvList.includes(KV_NAMESPACE)) {
        console.log('Erstelle neuen KV-Namespace: '.concat(KV_NAMESPACE));
        var createOutput = (0, child_process_1.execSync)(
          'npx --no-install wrangler kv namespace create '.concat(KV_NAMESPACE),
          { encoding: 'utf-8' }
        );
        // Extrahiere die ID aus der Ausgabe mit einem Regex
        var idMatch = createOutput.match(/id = "([^"]+)"/i);
        var namespaceId = null;
        if (idMatch) {
          namespaceId = idMatch[1];
        }
        if (namespaceId) {
          console.log('KV-Namespace erstellt mit ID: '.concat(namespaceId));
          // Aktualisiere wrangler.toml mit der neuen KV-Namespace-ID (nur wenn vorhanden)
          if (WRANGLER_TOML_EXISTS) {
            var hasPreviewId = /preview_id\s*=\s*["'][^"']+["']/.test(WRANGLER_CONFIG);
            var updatedConfig = hasPreviewId
              ? WRANGLER_CONFIG.replace(
                  /preview_id\s*=\s*["'][^"']+["']/,
                  'preview_id = "'.concat(namespaceId, '"')
                )
              : ''.concat(WRANGLER_CONFIG, '\npreview_id = "').concat(namespaceId, '"\n');
            fs.writeFileSync(WRANGLER_TOML_PATH, updatedConfig);
          } else {
            console.warn(
              'wrangler.toml ist nicht vorhanden – bitte fügen Sie die preview_id manuell hinzu oder erstellen Sie eine wrangler.toml.'
            );
            console.warn('Vorgeschlagene Zeile: preview_id = "'.concat(namespaceId, '"'));
          }
        }
      } else {
        console.log('KV-Namespace '.concat(KV_NAMESPACE, ' existiert bereits.'));
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
