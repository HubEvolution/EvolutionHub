import type { Locale } from '@/lib/i18n';

const LOCALE_PREFIX_RE = /^\/(de|en)(\/|$)/;

/**
 * Prüft, ob ein Pfad bereits mit einer Locale versehen ist.
 */
export function isLocalizedPath(path: string): boolean {
  return LOCALE_PREFIX_RE.test(path);
}

/**
 * Liefert die Locale aus einem Pfad, wenn vorhanden.
 */
export function getPathLocale(path: string): Locale | null {
  const m = path.match(LOCALE_PREFIX_RE);
  return (m?.[1] as Locale) ?? null;
}

/**
 * Baut einen locale-bewussten internen Link.
 * - Externe Links (http/https,//), mailto:, tel:, reine Hash-/Query-Links werden unverändert zurückgegeben
 * - Bereits lokalisierte Pfade bleiben unverändert
 * - Für 'en' wird "/en" vorangestellt; für 'de' bleibt Pfad neutral
 */
export function localizePath(locale: Locale, href: string): string {
  if (!href) return href;

  const lower = href.toLowerCase();
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('//') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('tel:') ||
    href.startsWith('#') ||
    href.startsWith('?')
  ) {
    return href;
  }

  // Ensure leading slash
  let path = href.startsWith('/') ? href : `/${href}`;

  // Already localized? keep as is
  if (isLocalizedPath(path)) return path;

  // Normalize double slashes
  path = path.replace(/\/+/g, '/');

  if (locale === 'en') {
    // Special-case root
    if (path === '/' || path === '') return '/en/';
    return `/en${path}`;
  }

  // de: neutral
  return path;
}

/**
 * Wechselt die Locale für den aktuellen Pfad.
 * - Bewahrt Query- und Hash-Anteile
 * - Wenn currentPath NICHT lokalisiert ist (z. B. /pricing), führt es zur Locale-Startseite (z. B. /en/)
 *   bis Wrapper-Routen für alle Seiten verfügbar sind.
 */
export function switchLocalePath(targetLocale: Locale, current: string | URL): string {
  let url: URL;
  if (current instanceof URL) {
    url = current;
  } else {
    // Kann ein Pfad oder eine volle URL sein
    try {
      url = new URL(current);
    } catch {
      url = new URL(current, 'http://local');
    }
  }

  const pathname = url.pathname;
  const isLoc = isLocalizedPath(pathname);

  // Entferne existierende Locale (falls vorhanden)
  const pathWithoutLocale = pathname.replace(LOCALE_PREFIX_RE, '/');

  // Hilfsfunktion: baue Pfad gemäß Ziel-Locale
  const buildPath = (basePath: string): string => {
    if (targetLocale === 'en') {
      return basePath === '/' ? '/en/' : `/en${basePath}`;
    }
    // de: neutral (kein Prefix)
    return basePath;
  };

  let newPath: string;
  if (isLoc) {
    newPath = buildPath(pathWithoutLocale);
  } else {
    // Pfad ist neutral
    if (targetLocale === 'en') {
      // Fallback: gehe zur englischen Startseite, solange nicht überall Wrapper existieren
      newPath = '/en/';
    } else {
      // de: neutral beibehalten
      newPath = pathname;
    }
  }

  return `${newPath}${url.search}${url.hash}`;
}
