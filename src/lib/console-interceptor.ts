/**
 * Console Interceptor
 * Captures all console.log/warn/error/debug calls and forwards them to the debug panel
 * Only active when PUBLIC_ENABLE_DEBUG_PANEL is true
 */

import { clientLogger } from './client-logger';

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
  info: console.info,
};

// Track if interceptor is already installed
let isInstalled = false;

/**
 * Install console interceptor
 * Overrides console methods to forward all calls to debug panel
 */
export function installConsoleInterceptor() {
  // Only install when debug panel is enabled
  if (import.meta.env.PUBLIC_ENABLE_DEBUG_PANEL !== 'true') return;

  // Prevent double installation
  if (isInstalled) return;
  isInstalled = true;

  // Helper to stringify arguments
  const stringifyArgs = (...args: any[]): string => {
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
  console.log = (...args: any[]) => {
    originalConsole.log(...args);
    clientLogger.log(`[CONSOLE] ${stringifyArgs(...args)}`, { source: 'console' });
  };

  // Override console.warn
  console.warn = (...args: any[]) => {
    originalConsole.warn(...args);
    clientLogger.warn(`[CONSOLE] ${stringifyArgs(...args)}`, { source: 'console' });
  };

  // Override console.error
  console.error = (...args: any[]) => {
    originalConsole.error(...args);
    clientLogger.error(`[CONSOLE] ${stringifyArgs(...args)}`, { source: 'console' });
  };

  // Override console.debug
  console.debug = (...args: any[]) => {
    originalConsole.debug(...args);
    clientLogger.debug(`[CONSOLE] ${stringifyArgs(...args)}`, { source: 'console' });
  };

  // Override console.info
  console.info = (...args: any[]) => {
    originalConsole.info(...args);
    clientLogger.info(`[CONSOLE] ${stringifyArgs(...args)}`, { source: 'console' });
  };
}

/**
 * Uninstall console interceptor
 * Restores original console methods
 */
export function uninstallConsoleInterceptor() {
  if (!isInstalled) return;

  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;

  isInstalled = false;
}

/**
 * Get access to original console methods
 * Useful for internal logging that shouldn't be intercepted
 */
export { originalConsole };
