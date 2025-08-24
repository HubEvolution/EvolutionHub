// src/config/coming-soon.ts
/**
 * Central configuration for Coming Soon overlay
 *
 * - COMING_SOON_PATTERNS: array of patterns. Patterns may end with * for prefix matching.
 * - isComingSoon(pathname, frontmatter): resolves ENV override > frontmatter > patterns
 */
export const COMING_SOON_PATTERNS: string[] = [
  '/pricing*',
];

function normalizePath(pathname: string): string {
  if (!pathname) return '/';
  // strip query and hash if present
  const p = pathname.split(/[?#]/)[0];
  // Ensure leading slash
  let s = p.startsWith('/') ? p : `/${p}`;
  // remove locale prefix /en or /de
  s = s.replace(/^\/(en|de)(?=\/|$)/, '');
  // remove duplicate slashes
  s = s.replace(/\/+/g, '/');
  // remove trailing slash except root
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s;
}

function matchPattern(path: string, pattern: string): boolean {
  const pat = pattern.trim();
  if (pat.endsWith('*')) {
    const prefix = pat.slice(0, -1);
    const normalizedPrefix = normalizePath(prefix);
    return path === normalizedPrefix || path.startsWith(normalizedPrefix + '/');
  }
  return path === normalizePath(pat);
}

function isEnvEnabled(): boolean {
  try {
    // Vite/astro environment
    const v = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.COMING_SOON) ||
              (typeof process !== 'undefined' && (process.env && process.env.COMING_SOON));
    if (!v) return false;
    const val = String(v).toLowerCase();
    return val === '1' || val === 'true' || val === 'yes';
  } catch {
    return false;
  }
}

export function isComingSoon(pathname: string, frontmatter?: Record<string, unknown>): boolean {
  // ENV override (global)
  if (isEnvEnabled()) return true;

  // Per-page frontmatter explicitly set (true/false)
  if (frontmatter && typeof (frontmatter as any).comingSoon !== 'undefined') {
    return Boolean((frontmatter as any).comingSoon);
  }

  // Central pattern matching
  const path = normalizePath(pathname);
  for (const p of COMING_SOON_PATTERNS) {
    if (matchPattern(path, p)) return true;
  }

  return false;
}