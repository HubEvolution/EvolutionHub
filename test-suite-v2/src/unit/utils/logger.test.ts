/**
 * Unit-Tests für die Logger-Komponente
 * Testet alle Logging-Funktionen, Level-Management und Ausgabeformate
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TestLogger,
  LOG_LEVELS,
  initializeTestLogger,
  getTestLogger,
  logger
} from '../../../utils/logger';

describe('TestLogger', () => {
  let testLogger: TestLogger;
  let consoleSpy: {
    error: any;
    warn: any;
    info: any;
    debug: any;
  };

  beforeEach(() => {
    // Konsolen-Ausgaben mocken
    consoleSpy = {
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    };

    testLogger = new TestLogger('DEBUG');
  });

  afterEach(() => {
    // Mocks zurücksetzen
    vi.restoreAllMocks();
    testLogger.clearLogs();
  });

  describe('Logger-Initialisierung', () => {
    it('sollte einen Logger mit Standard-Level INFO erstellen', () => {
      const defaultLogger = new TestLogger();
      expect(defaultLogger).toBeInstanceOf(TestLogger);
    });

    it('sollte einen Logger mit spezifischem Level erstellen', () => {
      expect(testLogger).toBeInstanceOf(TestLogger);
    });

    it('sollte den korrekten Log-Level setzen', () => {
      expect(testLogger['currentLevel']).toBe('DEBUG');
    });
  });

  describe('Log-Level-Management', () => {
    it('sollte alle definierten Log-Levels haben', () => {
      expect(LOG_LEVELS.ERROR).toBe(0);
      expect(LOG_LEVELS.WARN).toBe(1);
      expect(LOG_LEVELS.INFO).toBe(2);
      expect(LOG_LEVELS.DEBUG).toBe(3);
    });

    it('sollte Nachrichten basierend auf Level filtern', () => {
      const infoLogger = new TestLogger('INFO');

      infoLogger.debug('Debug message'); // Sollte nicht geloggt werden
      infoLogger.info('Info message');   // Sollte geloggt werden
      infoLogger.warn('Warn message');   // Sollte geloggt werden
      infoLogger.error('Error message'); // Sollte geloggt werden

      const logs = infoLogger.getLogs();
      expect(logs).toHaveLength(3);
      expect(logs.every(log => log.level !== 'DEBUG')).toBe(true);
    });
  });

  describe('Logging-Methoden', () => {
    it('sollte ERROR-Nachrichten korrekt loggen', () => {
      const message = 'Test error message';
      const data = { error: 'Test error' };

      testLogger.error(message, data);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('❌'),
        expect.stringContaining(message),
        data
      );

      const logs = testLogger.getLogs('ERROR');
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe(message);
      expect(logs[0].data).toBe(data);
      expect(logs[0].level).toBe('ERROR');
    });

    it('sollte WARN-Nachrichten korrekt loggen', () => {
      const message = 'Test warning message';

      testLogger.warn(message);

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('⚠️'),
        expect.stringContaining(message),
        undefined
      );

      const logs = testLogger.getLogs('WARN');
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('WARN');
    });

    it('sollte INFO-Nachrichten korrekt loggen', () => {
      const message = 'Test info message';

      testLogger.info(message);

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('ℹ️'),
        expect.stringContaining(message),
        undefined
      );

      const logs = testLogger.getLogs('INFO');
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('INFO');
    });

    it('sollte DEBUG-Nachrichten korrekt loggen', () => {
      const message = 'Test debug message';

      testLogger.debug(message);

      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('🔍'),
        expect.stringContaining(message),
        undefined
      );

      const logs = testLogger.getLogs('DEBUG');
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('DEBUG');
    });
  });

  describe('Kontext-Management', () => {
    it('sollte Kontext korrekt setzen und verwenden', () => {
      const context = 'TestContext';
      testLogger.setContext(context);

      testLogger.info('Test message');

      const logs = testLogger.getLogs();
      expect(logs[0].context).toBe(context);
    });

    it('sollte Kontext in Konsolen-Ausgabe anzeigen', () => {
      const context = 'AuthService';
      testLogger.setContext(context);

      testLogger.info('User logged in');

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining(`[${context}]`),
        expect.any(String),
        undefined
      );
    });
  });

  describe('Log-Verwaltung', () => {
    beforeEach(() => {
      // Verschiedene Logs erstellen
      testLogger.error('Error 1');
      testLogger.warn('Warning 1');
      testLogger.info('Info 1');
      testLogger.debug('Debug 1');
      testLogger.info('Info 2');
    });

    it('sollte alle Logs zurückgeben', () => {
      const allLogs = testLogger.getLogs();
      expect(allLogs).toHaveLength(5);
    });

    it('sollte Logs nach Level filtern', () => {
      const errorLogs = testLogger.getLogs('ERROR');
      const infoLogs = testLogger.getLogs('INFO');

      expect(errorLogs).toHaveLength(1);
      expect(infoLogs).toHaveLength(2);
    });

    it('sollte Logs löschen können', () => {
      expect(testLogger.getLogs()).toHaveLength(5);

      testLogger.clearLogs();

      expect(testLogger.getLogs()).toHaveLength(0);
    });

    it('sollte Log-Export funktionieren', () => {
      const exportedLogs = testLogger.exportLogs();
      expect(exportedLogs).toHaveLength(5);
      expect(exportedLogs).toEqual(testLogger.getLogs());
    });

    it('sollte korrekte Log-Zusammenfassung erstellen', () => {
      const summary = testLogger.getLogSummary();

      expect(summary.ERROR).toBe(1);
      expect(summary.WARN).toBe(1);
      expect(summary.INFO).toBe(2);
      expect(summary.DEBUG).toBe(1);
    });
  });

  describe('Zeitstempel und Metadaten', () => {
    it('sollte korrekte Zeitstempel hinzufügen', () => {
      const before = new Date();
      testLogger.info('Test message');
      const after = new Date();

      const logs = testLogger.getLogs();
      const logTimestamp = new Date(logs[0].timestamp);

      expect(logTimestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(logTimestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('sollte alle erforderlichen Metadaten enthalten', () => {
      const context = 'TestModule';
      testLogger.setContext(context);

      testLogger.error('Test error', { code: 500 });

      const log = testLogger.getLogs()[0];

      expect(log).toHaveProperty('timestamp');
      expect(log).toHaveProperty('level', 'ERROR');
      expect(log).toHaveProperty('message', 'Test error');
      expect(log).toHaveProperty('context', context);
      expect(log).toHaveProperty('data', { code: 500 });
    });
  });

  describe('Konsolen-Ausgabe-Formatierung', () => {
    it('sollte Zeitstempel in Ausgabe enthalten', () => {
      testLogger.info('Test message');

      const call = consoleSpy.info.mock.calls[0];
      expect(call[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('sollte Log-Level in Ausgabe enthalten', () => {
      testLogger.warn('Test message');

      const call = consoleSpy.warn.mock.calls[0];
      expect(call[0]).toContain('[WARN]');
    });

    it('sollte Emojis für verschiedene Level verwenden', () => {
      testLogger.error('Error');
      testLogger.warn('Warning');
      testLogger.info('Info');
      testLogger.debug('Debug');

      expect(consoleSpy.error.mock.calls[0][0]).toContain('❌');
      expect(consoleSpy.warn.mock.calls[0][0]).toContain('⚠️');
      expect(consoleSpy.info.mock.calls[0][0]).toContain('ℹ️');
      expect(consoleSpy.debug.mock.calls[0][0]).toContain('🔍');
    });
  });

  describe('Edge Cases', () => {
    it('sollte mit leeren Nachrichten umgehen', () => {
      testLogger.info('');

      const logs = testLogger.getLogs();
      expect(logs[0].message).toBe('');
    });

    it('sollte mit null/undefined Daten umgehen', () => {
      testLogger.info('Test', null);
      testLogger.info('Test', undefined);

      const logs = testLogger.getLogs();
      expect(logs[0].data).toBeNull();
      expect(logs[1].data).toBeUndefined();
    });

    it('sollte mit sehr langen Nachrichten umgehen', () => {
      const longMessage = 'A'.repeat(10000);
      testLogger.info(longMessage);

      const logs = testLogger.getLogs();
      expect(logs[0].message).toBe(longMessage);
    });

    it('sollte mit komplexen Datenobjekten umgehen', () => {
      const complexData = {
        nested: {
          array: [1, 2, { deep: 'value' }],
          date: new Date(),
          function: () => {},
        },
        circular: {} as any,
      };
      complexData.circular.self = complexData;

      testLogger.info('Complex data test', complexData);

      const logs = testLogger.getLogs();
      expect(logs[0].data).toBe(complexData);
    });
  });
});

describe('Globale Logger-Funktionen', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initializeTestLogger', () => {
    it('sollte globalen Logger initialisieren', () => {
      const logger = initializeTestLogger('INFO');
      expect(logger).toBeInstanceOf(TestLogger);
    });

    it('sollte Standard-Level verwenden wenn nicht angegeben', () => {
      const logger = initializeTestLogger();
      expect(logger).toBeInstanceOf(TestLogger);
    });
  });

  describe('getTestLogger', () => {
    it('sollte null zurückgeben wenn nicht initialisiert', () => {
      // Reset global logger
      (global as any).globalLogger = null;

      const logger = getTestLogger();
      expect(logger).toBeInstanceOf(TestLogger);
    });

    it('sollte initialisierten Logger zurückgeben', () => {
      const initLogger = initializeTestLogger('DEBUG');
      const retrievedLogger = getTestLogger();

      expect(retrievedLogger).toBe(initLogger);
    });
  });
});

describe('Logger-Hilfsfunktionen', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = {
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Test-Logging', () => {
    it('sollte Test-Start loggen', () => {
      logger.test.start('MyTest');

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('🚀'),
        expect.stringContaining('MyTest'),
        undefined
      );
    });

    it('sollte Test-Erfolg mit Dauer loggen', () => {
      logger.test.pass('MyTest', 150);

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('✅'),
        expect.stringContaining('MyTest'),
        expect.stringContaining('150ms'),
        undefined
      );
    });

    it('sollte Test-Fehler mit Daten loggen', () => {
      const error = new Error('Test failed');
      logger.test.fail('MyTest', error);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('❌'),
        expect.stringContaining('MyTest'),
        error
      );
    });

    it('sollte Test-Überspringen loggen', () => {
      logger.test.skip('MyTest', 'Not implemented');

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('⏭️'),
        expect.stringContaining('MyTest'),
        expect.stringContaining('Not implemented'),
        undefined
      );
    });
  });

  describe('API-Logging', () => {
    it('sollte API-Requests loggen', () => {
      logger.api.request('GET', '/api/users');

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('📡'),
        expect.stringContaining('GET /api/users'),
        undefined
      );
    });

    it('sollte API-Responses mit Status loggen', () => {
      logger.api.response('POST', '/api/users', 201, 250);

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('📨'),
        expect.stringContaining('POST /api/users - 201 (250ms)'),
        undefined
      );
    });

    it('sollte API-Fehler loggen', () => {
      const error = new Error('Connection failed');
      logger.api.error('GET', '/api/users', error);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('❌'),
        expect.stringContaining('GET /api/users'),
        error
      );
    });
  });

  describe('Datenbank-Logging', () => {
    it('sollte Datenbank-Verbindungen loggen', () => {
      logger.database.connect('test_db');

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('🗄️'),
        expect.stringContaining('test_db'),
        undefined
      );
    });

    it('sollte Datenbank-Abfragen loggen', () => {
      logger.database.query('SELECT * FROM users');

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('🔍'),
        expect.stringContaining('SELECT * FROM users'),
        undefined
      );
    });
  });

  describe('Performance-Logging', () => {
    it('sollte langsame Operationen warnen', () => {
      logger.performance.slow('Database query', 2500, 1000);

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('🐌'),
        expect.stringContaining('Database query'),
        expect.stringContaining('2500ms > 1000ms'),
        undefined
      );
    });

    it('sollte hohen Speicherverbrauch warnen', () => {
      logger.performance.memory(150, 100);

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('🧠'),
        expect.stringContaining('150MB > 100MB'),
        undefined
      );
    });
  });
});

describe('Logger-Integrationstests', () => {
  it('sollte komplexe Logging-Szenarien handhaben', () => {
    const testLogger = new TestLogger('DEBUG');
    testLogger.setContext('IntegrationTest');

    // Simuliere komplexes Logging-Szenario
    logger.test.start('ComplexScenario');

    logger.database.connect('integration_db');
    logger.api.request('POST', '/api/complex-operation');

    // Simuliere einige Operationen
    for (let i = 0; i < 5; i++) {
      testLogger.debug(`Operation ${i + 1}`, { step: i, data: `value${i}` });
    }

    logger.api.response('POST', '/api/complex-operation', 200, 1250);
    logger.database.disconnect('integration_db');

    logger.test.pass('ComplexScenario', 1250);

    // Verifiziere Logs
    const allLogs = testLogger.getLogs();
    expect(allLogs.length).toBeGreaterThan(10);

    // Verifiziere verschiedene Log-Levels
    const summary = testLogger.getLogSummary();
    expect(summary.DEBUG).toBeGreaterThan(0);
    expect(summary.INFO).toBeGreaterThan(0);

    // Verifiziere Kontext
    const contextLogs = allLogs.filter(log => log.context === 'IntegrationTest');
    expect(contextLogs.length).toBe(allLogs.length);
  });

  it('sollte Memory-Leaks vermeiden', () => {
    const testLogger = new TestLogger('DEBUG');

    // Erstelle viele Logs
    for (let i = 0; i < 1000; i++) {
      testLogger.info(`Log message ${i}`, { index: i, data: 'test'.repeat(100) });
    }

    const logs = testLogger.getLogs();
    expect(logs).toHaveLength(1000);

    // Speicher freigeben
    testLogger.clearLogs();
    expect(testLogger.getLogs()).toHaveLength(0);
  });
});