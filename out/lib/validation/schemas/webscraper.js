"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webscraperRequestSchema = void 0;
const zod_1 = require("zod");
// Helper to block SSRF-prone targets
function isForbiddenHostname(host) {
    const h = host.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, ''); // strip IPv6 brackets
    if (!h)
        return true;
    // Hostnames
    if (h === 'localhost' || h.endsWith('.local'))
        return true;
    // IPv4 private/link-local/loopback
    if (/^10\./.test(h))
        return true; // 10.0.0.0/8
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h))
        return true; // 172.16.0.0/12
    if (/^192\.168\./.test(h))
        return true; // 192.168.0.0/16
    if (/^127\./.test(h))
        return true; // 127.0.0.0/8
    if (/^169\.254\./.test(h))
        return true; // 169.254.0.0/16
    // IPv6 loopback/link-local/ULA
    if (h === '::1')
        return true;
    if (/^fe80:/i.test(h))
        return true; // link-local
    if (/^fc|^fd/i.test(h))
        return true; // unique local
    return false;
}
// Schema for Webscraper API request body
// Keeps options optional and strictly typed with a few safe knobs.
exports.webscraperRequestSchema = zod_1.z
    .object({
    url: zod_1.z.string().url(),
    options: zod_1.z
        .object({
        selector: zod_1.z.string().min(1).optional(),
        format: zod_1.z.enum(['text', 'html', 'json']).optional(),
        maxDepth: zod_1.z.number().int().min(0).max(3).optional(),
    })
        .strict()
        .optional(),
})
    .strict()
    .refine((v) => {
    try {
        const u = new URL(v.url);
        const protocolOk = u.protocol === 'http:' || u.protocol === 'https:';
        if (!protocolOk)
            return false;
        // Allow only standard ports (empty, 80, 443)
        const port = u.port || '';
        if (port && port !== '80' && port !== '443')
            return false;
        if (isForbiddenHostname(u.hostname))
            return false;
        return true;
    }
    catch {
        return false;
    }
}, { message: 'Forbidden target host or port', path: ['url'] });
