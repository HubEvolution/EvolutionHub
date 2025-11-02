// src/config/coming-soon.ts
/**
 * Central configuration for Coming Soon overlay
 *
 * - COMING_SOON_PATTERNS: array of patterns (kept for reference/future use).
 * - isComingSoon(pathname, frontmatter): explicit per-page ENABLE only; hard excludes always win.
 */
export const COMING_SOON_PATTERNS: string[] = ['/docs', '/kontakt', '/agb', '/impressum'];

// Pages that must NEVER show the Coming Soon overlay.
// Patterns support '*' suffix for prefix matching and are matched against normalized paths
// (locale prefixes like /en or /de are stripped by normalizePath).
export const COMING_SOON_EXCLUDE_PATTERNS: string[] = [
  '/datenschutz*', // Privacy Policy (DE + EN)
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

export function isComingSoon(pathname: string, frontmatter?: Record<string, unknown>): boolean {
  const path = normalizePath(pathname);

  // 1) Hard exclusions take absolute precedence
  for (const p of COMING_SOON_EXCLUDE_PATTERNS) {
    if (matchPattern(path, p)) return false;
  }

  // 2) Explicit per-page ENABLE only
  if (frontmatter && (frontmatter as { comingSoon?: unknown }).comingSoon === true) {
    return true;
  }

  // Default: disabled on all pages
  return false;
}
