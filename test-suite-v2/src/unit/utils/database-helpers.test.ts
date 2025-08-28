/**
 * Unit-Tests für Datenbank-Helper
 * Testet Datenbank-Setup, Cleanup und Transaktionen
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTransaction,
  createDatabaseFactory
} from '../../../utils/database-helpers';
import { getTestLogger } from '../../../utils/logger';

describe('Datenbank-Helper', () => {
  let mockConnection: any;
  let mockLogger: any;

  beforeEach(() => {
    // Mock Connection
    mockConnection = {
      query: vi.fn(),
      end: vi.fn(),
    };

    // Mock Logger
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      database: {
        connect: vi.fn(),
        disconnect: vi.fn(),
        query: vi.fn(),
        error: vi.fn(),
      },
    };

    // Mock getTestLogger
    vi.mocked(getTestLogger).mockReturnValue(mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('setupTestDatabase', () => {
    it('sollte erfolgreich eine Test-Datenbank einrichten', async () => {
      const result = await setupTestDatabase();

      expect(result).toHaveProperty('connection');
      expect(result).toHaveProperty('isConnected', true);
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('created');
      expect(result.name).toMatch(/^test_\d+_\w+$/);
      expect(result.created).toBeInstanceOf(Date);
    });

    it('sollte Datenbank-Schema initialisieren', async () => {
      await setupTestDatabase();

      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS users')
      );
      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS projects')
      );
      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS newsletters')
      );
    });

    it('sollte Test-Fixtures laden', async () => {
      await setupTestDatabase();

      // Verifiziere, dass Benutzer eingefügt wurden
      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.any(Array)
      );

      // Verifiziere, dass Newsletter eingefügt wurden
      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO newsletters'),
        expect.any(Array)
      );
    });

    it('sollte bei Fehlern korrekt reagieren', async () => {
      mockConnection.query.mockRejectedValue(new Error('DB Error'));

      await expect(setupTestDatabase()).rejects.toThrow('Fehler beim Datenbank-Setup');

      expect(mockLogger.database.error).toHaveBeenCalled();
    });
  });

  describe('teardownTestDatabase', () => {
    let testDb: any;

    beforeEach(async () => {
      testDb = await setupTestDatabase();
    });

    it('sollte Datenbank erfolgreich aufräumen', async () => {
      await teardownTestDatabase(testDb);

      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM sessions')
      );
      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM projects')
      );
      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM newsletters')
      );
      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM users')
      );

      expect(mockConnection.end).toHaveBeenCalled();
      expect(testDb.isConnected).toBe(false);
    });

    it('sollte bei Fehlern korrekt reagieren', async () => {
      mockConnection.end.mockRejectedValue(new Error('Cleanup Error'));

      await expect(teardownTestDatabase(testDb)).rejects.toThrow('Fehler beim Datenbank-Cleanup');

      expect(mockLogger.database.error).toHaveBeenCalled();
    });

    it('sollte mit bereits geschlossenen Verbindungen umgehen', async () => {
      testDb.isConnected = false;
      testDb.connection = null;

      await expect(teardownTestDatabase(testDb)).resolves.not.toThrow();
    });
  });

  describe('createTransaction', () => {
    let testDb: any;

    beforeEach(async () => {
      testDb = await setupTestDatabase();
    });

    it('sollte eine Transaktion erstellen', async () => {
      const transaction = await createTransaction(testDb);

      expect(transaction).toHaveProperty('query');
      expect(transaction).toHaveProperty('commit');
      expect(transaction).toHaveProperty('rollback');
    });

    it('sollte Queries in Transaktion ausführen', async () => {
      const transaction = await createTransaction(testDb);
      const sql = 'SELECT * FROM users';
      const params = [1];

      await transaction.query(sql, params);

      expect(mockConnection.query).toHaveBeenCalledWith(sql, params);
    });

    it('sollte Commit ausführen', async () => {
      const transaction = await createTransaction(testDb);

      await transaction.commit();

      expect(mockLogger.debug).toHaveBeenCalledWith('Transaktion committed');
    });

    it('sollte Rollback ausführen', async () => {
      const transaction = await createTransaction(testDb);

      await transaction.rollback();

      expect(mockLogger.debug).toHaveBeenCalledWith('Transaktion rolled back');
    });
  });

  describe('createDatabaseFactory', () => {
    it('sollte eine Datenbank-Factory erstellen', () => {
      const factory = createDatabaseFactory();

      expect(factory).toHaveProperty('create');
      expect(factory).toHaveProperty('cleanup');
      expect(factory).toHaveProperty('getAll');
    });

    it('sollte Datenbanken erstellen und verfolgen', async () => {
      const factory = createDatabaseFactory();

      const db1 = await factory.create();
      const db2 = await factory.create();

      expect(factory.getAll()).toHaveLength(2);
      expect(db1.name).not.toBe(db2.name);
    });

    it('sollte alle Datenbanken aufräumen', async () => {
      const factory = createDatabaseFactory();

      await factory.create();
      await factory.create();

      expect(factory.getAll()).toHaveLength(2);

      await factory.cleanup();

      expect(factory.getAll()).toHaveLength(0);
    });
  });

  describe('Schema-Initialisierung', () => {
    it('sollte alle erforderlichen Tabellen erstellen', async () => {
      await setupTestDatabase();

      const createTableCalls = mockConnection.query.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE')
      );

      expect(createTableCalls.length).toBeGreaterThanOrEqual(4); // users, projects, newsletters, sessions

      // Verifiziere spezifische Tabellen
      const tableQueries = createTableCalls.map((call: any) => call[0]);
      expect(tableQueries.some((q: string) => q.includes('users'))).toBe(true);
      expect(tableQueries.some((q: string) => q.includes('projects'))).toBe(true);
      expect(tableQueries.some((q: string) => q.includes('newsletters'))).toBe(true);
      expect(tableQueries.some((q: string) => q.includes('sessions'))).toBe(true);
    });

    it('sollte korrekte Tabellen-Strukturen definieren', async () => {
      await setupTestDatabase();

      const usersTableQuery = mockConnection.query.mock.calls.find(
        (call: any) => call[0].includes('CREATE TABLE IF NOT EXISTS users')
      );

      expect(usersTableQuery[0]).toContain('id SERIAL PRIMARY KEY');
      expect(usersTableQuery[0]).toContain('email VARCHAR(255) UNIQUE NOT NULL');
      expect(usersTableQuery[0]).toContain('password_hash VARCHAR(255) NOT NULL');
      expect(usersTableQuery[0]).toContain('role VARCHAR(50) DEFAULT \'user\'');
      expect(usersTableQuery[0]).toContain('verified BOOLEAN DEFAULT FALSE');
    });
  });

  describe('Fixture-Laden', () => {
    it('sollte Test-Benutzer einfügen', async () => {
      await setupTestDatabase();

      const userInsertCalls = mockConnection.query.mock.calls.filter(
        (call: any) => call[0].includes('INSERT INTO users')
      );

      expect(userInsertCalls.length).toBeGreaterThanOrEqual(3); // admin, regular, premium

      // Verifiziere Admin-Benutzer
      const adminCall = userInsertCalls.find((call: any) =>
        call[1].includes('admin@test-suite.local')
      );
      expect(adminCall).toBeDefined();
      expect(adminCall[1][3]).toBe('admin'); // firstName
      expect(adminCall[1][4]).toBe('Admin'); // lastName
      expect(adminCall[1][5]).toBe('admin'); // role
      expect(adminCall[1][6]).toBe(true); // verified
    });

    it('sollte Newsletter-Abonnements einfügen', async () => {
      await setupTestDatabase();

      const newsletterInsertCalls = mockConnection.query.mock.calls.filter(
        (call: any) => call[0].includes('INSERT INTO newsletters')
      );

      expect(newsletterInsertCalls.length).toBeGreaterThanOrEqual(1);

      const newsletterCall = newsletterInsertCalls[0];
      expect(newsletterCall[1][0]).toBe('newsletter@test-suite.local');
      expect(newsletterCall[1][1]).toBe(true); // subscribed
    });
  });

  describe('Fehlerbehandlung', () => {
    it('sollte Schema-Initialisierungsfehler behandeln', async () => {
      mockConnection.query.mockRejectedValueOnce(new Error('Schema Error'));

      await expect(setupTestDatabase()).rejects.toThrow();

      expect(mockLogger.database.error).toHaveBeenCalledWith(
        expect.stringContaining('Fehler beim Ausführen von Schema-Query'),
        expect.any(Error)
      );
    });

    it('sollte Fixture-Ladefehler behandeln', async () => {
      // Schema erfolgreich, aber Fixture-Insert fehlgeschlagen
      let callCount = 0;
      mockConnection.query.mockImplementation(() => {
        callCount++;
        if (callCount > 4) { // Nach Schema-Queries
          throw new Error('Fixture Error');
        }
        return Promise.resolve();
      });

      await expect(setupTestDatabase()).rejects.toThrow();
    });

    it('sollte bei Verbindungsfehlern korrekt reagieren', async () => {
      mockConnection.end.mockRejectedValue(new Error('Connection Error'));

      const testDb = {
        connection: mockConnection,
        isConnected: true,
        name: 'test_db',
        created: new Date(),
      };

      await expect(teardownTestDatabase(testDb)).rejects.toThrow('Fehler beim Datenbank-Cleanup');
    });
  });

  describe('Performance und Ressourcen', () => {
    it('sollte Datenbank-Namen eindeutig generieren', async () => {
      const db1 = await setupTestDatabase();
      const db2 = await setupTestDatabase();

      expect(db1.name).not.toBe(db2.name);
      expect(db1.name).toMatch(/^test_\d+_[a-zA-Z0-9]+$/);
      expect(db2.name).toMatch(/^test_\d+_[a-zA-Z0-9]+$/);
    });

    it('sollte Speicher effizient verwalten', async () => {
      const factory = createDatabaseFactory();

      // Erstelle mehrere Datenbanken
      for (let i = 0; i < 10; i++) {
        await factory.create();
      }

      expect(factory.getAll()).toHaveLength(10);

      // Cleanup sollte alle entfernen
      await factory.cleanup();
      expect(factory.getAll()).toHaveLength(0);
    });
  });

  describe('Integration mit Logger', () => {
    it('sollte Logger bei erfolgreichem Setup informieren', async () => {
      await setupTestDatabase();

      expect(mockLogger.database.connect).toHaveBeenCalledWith(
        expect.stringMatching(/^test_\d+_[a-zA-Z0-9]+$/)
      );
    });

    it('sollte Logger bei erfolgreichem Cleanup informieren', async () => {
      const testDb = await setupTestDatabase();

      await teardownTestDatabase(testDb);

      expect(mockLogger.database.disconnect).toHaveBeenCalledWith(testDb.name);
    });

    it('sollte Logger bei Fehlern informieren', async () => {
      mockConnection.query.mockRejectedValue(new Error('DB Error'));

      await expect(setupTestDatabase()).rejects.toThrow();

      expect(mockLogger.database.error).toHaveBeenCalled();
    });
  });
});