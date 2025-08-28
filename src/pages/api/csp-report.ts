import type { APIContext } from 'astro';
import { log } from '@/server/utils/logger';

// Accepts legacy CSP reports (application/csp-report) and modern Reporting API (application/reports+json)
// - POST only -> 204 No Content
// - Other methods -> 405 Method Not Allowed with Allow: POST
// - Minimal, privacy-preserving logging; no cookies/IPs

function methodNotAllowed() {
  const headers = new Headers();
  headers.set('Allow', 'POST');
  return new Response('Method Not Allowed', { status: 405, headers });
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const OPTIONS = methodNotAllowed;

export const POST = async (context: APIContext) => {
  try {
    const ct = context.request.headers.get('content-type') || '';
    const reports: Array<Record<string, any>> = [];

    if (ct.includes('application/csp-report')) {
      // Legacy: body is an object with { "csp-report": {...} }
      const json = await context.request.json().catch(() => null);
      const report = json && (json['csp-report'] || json['csp_report'] || json);
      if (report && typeof report === 'object') {
        reports.push(report);
      }
    } else if (ct.includes('application/reports+json') || ct.includes('application/report')) {
      // Reporting API: array of { type, url, body, age, ... }
      const arr = await context.request.json().catch(() => null);
      if (Array.isArray(arr)) {
        for (const entry of arr) {
          if (entry && typeof entry === 'object') {
            const body = entry.body || entry['csp-report'] || entry['csp_report'] || {};
            reports.push(body);
          }
        }
      }
    } else {
      // Try best-effort JSON parse for unknown types (browsers can vary)
      const parsed = await context.request.json().catch(() => null);
      if (parsed) {
        const fallback = parsed['csp-report'] || parsed['csp_report'] || parsed.body || parsed;
        reports.push(fallback);
      }
    }

    // Minimal, redacted logging (sample first N fields only)
    for (const r of reports) {
      try {
        const directive = r?.['effective-directive'] || r?.['violated-directive'] || r?.['directive'];
        const blocked = r?.['blocked-uri'] || r?.['blockedURL'] || r?.['blocked'];
        const documentUri = r?.['document-uri'] || r?.['documentURL'] || r?.['url'];
        const disposition = r?.['disposition'];
        log('info', 'CSP violation detected', {
          directive: typeof directive === 'string' ? directive : String(directive || ''),
          blocked: typeof blocked === 'string' ? blocked : String(blocked || ''),
          document: typeof documentUri === 'string' ? documentUri : String(documentUri || ''),
          disposition: typeof disposition === 'string' ? disposition : String(disposition || ''),
          resource: '/api/csp-report',
          action: 'csp_violation_logged'
        });
      } catch {
        // Absichtlich stumm: Logging-Fehler nicht weitergeben
      }
    }
  } catch {
    // ignore parse errors entirely; do not leak details
  }

  return new Response(null, { status: 204 });
};
