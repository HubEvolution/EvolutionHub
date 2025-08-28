/**
 * Globale Test-Setup-Datei für Vitest
 * Wird vor allen Tests ausgeführt
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { testConfig } from './test-config.js';
import { setupTestDatabase, teardownTestDatabase } from '@/utils/database-helpers.js';
import { setupTestServer, teardownTestServer } from '@/utils/server-helpers.js';
import { initializeTestLogger } from '@/utils/logger.js';

// Globale Test-Variablen
declare global {
  var testConfig: typeof testConfig;
  var testDatabase: any;
  var testServer: any;
}

// Setup vor allen Tests
beforeAll(async () => {
  console.log('🚀 Initialisiere Test-Suite v2...');

  // Konfiguration global verfügbar machen
  global.testConfig = testConfig;

  // Logger initialisieren
  initializeTestLogger();

  // Test-Datenbank einrichten
  global.testDatabase = await setupTestDatabase();

  // Test-Server starten
  global.testServer = await setupTestServer();

  console.log('✅ Test-Suite v2 erfolgreich initialisiert');
});

// Cleanup nach allen Tests
afterAll(async () => {
  console.log('🧹 Räume Test-Suite v2 auf...');

  // Test-Server stoppen
  if (global.testServer) {
    await teardownTestServer(global.testServer);
  }

  // Test-Datenbank aufräumen
  if (global.testDatabase) {
    await teardownTestDatabase(global.testDatabase);
  }

  console.log('✅ Test-Suite v2 erfolgreich aufgeräumt');
});

// Setup vor jedem Test
beforeEach(async (context) => {
  // Test-Kontext erweitern
  context.meta = {
    ...context.meta,
    startTime: Date.now(),
    config: testConfig,
  };

  // Test-spezifische Umgebungsvariablen setzen
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = testConfig.environment.databaseUrl;
  process.env.JWT_SECRET = testConfig.environment.jwtSecret;
});

// Cleanup nach jedem Test
afterEach(async (context) => {
  // Test-Dauer berechnen
  const duration = Date.now() - (context.meta?.startTime as number || Date.now());

  if (duration > testConfig.timeouts.test) {
    console.warn(`⚠️ Test "${context.task.name}" überschritt Timeout (${duration}ms > ${testConfig.timeouts.test}ms)`);
  }

  // Test-spezifische Daten aufräumen
  if (global.testDatabase) {
    // Hier können test-spezifische Cleanup-Operationen durchgeführt werden
    // z.B. Löschen von Testdaten, Zurücksetzen von Caches, etc.
  }
});

// Unbehandelter Fehler abfangen
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unbehandelter Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Unbehandelter Fehler:', error);
  process.exit(1);
});

// Memory-Leaks verhindern
if (typeof global !== 'undefined') {
  (global as any).gc && ((global as any).gc as () => void)();
}