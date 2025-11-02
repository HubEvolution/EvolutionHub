import { z } from 'zod';

// Helper to block SSRF-prone targets
function isForbiddenHostname(host: string): boolean {
  const h = host.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, ''); // strip IPv6 brackets
  if (!h) return true;
  // Hostnames
  if (h === 'localhost' || h.endsWith('.local')) return true;
  // IPv4 private/link-local/loopback
  if (/^10\./.test(h)) return true; // 10.0.0.0/8
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true; // 172.16.0.0/12
  if (/^192\.168\./.test(h)) return true; // 192.168.0.0/16
  if (/^127\./.test(h)) return true; // 127.0.0.0/8
  if (/^169\.254\./.test(h)) return true; // 169.254.0.0/16
  // IPv6 loopback/link-local/ULA
  if (h === '::1') return true;
  if (/^fe80:/i.test(h)) return true; // link-local
  if (/^fc|^fd/i.test(h)) return true; // unique local
  return false;
}

// Schema for Webscraper API request body
// Keeps options optional and strictly typed with a few safe knobs.
export const webscraperRequestSchema = z
  .object({
    url: z.string().url(),
    options: z
      .object({
        selector: z.string().min(1).optional(),
        format: z.enum(['text', 'html', 'json']).optional(),
        maxDepth: z.number().int().min(0).max(3).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (v) => {
      try {
        const u = new URL(v.url);
        const protocolOk = u.protocol === 'http:' || u.protocol === 'https:';
        if (!protocolOk) return false;
        // Allow only standard ports (empty, 80, 443)
        const port = u.port || '';
        if (port && port !== '80' && port !== '443') return false;
        if (isForbiddenHostname(u.hostname)) return false;
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Forbidden target host or port', path: ['url'] }
  );
