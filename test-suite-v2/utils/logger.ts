/**
 * Test-Logger für die Test-Suite v2
 * Zentrales Logging-System für alle Testtypen
 */

export interface LogLevel {
  ERROR: 0;
  WARN: 1;
  INFO: 2;
  DEBUG: 3;
}

export const LOG_LEVELS: LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const;

export interface LogEntry {
  timestamp: Date;
  level: keyof LogLevel;
  message: string;
  context?: string;
  data?: any;
  testId?: string;
}

export class TestLogger {
  private logs: LogEntry[] = [];
  private currentLevel: keyof LogLevel = 'INFO';
  private testContext?: string;

  // Database logging methods
  database = {
    connect: (database: string) =>
      this.info(`🗄️ Datenbank verbunden: ${database}`),
    disconnect: (database: string) =>
      this.info(`🗄️ Datenbank getrennt: ${database}`),
    query: (query: string) =>
      this.debug(`🔍 DB Query: ${query}`),
    error: (error: any) =>
      this.error('❌ Datenbank-Fehler', error),
  };

  // API logging methods
  api = {
    request: (method: string, url: string) =>
      this.debug(`📡 API Request: ${method} ${url}`),
    response: (method: string, url: string, status: number, duration?: number) =>
      this.debug(`📨 API Response: ${method} ${url} - ${status}${duration ? ` (${duration}ms)` : ''}`),
    error: (method: string, url: string, error: any) =>
      this.error(`❌ API Error: ${method} ${url}`, error),
  };

  constructor(level: keyof LogLevel = 'INFO') {
    this.currentLevel = level;
  }

  setContext(context: string): void {
    this.testContext = context;
  }

  error(message: string, data?: any): void {
    this.log('ERROR', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('WARN', message, data);
  }

  info(message: string, data?: any): void {
    this.log('INFO', message, data);
  }

  debug(message: string, data?: any): void {
    this.log('DEBUG', message, data);
  }

  private log(level: keyof LogLevel, message: string, data?: any): void {
    if (LOG_LEVELS[level] > LOG_LEVELS[this.currentLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: this.testContext,
      data,
    };

    this.logs.push(entry);

    // Konsolen-Ausgabe formatieren
    const prefix = `[${entry.timestamp.toISOString()}] [${level}]`;
    const contextStr = entry.context ? ` [${entry.context}]` : '';
    const fullMessage = `${prefix}${contextStr} ${message}`;

    switch (level) {
      case 'ERROR':
        console.error(`❌ ${fullMessage}`, data || '');
        break;
      case 'WARN':
        console.warn(`⚠️ ${fullMessage}`, data || '');
        break;
      case 'INFO':
        console.info(`ℹ️ ${fullMessage}`, data || '');
        break;
      case 'DEBUG':
        console.debug(`🔍 ${fullMessage}`, data || '');
        break;
    }
  }

  getLogs(level?: keyof LogLevel): LogEntry[] {
    if (!level) {
      return [...this.logs];
    }

    return this.logs.filter(log => log.level === level);
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogSummary(): { [K in keyof LogLevel]: number } {
    const summary = {
      ERROR: 0,
      WARN: 0,
      INFO: 0,
      DEBUG: 0,
    };

    this.logs.forEach(log => {
      summary[log.level]++;
    });

    return summary;
  }
}

// Globale Logger-Instanz
let globalLogger: TestLogger | null = null;

/**
 * Initialisiert den globalen Test-Logger
 */
export function initializeTestLogger(level: keyof LogLevel = 'INFO'): TestLogger {
  globalLogger = new TestLogger(level);
  return globalLogger;
}

/**
 * Gibt die globale Logger-Instanz zurück
 */
export function getTestLogger(): TestLogger {
  if (!globalLogger) {
    globalLogger = new TestLogger();
  }
  return globalLogger;
}

/**
 * Hilfsfunktionen für verschiedene Logging-Szenarien
 */
export const logger = {
  test: {
    start: (testName: string) => getTestLogger().info(`🚀 Starte Test: ${testName}`),
    pass: (testName: string, duration?: number) =>
      getTestLogger().info(`✅ Test bestanden: ${testName}${duration ? ` (${duration}ms)` : ''}`),
    fail: (testName: string, error?: any) =>
      getTestLogger().error(`❌ Test fehlgeschlagen: ${testName}`, error),
    skip: (testName: string, reason?: string) =>
      getTestLogger().warn(`⏭️ Test übersprungen: ${testName}${reason ? ` - ${reason}` : ''}`),
  },

  api: {
    request: (method: string, url: string) =>
      getTestLogger().debug(`📡 API Request: ${method} ${url}`),
    response: (method: string, url: string, status: number, duration?: number) =>
      getTestLogger().debug(`📨 API Response: ${method} ${url} - ${status}${duration ? ` (${duration}ms)` : ''}`),
    error: (method: string, url: string, error: any) =>
      getTestLogger().error(`❌ API Error: ${method} ${url}`, error),
  },

  database: {
    connect: (database: string) =>
      getTestLogger().info(`🗄️ Datenbank verbunden: ${database}`),
    disconnect: (database: string) =>
      getTestLogger().info(`🗄️ Datenbank getrennt: ${database}`),
    query: (query: string) =>
      getTestLogger().debug(`🔍 DB Query: ${query}`),
    error: (error: any) =>
      getTestLogger().error('❌ Datenbank-Fehler', error),
  },

  performance: {
    slow: (operation: string, duration: number, threshold: number) =>
      getTestLogger().warn(`🐌 Langsame Operation: ${operation} (${duration}ms > ${threshold}ms)`),
    memory: (usage: number, threshold: number) =>
      getTestLogger().warn(`🧠 Hoher Speicherverbrauch: ${usage}MB > ${threshold}MB`),
  },
};