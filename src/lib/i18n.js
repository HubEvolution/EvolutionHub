import de from '../locales/de.json';
import en from '../locales/en.json';

const locales = {
  de,
  en
};

// Funktion zur Erkennung der aktuellen Sprache (z.B. aus der URL oder Benutzerpräferenzen)
// Für den Anfang nehmen wir an, die Sprache wird aus der URL extrahiert (z.B. '/de/' oder '/en/')
// TODO: Implementiere eine robustere Sprachauswahl (z.B. basierend auf Browser-Einstellungen oder Cookies)
const getLangFromPath = (pathname) => {
  // Korrigierte Logik zur Sprachbestimmung aus dem Pfad
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length > 0 && ['de', 'en'].includes(parts[0])) {
    return parts[0];
  }
  // Hier holen wir uns die Standard-Sprache aus der i18n-Konfiguration
  // Da wir die Konfiguration in astro.config.mjs haben, holen wir sie nicht von hier
  // Aber für den Fall dass dies separat ausgeführt wird, setzen wir es auf 'de'
  return 'de'; // Fallback to German
};

// Funktion für i18n mit explizitem Export
export const i18n = (pathname) => {
  // Wenn pathname nicht gegeben ist, versuchen wir, die Sprache aus der globalen Konfiguration zu ermitteln
  // oder wir nutzen den Standard, falls nichts gefunden wird.
  const lang = pathname ? getLangFromPath(pathname) : 'de'; // Fallback to German
  const translations = locales[lang] || locales.de; // Fallback to German

  return {
    translate: (key) => {
      // Traverse object to get the translation
      const keys = key.split('.');
      let value = translations;
      for (const k of keys) {
        if (value && typeof value === 'object' && value.hasOwnProperty(k)) {
          value = value[k];
        } else {
          // Return key if translation not found, or return a placeholder/error
          console.warn(`Translation key "${key}" not found for language "${lang}".`);
          return `[${key}]`; // Return key as placeholder if not found
        }
      }
      return value;
    },
    currentLang: lang
  };
};

/**
 * Returns the locale based on the URL pathname.
 * Supports various URL patterns: /de/, /de/path, /, /path
 * German: /de/ or /de/path → 'de'
 * English: /en/ or /en/path or / or /path → 'en'
 */
export function getLocale(pathname) {
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

// Zusätzlicher Default-Export für einfachere Imports
export default { i18n, getLocale };

// Auch direkter Export von i18n für Importe wie `import { i18n } from '@/lib/i18n.js'`
// war bereits oben mit 'export const i18n = ...' implementiert