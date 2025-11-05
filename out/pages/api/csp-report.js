"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.OPTIONS = exports.PATCH = exports.DELETE = exports.PUT = exports.GET = void 0;
const logger_1 = require("@/server/utils/logger");
const api_middleware_1 = require("@/lib/api-middleware");
// Accepts legacy CSP reports (application/csp-report) and modern Reporting API (application/reports+json)
// - POST only -> 204 No Content
// - Other methods -> 405 Method Not Allowed with Allow: POST
// - Minimal, privacy-preserving logging; no cookies/IPs
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('POST');
exports.GET = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
const POST = async (context) => {
    try {
        const ct = context.request.headers.get('content-type') || '';
        const reports = [];
        const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
        const getStr = (obj, key) => {
            const v = obj[key];
            return typeof v === 'string' ? v : null;
        };
        if (ct.includes('application/csp-report')) {
            // Legacy: body is an object with { "csp-report": {...} }
            const jsonUnknown = await context.request.json().catch(() => null);
            if (isPlainObject(jsonUnknown)) {
                const repUnknown = jsonUnknown['csp-report'] ?? jsonUnknown['csp_report'] ?? jsonUnknown;
                if (isPlainObject(repUnknown))
                    reports.push(repUnknown);
            }
        }
        else if (ct.includes('application/reports+json') || ct.includes('application/report')) {
            // Reporting API: array of { type, url, body, age, ... }
            const arr = await context.request.json().catch(() => null);
            if (Array.isArray(arr)) {
                for (const entry of arr) {
                    if (isPlainObject(entry)) {
                        const body = entry.body ?? entry['csp-report'] ?? entry['csp_report'] ?? {};
                        if (isPlainObject(body))
                            reports.push(body);
                    }
                }
            }
        }
        else {
            // Try best-effort JSON parse for unknown types (browsers can vary)
            const parsedUnknown = await context.request.json().catch(() => null);
            if (isPlainObject(parsedUnknown)) {
                const fallback = parsedUnknown['csp-report'] ||
                    parsedUnknown['csp_report'] ||
                    parsedUnknown.body ||
                    parsedUnknown;
                if (isPlainObject(fallback))
                    reports.push(fallback);
            }
        }
        // Minimal, redacted logging (sample first N fields only)
        for (const r of reports) {
            try {
                const directive = getStr(r, 'effective-directive') ||
                    getStr(r, 'violated-directive') ||
                    getStr(r, 'directive');
                const blocked = getStr(r, 'blocked-uri') || getStr(r, 'blockedURL') || getStr(r, 'blocked');
                const documentUri = getStr(r, 'document-uri') || getStr(r, 'documentURL') || getStr(r, 'url');
                const disposition = getStr(r, 'disposition');
                (0, logger_1.log)('info', 'CSP violation detected', {
                    directive: directive ?? '',
                    blocked: blocked ?? '',
                    document: documentUri ?? '',
                    disposition: disposition ?? '',
                    resource: '/api/csp-report',
                    action: 'csp_violation_logged',
                });
            }
            catch {
                // Absichtlich stumm: Logging-Fehler nicht weitergeben
            }
        }
    }
    catch {
        // ignore parse errors entirely; do not leak details
    }
    return new Response(null, { status: 204 });
};
exports.POST = POST;
