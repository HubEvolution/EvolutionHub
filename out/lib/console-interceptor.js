'use strict';
/**
 * Console Interceptor
 * Captures all console.log/warn/error/debug calls and forwards them to the debug panel
 * Only active when PUBLIC_ENABLE_DEBUG_PANEL is true
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.originalConsole = void 0;
exports.installConsoleInterceptor = installConsoleInterceptor;
exports.uninstallConsoleInterceptor = uninstallConsoleInterceptor;
const client_logger_1 = require('./client-logger');
// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
  info: console.info,
};
exports.originalConsole = originalConsole;
// Track if interceptor is already installed
let isInstalled = false;
/**
 * Install console interceptor
 * Overrides console methods to forward all calls to debug panel
 */
function installConsoleInterceptor() {
  // Only install when debug panel is enabled
  if (import.meta.env.PUBLIC_ENABLE_DEBUG_PANEL !== 'true') return;
  // Prevent double installation
  if (isInstalled) return;
  isInstalled = true;
  // Helper to stringify arguments
  const stringifyArgs = (...args) => {
    return args
      .map((arg) => {
        if (typeof arg === 'string') return arg;
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');
  };
  // Override console.log
  console.log = (...args) => {
    originalConsole.log(...args);
    client_logger_1.clientLogger.log(`[CONSOLE] ${stringifyArgs(...args)}`, { source: 'console' });
  };
  // Override console.warn
  console.warn = (...args) => {
    originalConsole.warn(...args);
    client_logger_1.clientLogger.warn(`[CONSOLE] ${stringifyArgs(...args)}`, { source: 'console' });
  };
  // Override console.error
  console.error = (...args) => {
    originalConsole.error(...args);
    client_logger_1.clientLogger.error(`[CONSOLE] ${stringifyArgs(...args)}`, {
      source: 'console',
    });
  };
  // Override console.debug
  console.debug = (...args) => {
    originalConsole.debug(...args);
    client_logger_1.clientLogger.debug(`[CONSOLE] ${stringifyArgs(...args)}`, {
      source: 'console',
    });
  };
  // Override console.info
  console.info = (...args) => {
    originalConsole.info(...args);
    client_logger_1.clientLogger.info(`[CONSOLE] ${stringifyArgs(...args)}`, { source: 'console' });
  };
}
/**
 * Uninstall console interceptor
 * Restores original console methods
 */
function uninstallConsoleInterceptor() {
  if (!isInstalled) return;
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;
  isInstalled = false;
}
