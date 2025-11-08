"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerHelpers = void 0;
exports.logWithFallback = logWithFallback;
function isExtendedLogger(log) {
    return Boolean(log &&
        typeof log === 'object' &&
        'info' in log &&
        'warn' in log &&
        'error' in log &&
        'debug' in log);
}
function safeMethod(logger, level) {
    if (!logger)
        return null;
    if (typeof logger[level] === 'function') {
        return logger[level].bind(logger);
    }
    if (typeof logger.log === 'function') {
        return logger.log.bind(logger, level);
    }
    return null;
}
function logWithFallback(logger, level, message, context) {
    try {
        const candidate = isExtendedLogger(logger) ? logger : undefined;
        const method = safeMethod(candidate, level);
        if (method) {
            method(message, context);
        }
    }
    catch {
        // intentionally swallow logging errors
    }
}
exports.loggerHelpers = {
    info(logger, message, context) {
        logWithFallback(logger, 'info', message, context);
    },
    warn(logger, message, context) {
        logWithFallback(logger, 'warn', message, context);
    },
    error(logger, message, context) {
        logWithFallback(logger, 'error', message, context);
    },
    debug(logger, message, context) {
        logWithFallback(logger, 'debug', message, context);
    },
};
