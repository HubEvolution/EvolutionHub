import deTranslations from '../locales/de.json';
import enTranslations from '../locales/en.json';
import type { Locale } from '@/lib/i18n';

/**
 * I18n translation function type.
 * getI18n(locale) returns this function. Do NOT destructure `{ t }`.
 */
export type I18nFn = (key: string) => string;

// Define a general type for translations, assuming both files have similar structure
// In a real-world scenario, you might want more robust type checking or generation.
type Locales = {
  de: typeof deTranslations;
  en: typeof enTranslations;
};

const translations: Locales = {
  de: deTranslations,
  en: enTranslations,
} as const;

export function getI18n(locale: Locale): I18nFn {
  const currentTranslations = translations[locale];

  if (!currentTranslations) {
    console.warn(`Locale "${locale}" not found. Using English as fallback.`);
    // Fallback to English if locale is not found
    const fallbackTranslations = translations.en;
    return (key: string): string => {
      const keys = key.split('.');
      let value: unknown = fallbackTranslations as unknown;
      for (const k of keys) {
        if (value && typeof value === 'object' && k in (value as Record<string, unknown>)) {
          value = (value as Record<string, unknown>)[k];
        } else {
          // Return a placeholder if the key doesn't exist in fallback
          return `[${locale}:${key}_fallback_not_found]`;
        }
      }
      return typeof value === 'string' ? value : `[${locale}:${key}_fallback_not_found]`;
    };
  }

  return (key: string): string => {
    const keys = key.split('.');
    let value: unknown = currentTranslations as unknown;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[k];
      } else {
        // Key not found in the current locale, try English as fallback
        console.warn(`Key "${key}" not found in locale "${locale}". Falling back to English.`);
        const englishValueTranslations = translations.en;
        let fallbackValue: unknown = englishValueTranslations as unknown;
        for (const fk of keys) {
          if (fallbackValue && typeof fallbackValue === 'object' && fk in (fallbackValue as Record<string, unknown>)) {
            fallbackValue = (fallbackValue as Record<string, unknown>)[fk];
          } else {
            return `[${locale}:${key}_fallback_not_found]`; // Key not found even in fallback
          }
        }
        return typeof fallbackValue === 'string' ? fallbackValue : `[${locale}:${key}_fallback_not_found]`;
      }
    }
    return typeof value === 'string' ? value : `[${locale}:${key}_not_string]`;
  };
}

/**
 * Retrieve an array translation for a given key, with English fallback.
 * Returns an empty array if not found.
 */
export function getI18nArray(locale: Locale) {
  const current = translations[locale] ?? translations.en;

  const resolve = (root: unknown, key: string): unknown => {
    const keys = key.split('.');
    let value: unknown = root;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return undefined;
      }
    }
    return value;
  };

  return (key: string): string[] => {
    const val = resolve(current as unknown, key);
    if (Array.isArray(val)) return val as string[];

    const fallbackVal = resolve(translations.en as unknown, key);
    if (Array.isArray(fallbackVal)) return fallbackVal as string[];

    console.warn(`Key "${key}" not found as array in locale "${locale}" or fallback.`);
    return [];
  };
}