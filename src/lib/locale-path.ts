import type { Locale } from '@/lib/i18n';

const LOCALE_PREFIX_RE = /^\/(de|en)(\/|$)/;

function toUrl(input: string | URL): URL {
  if (input instanceof URL) return input;
  try {
    return new URL(input);
  } catch {
    return new URL(input, 'http://local');
  }
}

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
  return mapLocaleHref(targetLocale, current);
}

/**
 * Mappt eine bestehende URL (oder Pfad) auf die Ziel-Locale und entfernt Steuer-Parameter.
 */
export function mapLocaleHref(targetLocale: Locale, input: string | URL): string {
  const url = toUrl(input);
  const pathname = url.pathname.replace(LOCALE_PREFIX_RE, '/');

  const buildPath = (basePath: string): string => {
    if (targetLocale === 'en') {
      return basePath === '/' ? '/en/' : `/en${basePath}`;
    }
    // de: neutral (kein Prefix)
    return basePath === '' ? '/' : basePath;
  };

  const targetPath = buildPath(pathname === '' ? '/' : pathname);
  const searchParams = new URLSearchParams(url.search);
  searchParams.delete('set_locale');
  searchParams.delete('next');
  const search = searchParams.toString();
  const hash = url.hash ?? '';

  return `${targetPath}${search ? `?${search}` : ''}${hash}`;
}
