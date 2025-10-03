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

let globalLogger: TestLogger | null = null;

export class TestLogger {
  private logs: LogEntry[] = [];
  private currentLevel: keyof LogLevel = 'INFO';
  private testContext?: string;

  // Database logging methods
  database = {
    connect: (database: string) => this.info(`🗄️ Datenbank verbunden: ${database}`),
    disconnect: (database: string) => this.info(`🗄️ Datenbank getrennt: ${database}`),
    query: (query: string) => this.debug(`🔍 DB Query: ${query}`),
    error: (messageOrError: string | unknown, maybeError?: unknown) => {
      if (typeof messageOrError === 'string') {
        this.error(messageOrError, maybeError);
      } else {
        this.error('❌ Datenbank-Fehler', messageOrError);
      }
    },
  };

  // API logging methods
  api = {
    request: (method: string, url: string) => this.info(`📡 API Request: ${method} ${url}`),
    response: (method: string, url: string, status: number, duration?: number) =>
      this.info(
        `📨 API Response: ${method} ${url} - ${status}${duration ? ` (${duration}ms)` : ''}`
      ),
    error: (method: string, url: string, error: any) =>
      this.error(`❌ API Error: ${method} ${url}`, error),
  };

  // Test logging methods
  test = {
    start: (testName: string) => this.info(`🚀 Starte Test: ${testName}`),
    pass: (testName: string, duration?: number) =>
      duration !== undefined
        ? this.logWithExtra('INFO', `✅ Test bestanden: ${testName}`, `(${duration}ms)`)
        : this.info(`✅ Test bestanden: ${testName}`),
    fail: (testName: string, error?: unknown) =>
      this.error(`❌ Test fehlgeschlagen: ${testName}`, error),
    skip: (testName: string, reason?: string) =>
      reason !== undefined
        ? this.logWithExtra('WARN', `⏭️ Test übersprungen: ${testName}`, reason)
        : this.warn(`⏭️ Test übersprungen: ${testName}`),
  };

  // Performance logging methods
  performance = {
    slow: (operation: string, duration: number, threshold: number) =>
      this.logWithExtra(
        'WARN',
        `🐌 Langsame Operation: ${operation}`,
        `${duration}ms > ${threshold}ms`
      ),
    memory: (usage: number, threshold: number) =>
      this.warn(`🧠 Hoher Speicherverbrauch: ${usage}MB > ${threshold}MB`),
  };

  constructor(level: keyof LogLevel = 'INFO') {
    this.currentLevel = level;
    // Set this instance as the global logger to keep helper `logger` in sync
    globalLogger = this;
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

    // Konsolen-Ausgabe formatieren: header beginnt mit Timestamp, enthält Level und Emojis
    const ts = `[${entry.timestamp.toISOString()}]`;
    const lvl = `[${level}]`;
    const ctx = entry.context ? ` [${entry.context}]` : '';
    const headerBase = `${ts} ${lvl}${ctx}`;

    const levelEmoji =
      level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : level === 'INFO' ? 'ℹ️' : '🔍';
    const EMOJI_PREFIXES = ['❌', '⚠️', 'ℹ️', '🔍', '📡', '📨', '🗄️', '🐌', '🧠', '⏭️', '✅', '🚀'];
    const messageEmoji = EMOJI_PREFIXES.find((e) => message.startsWith(e));
    const header = `${headerBase}${levelEmoji ? ` ${levelEmoji}` : ''}${messageEmoji ? ` ${messageEmoji}` : ''}`;

    switch (level) {
      case 'ERROR':
        console.error(header, message, data !== undefined ? data : undefined);
        break;
      case 'WARN':
        console.warn(header, message, data !== undefined ? data : undefined);
        break;
      case 'INFO':
        console.info(header, message, data !== undefined ? data : undefined);
        break;
      case 'DEBUG':
        console.debug(header, message, data !== undefined ? data : undefined);
        break;
    }
  }

