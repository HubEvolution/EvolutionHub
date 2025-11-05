"use strict";
/**
 * Global Error Interceptor
 * Captures window errors and unhandled promise rejections for the Debug Panel.
 * Only active when PUBLIC_ENABLE_DEBUG_PANEL is true.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.installGlobalErrorInterceptor = installGlobalErrorInterceptor;
const client_logger_1 = require("./client-logger");
let installed = false;
function installGlobalErrorInterceptor() {
    if (installed)
        return;
    if (typeof window === 'undefined')
        return;
    if (import.meta.env.PUBLIC_ENABLE_DEBUG_PANEL !== 'true')
        return;
    installed = true;
    // window error
    window.addEventListener('error', (event) => {
        try {
            const msg = event?.message || 'Unknown error';
            const src = event?.filename || 'unknown';
            const line = event?.lineno ?? 0;
            const col = event?.colno ?? 0;
            const errUnknown = event?.error;
            const detail = errUnknown && typeof errUnknown.stack === 'string'
                ? errUnknown.stack
                : undefined;
            client_logger_1.clientLogger.error(`[GLOBAL-ERROR] ${msg} at ${src}:${line}:${col}` + (detail ? `\n${detail}` : ''), { source: 'client', action: 'global_error', filename: src, line, col });
        }
        catch {
            /* noop */
        }
    });
    // unhandled promise rejection
    window.addEventListener('unhandledrejection', (event) => {
        try {
            const reasonUnknown = event?.reason;
            const msg = typeof reasonUnknown === 'string'
                ? reasonUnknown
                : reasonUnknown?.message
                    ? String(reasonUnknown.message)
                    : String(reasonUnknown);
            const stack = typeof reasonUnknown?.stack === 'string'
                ? reasonUnknown.stack
                : undefined;
            client_logger_1.clientLogger.error(`[UNHANDLED-REJECTION] ${msg}` + (stack ? `\n${stack}` : ''), {
                source: 'client',
                action: 'unhandled_rejection',
            });
        }
        catch {
            /* noop */
        }
    });
}
