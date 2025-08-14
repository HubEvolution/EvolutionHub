import deTranslations from '../locales/de.json';
import enTranslations from '../locales/en.json';
import type { Locale } from '@/lib/i18n';

// Define a general type for translations, assuming both files have similar structure
// In a real-world scenario, you might want more robust type checking or generation.
type Locales = {
  de: typeof deTranslations;
  en: typeof enTranslations;
};

const translations: Locales = {
  de: deTranslations,
  en: enTranslations,
};

export function getI18n(locale: Locale) {
  const currentTranslations = translations[locale];

  if (!currentTranslations) {
    console.warn(`Locale "${locale}" not found. Using English as fallback.`);
    // Fallback to English if locale is not found
    const fallbackTranslations = translations.en;
    return (key: string): string => {
      const keys = key.split('.');
      let value: any = fallbackTranslations;
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          // Return a placeholder if the key doesn't exist in fallback
          return `[${locale}:${key}_fallback_not_found]`;
        }
      }
      return String(value);
    };
  }

  return (key: string): string => {
    const keys = key.split('.');
    let value: any = currentTranslations;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Key not found in the current locale, try English as fallback
        console.warn(`Key "${key}" not found in locale "${locale}". Falling back to English.`);
        const englishValueTranslations = translations.en;
        let fallbackValue: any = englishValueTranslations;
        for (const fk of keys) {
          if (fallbackValue && typeof fallbackValue === 'object' && fk in fallbackValue) {
            fallbackValue = fallbackValue[fk];
          } else {
            return `[${locale}:${key}_fallback_not_found]`; // Key not found even in fallback
          }
        }
        return String(fallbackValue);
      }
    }
    return String(value);
  };
}