// Import locale JSON files
import de from '../locales/de.json';
import en from '../locales/en.json';

export type Locale = 'de' | 'en';

// Locale data structure
const locales = {
  de,
  en
} as const;

// Translation interface
interface TranslationFunction {
  translate: (key: string) => string;
  currentLang: Locale;
}

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
 * Helper function to extract language from pathname (internal use)
 */
const getLangFromPath = (pathname: string): Locale => {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length > 0 && ['de', 'en'].includes(parts[0])) {
    return parts[0] as Locale;
  }
  return 'de'; // Fallback to German
};

/**
 * Main i18n function - provides translation functionality
 * @param pathname - URL pathname to determine language
 * @returns Translation function with translate method and current language
 */
export const i18n = (pathname?: string): TranslationFunction => {
  // Determine language from pathname or use default
  const lang = pathname ? getLangFromPath(pathname) : 'de';
  const translations = locales[lang] || locales.de; // Fallback to German

  return {
    translate: (key: string): string => {
      // Traverse object to get the translation
      const keys = key.split('.');
      let value: any = translations;
      
      for (const k of keys) {
        if (value && typeof value === 'object' && value.hasOwnProperty(k)) {
          value = value[k];
        } else {
          // Return key if translation not found, or return a placeholder/error
          console.warn(`Translation key "${key}" not found for language "${lang}".`);
          return `[${key}]`; // Return key as placeholder if not found
        }
      }
      
      return typeof value === 'string' ? value : `[${key}]`;
    },
    currentLang: lang
  };
};

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

// Default export for compatibility with existing imports
export default { i18n, getLocale, navigateLocale };