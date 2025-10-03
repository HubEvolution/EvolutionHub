import deTranslations from '../locales/de.json';
import enTranslations from '../locales/en.json';
import type { Locale } from '@/lib/i18n';

/**
 * I18n translation function type.
 * getI18n(locale) returns this function. Do NOT destructure `{ t }`.
 */
export interface I18nParams {
  count?: number;
  [key: string]: unknown;
}

export type I18nFn = (key: string, params?: I18nParams) => string;

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
    return (key: string, params?: I18nParams): string => {
      const keys = key.split('.');
      let value: unknown = fallbackTranslations as unknown;
      for (const k of keys) {
        if (value && typeof value === 'object' && k in (value as Record<string, unknown>)) {
          value = (value as Record<string, unknown>)[k];
        } else {
          // Missing key fallback
          return `[${locale}:${key}_fallback_not_found]`;
        }
      }
      if (typeof value === 'string') return formatWithParams(value, params);
      // Attempt pluralization in fallback locale if object with one/other/zero
      const plural = selectPluralString(value, params);
      if (plural !== null) return formatWithParams(plural, params);
      return `[${locale}:${key}_fallback_not_found]`;
    };
  }

  return (key: string, params?: I18nParams): string => {
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
          if (
            fallbackValue &&
            typeof fallbackValue === 'object' &&
            fk in (fallbackValue as Record<string, unknown>)
          ) {
            fallbackValue = (fallbackValue as Record<string, unknown>)[fk];
          } else {
            // Missing in fallback too
            return `[${locale}:${key}_fallback_not_found]`;
          }
        }
        if (typeof fallbackValue === 'string') return formatWithParams(fallbackValue, params);
        const pluralFallback = selectPluralString(fallbackValue, params);
        if (pluralFallback !== null) return formatWithParams(pluralFallback, params);
        // structure not a string and no plural applicable
        return `[${locale}:${key}_fallback_not_found]`;
      }
    }
    if (typeof value === 'string') return formatWithParams(value, params);
    const pluralCurrent = selectPluralString(value, params);
    if (pluralCurrent !== null) return formatWithParams(pluralCurrent, params);
    // not a string and no pluralization
    return `[${locale}:${key}_fallback_not_found]`;
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

function selectPluralString(value: unknown, params?: I18nParams): string | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  const count = typeof params?.count === 'number' ? params!.count : undefined;
  if (count === undefined) return null;

  if ('zero' in obj && count === 0 && typeof obj.zero === 'string') return obj.zero as string;
  if ('one' in obj && count === 1 && typeof obj.one === 'string') return obj.one as string;
  if ('other' in obj && typeof obj.other === 'string') return obj.other as string;
  return null;
}

function formatWithParams(template: string, params?: I18nParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = params[k];
    if (v === null || v === undefined) return `{${k}}`;
    return String(v);
  });
}
