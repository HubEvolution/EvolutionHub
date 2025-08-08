export type Locale = 'de' | 'en';

/**
 * Returns the locale based on the URL pathname.
 * If the pathname starts with `/de/` → 'de', otherwise → 'en'.
 */
export function getLocale(pathname: string): Locale {
  return pathname.startsWith('/de/') ? 'de' : 'en';
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
  const currentLocale = getLocale(url.pathname);

  // If already on the desired locale, do nothing
  if (currentLocale === locale) return;

  // Remove existing locale prefix (if any) and prepend the new one
  const pathWithoutLocale = url.pathname.replace(/^\/(de|en)/, '');
  const newPath = `/${locale}${pathWithoutLocale}`;

  // Preserve search and hash
  url.pathname = newPath;
  window.location.assign(url.toString());
}