  // Spezialfall: zusätzliche Text-Komponente (z.B. Dauer) als separates Konsolenargument
  logWithExtra(level: keyof LogLevel, message: string, extra?: string, data?: any): void {
    if (LOG_LEVELS[level] > LOG_LEVELS[this.currentLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message: extra ? `${message} ${extra}` : message,
      context: this.testContext,
      data,
    };
    this.logs.push(entry);

    const ts = `[${entry.timestamp.toISOString()}]`;
    const lvl = `[${level}]`;
    const ctx = entry.context ? ` [${entry.context}]` : '';
    const headerBase = `${ts} ${lvl}${ctx}`;

    const levelEmoji =
      level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : level === 'INFO' ? 'ℹ️' : '🔍';
    const EMOJI_PREFIXES = ['❌', '⚠️', 'ℹ️', '🔍', '📡', '📨', '🗄️', '🐌', '🧠', '⏭️', '✅', '🚀'];
    const messageEmoji = EMOJI_PREFIXES.find((e) => message.startsWith(e));
    const header = `${headerBase}${levelEmoji ? ` ${levelEmoji}` : ''}${messageEmoji ? ` ${messageEmoji}` : ''}`;

    const args = [header, message] as any[];
    if (extra !== undefined) args.push(extra);
    args.push(data !== undefined ? data : undefined);

    switch (level) {
      case 'ERROR':
        console.error(...args);
        break;
      case 'WARN':
        console.warn(...args);
        break;
      case 'INFO':
        console.info(...args);
        break;
      case 'DEBUG':
        console.debug(...args);
        break;
    }
  }

  getLogs(level?: keyof LogLevel): LogEntry[] {
    if (!level) {
      return [...this.logs];
    }

    return this.logs.filter((log) => log.level === level);
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

    this.logs.forEach((log) => {
      summary[log.level]++;
    });

    return summary;
  }
}

// Globale Logger-Instanz

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
      duration !== undefined
        ? getTestLogger().logWithExtra('INFO', `✅ Test bestanden: ${testName}`, `(${duration}ms)`)
        : getTestLogger().info(`✅ Test bestanden: ${testName}`),
    fail: (testName: string, error?: any) =>
      getTestLogger().error(`❌ Test fehlgeschlagen: ${testName}`, error),
    skip: (testName: string, reason?: string) =>
      reason !== undefined
        ? getTestLogger().logWithExtra('WARN', `⏭️ Test übersprungen: ${testName}`, reason)
        : getTestLogger().warn(`⏭️ Test übersprungen: ${testName}`),
  },

  api: {
    request: (method: string, url: string) =>
      getTestLogger().info(`📡 API Request: ${method} ${url}`),
    response: (method: string, url: string, status: number, duration?: number) =>
      getTestLogger().info(
        `📨 API Response: ${method} ${url} - ${status}${duration ? ` (${duration}ms)` : ''}`
      ),
    error: (method: string, url: string, error: any) =>
      getTestLogger().error(`❌ API Error: ${method} ${url}`, error),
  },

  database: {
    connect: (database: string) => getTestLogger().info(`🗄️ Datenbank verbunden: ${database}`),
    disconnect: (database: string) => getTestLogger().info(`🗄️ Datenbank getrennt: ${database}`),
    query: (query: string) => getTestLogger().info(`🔍 DB Query: ${query}`),
    error: (error: any) => getTestLogger().error('❌ Datenbank-Fehler', error),
  },

  performance: {
    slow: (operation: string, duration: number, threshold: number) =>
      getTestLogger().logWithExtra(
        'WARN',
        `🐌 Langsame Operation: ${operation}`,
        `${duration}ms > ${threshold}ms`
      ),
    memory: (usage: number, threshold: number) =>
      getTestLogger().warn(`🧠 Hoher Speicherverbrauch: ${usage}MB > ${threshold}MB`),
  },
};
