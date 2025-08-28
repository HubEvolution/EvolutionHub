/**
 * Datenbank-Helper für Test-Suite v2
 * Verwaltet Test-Datenbank-Setup, Cleanup und Mocking
 */

import { testConfig } from '@/config/test-config.js';
import { getTestLogger } from './logger.js';

export interface TestDatabase {
  connection: any;
  isConnected: boolean;
  name: string;
  created: Date;
}

export interface DatabaseFixture {
  tables: string[];
  data: Record<string, any[]>;
  constraints: string[];
}

/**
 * Richtet eine Test-Datenbank ein
 */
export async function setupTestDatabase(): Promise<TestDatabase> {
  const logger = getTestLogger();
  logger.info('Datenbank-Setup wird gestartet...');

  try {
    const dbName = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Hier würde die eigentliche Datenbank-Initialisierung erfolgen
    // Für diese Demo simulieren wir die Datenbank-Verbindung
    const testDb: TestDatabase = {
      connection: {
        // Mock connection object
        query: async (sql: string) => {
          logger.database.query(sql);
          return { rows: [], rowCount: 0 };
        },
        end: async () => {
          logger.database.disconnect(dbName);
        },
      },
      isConnected: true,
      name: dbName,
      created: new Date(),
    };

    // Basis-Schema erstellen
    await initializeSchema(testDb);

    // Test-Fixtures laden
    await loadFixtures(testDb);

    logger.database.connect(dbName);
    return testDb;

  } catch (error) {
    logger.database.error(error);
    throw new Error(`Fehler beim Datenbank-Setup: ${error}`);
  }
}

/**
 * Räumt die Test-Datenbank auf
 */
export async function teardownTestDatabase(database: TestDatabase): Promise<void> {
  const logger = getTestLogger();
  logger.info(`Datenbank-Cleanup wird gestartet für: ${database.name}`);

  try {
    if (database.connection && database.isConnected) {
      // Test-Daten löschen
      await clearTestData(database);

      // Verbindung schließen
      await database.connection.end();
    }

    database.isConnected = false;
    logger.info(`Datenbank-Cleanup abgeschlossen für: ${database.name}`);

  } catch (error) {
    logger.database.error(error);
    throw new Error(`Fehler beim Datenbank-Cleanup: ${error}`);
  }
}

/**
 * Initialisiert das Datenbank-Schema für Tests
 */
async function initializeSchema(database: TestDatabase): Promise<void> {
  const logger = getTestLogger();

  const schemaQueries = [
    // Users-Tabelle
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      role VARCHAR(50) DEFAULT 'user',
      verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Projects-Tabelle
    `CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'active',
      user_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Newsletters-Tabelle
    `CREATE TABLE IF NOT EXISTS newsletters (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      subscribed BOOLEAN DEFAULT TRUE,
      preferences JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Sessions-Tabelle für Authentifizierung
    `CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  for (const query of schemaQueries) {
    try {
      await database.connection.query(query);
      logger.debug(`Schema-Query ausgeführt: ${query.split(' ').slice(0, 3).join(' ')}...`);
    } catch (error) {
      logger.database.error(`Fehler beim Ausführen von Schema-Query: ${error}`);
      throw error;
    }
  }
}

/**
 * Lädt Test-Fixtures in die Datenbank
 */
async function loadFixtures(database: TestDatabase): Promise<void> {
  const logger = getTestLogger();

  // Test-Benutzer einfügen
  const users = [
    {
      email: testConfig.testData.users.admin.email,
      password_hash: await hashPassword(testConfig.testData.users.admin.password),
      first_name: testConfig.testData.users.admin.firstName,
      last_name: testConfig.testData.users.admin.lastName,
      role: testConfig.testData.users.admin.role,
      verified: testConfig.testData.users.admin.verified,
    },
    {
      email: testConfig.testData.users.regular.email,
      password_hash: await hashPassword(testConfig.testData.users.regular.password),
      first_name: testConfig.testData.users.regular.firstName,
      last_name: testConfig.testData.users.regular.lastName,
      role: testConfig.testData.users.regular.role,
      verified: testConfig.testData.users.regular.verified,
    },
    {
      email: testConfig.testData.users.premium.email,
      password_hash: await hashPassword(testConfig.testData.users.premium.password),
      first_name: testConfig.testData.users.premium.firstName,
      last_name: testConfig.testData.users.premium.lastName,
      role: testConfig.testData.users.premium.role,
      verified: testConfig.testData.users.premium.verified,
    },
  ];

  for (const user of users) {
    await database.connection.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, verified)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.email, user.password_hash, user.first_name, user.last_name, user.role, user.verified]
    );
  }

  // Newsletter-Abonnements einfügen
  for (const newsletter of testConfig.testData.newsletters) {
    await database.connection.query(
      `INSERT INTO newsletters (email, subscribed, preferences)
       VALUES ($1, $2, $3)`,
      [newsletter.email, newsletter.subscribed, JSON.stringify(newsletter.preferences)]
    );
  }

  logger.info('Test-Fixtures erfolgreich geladen');
}

/**
 * Löscht alle Test-Daten
 */
async function clearTestData(database: TestDatabase): Promise<void> {
  const logger = getTestLogger();

  const clearQueries = [
    'DELETE FROM sessions',
    'DELETE FROM projects',
    'DELETE FROM newsletters',
    'DELETE FROM users',
  ];

  for (const query of clearQueries) {
    await database.connection.query(query);
  }

  logger.debug('Test-Daten erfolgreich gelöscht');
}

/**
 * Erstellt eine Transaktion für Test-Operationen
 */
export async function createTransaction(database: TestDatabase): Promise<any> {
  // Mock transaction object
  return {
    query: async (sql: string, params?: any[]) => {
      return database.connection.query(sql, params);
    },
    commit: async () => {
      getTestLogger().debug('Transaktion committed');
    },
    rollback: async () => {
      getTestLogger().debug('Transaktion rolled back');
    },
  };
}

/**
 * Hilfsfunktion zum Hashen von Passwörtern (vereinfacht für Tests)
 */
async function hashPassword(password: string): Promise<string> {
  // In echten Tests würde hier bcrypt oder argon2 verwendet werden
  return `hashed_${password}_${Date.now()}`;
}

/**
 * Factory-Funktion für Test-Datenbank-Verbindungen
 */
export function createDatabaseFactory() {
  const databases: TestDatabase[] = [];

  return {
    create: async (): Promise<TestDatabase> => {
      const db = await setupTestDatabase();
      databases.push(db);
      return db;
    },

    cleanup: async (): Promise<void> => {
      for (const db of databases) {
        await teardownTestDatabase(db);
      }
      databases.length = 0;
    },

    getAll: (): TestDatabase[] => [...databases],
  };
}