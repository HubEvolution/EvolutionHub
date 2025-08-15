// i18n: JSON imports and legacy translation function removed.
export type Locale = 'de' | 'en';

/**
 * Returns the locale based on the URL pathname.
 * Supports various URL patterns: /de/, /de/path, /, /path
 * German: /de/ or /de/path → 'de'
 * English: /en/ or /en/path or / or /path → 'en'
 */
export function getLocale(pathname: string): Locale {
  // Handle root path - default to German for this site
  if (pathname === '/') {
    return 'de';
  }
  
  // Check if path starts with locale prefix
  if (pathname.startsWith('/de/') || pathname === '/de') {
    return 'de';
  } else if (pathname.startsWith('/en/') || pathname === '/en') {
    return 'en';
  }
  
  // If no locale prefix, check if we're on a German page (default for this site)
  // This handles paths like /blog, /pricing etc. - assume German by default
  return 'de';
}


/**
 * Navigates to the same page with the given locale.
 * If the current URL already contains a locale prefix, it is replaced.
 * If no locale prefix is present, the prefix is added.
 *
 * @param locale The target locale ('de' or 'en')
 */
export function navigateLocale(locale: Locale): void {
  if (typeof window === 'undefined') return; // safety for SSR

  const url = new URL(window.location.href);
  const currentPath = url.pathname;
  const isLocalized = /^\/(de|en)(\/|$)/.test(currentPath);

  // If path is not localized (e.g., /pricing, /docs), go to locale home
  if (!isLocalized) {
    url.pathname = `/${locale}/`;
    window.location.assign(url.toString());
    return;
  }

  // Remove existing locale prefix (supports "/de", "/de/", "/en", "/en/")
  const pathWithoutLocale = currentPath.replace(/^\/(de|en)(\/|$)/, '/');
  const newPath = pathWithoutLocale === '/' ? `/${locale}/` : `/${locale}${pathWithoutLocale}`;

  // Preserve search and hash
  url.pathname = newPath;
  window.location.assign(url.toString());
}