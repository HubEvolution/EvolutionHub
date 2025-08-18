// i18n: JSON imports and legacy translation function removed.
export type Locale = 'de' | 'en';

/**
 * Returns the locale based on the URL pathname.
 * Strategy: German is neutral (no /de prefix), English uses /en.
 * Examples:
 * - '/' or '/path' → 'de'
 * - '/de' or '/de/path' → 'de' (legacy, will be redirected to neutral)
 * - '/en' or '/en/path' → 'en'
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
 * If no locale prefix is present:
 *   - target 'en' → prefix with /en
 *   - target 'de' → stay neutral (no /de)
 *
 * @param locale The target locale ('de' or 'en')
 */
export function navigateLocale(locale: Locale): void {
  if (typeof window === 'undefined') return; // safety for SSR

  const loc = window.location as any;
  const currentPath: string = loc.pathname || '/';
  const currentSearch: string = loc.search || '';
  const currentHash: string = loc.hash || '';
  const isLocalized = /^(\/)(de|en)(\/|$)/.test(currentPath);

  // If path is not localized (e.g., /pricing, /docs)
  if (!isLocalized) {
    const targetPath = locale === 'en'
      ? (currentPath === '/' ? '/en/' : `/en${currentPath}`)
      : currentPath; // de: keep neutral
    const final = `${targetPath}${currentSearch}${currentHash}`;
    window.location.assign(final);
    return;
  }

  // Remove existing locale prefix (supports "/de", "/de/", "/en", "/en/")
  const pathWithoutLocale = currentPath.replace(/^\/(de|en)(\/|$)/, '/');
  const newPath = locale === 'en'
    ? (pathWithoutLocale === '/' ? '/en/' : `/en${pathWithoutLocale}`)
    : pathWithoutLocale; // de: neutral

  const final = `${newPath}${currentSearch}${currentHash}`;
  window.location.assign(final);
}