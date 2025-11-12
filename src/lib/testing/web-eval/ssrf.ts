export type TargetValidation = { ok: true } | { ok: false; reason: string };

function isForbiddenHostname(host: string): boolean {
  const h = host.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
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
  if (/^(fc|fd)/i.test(h)) return true; // unique local
  return false;
}

function isAllowedOrigin(u: URL, allowedCsv?: string): boolean {
  if (!allowedCsv) return true; // no allowlist configured → allow
  const want = u.origin.toLowerCase();
  const items = allowedCsv
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return items.includes(want);
}

export function validateTargetUrl(target: string, allowedOriginsCsv?: string): TargetValidation {
  let u: URL;
  try {
    u = new URL(target);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:')
    return { ok: false, reason: 'invalid_scheme' };
  const port = u.port || '';
  if (port && port !== '80' && port !== '443') return { ok: false, reason: 'port_not_allowed' };
  if (isForbiddenHostname(u.hostname)) return { ok: false, reason: 'forbidden_host' };
  if (!isAllowedOrigin(u, allowedOriginsCsv)) return { ok: false, reason: 'origin_not_allowed' };
  return { ok: true };
}
