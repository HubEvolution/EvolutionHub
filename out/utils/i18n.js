"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getI18n = getI18n;
exports.getI18nArray = getI18nArray;
const de_json_1 = require("../locales/de.json");
const en_json_1 = require("../locales/en.json");
const translations = {
    de: de_json_1.default,
    en: en_json_1.default,
};
function getI18n(locale) {
    const currentTranslations = translations[locale];
    if (!currentTranslations) {
        console.warn(`Locale "${locale}" not found. Using English as fallback.`);
        // Fallback to English if locale is not found
        const fallbackTranslations = translations.en;
        return (key, params) => {
            const keys = key.split('.');
            let value = fallbackTranslations;
            for (const k of keys) {
                if (value && typeof value === 'object' && k in value) {
                    value = value[k];
                }
                else {
                    // Missing key fallback
                    return `[${locale}:${key}_fallback_not_found]`;
                }
            }
            if (typeof value === 'string')
                return formatWithParams(value, params);
            // Attempt pluralization in fallback locale if object with one/other/zero
            const plural = selectPluralString(value, params);
            if (plural !== null)
                return formatWithParams(plural, params);
            return `[${locale}:${key}_fallback_not_found]`;
        };
    }
    return (key, params) => {
        const keys = key.split('.');
        let value = currentTranslations;
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            }
            else {
                // Key not found in the current locale, try English as fallback
                console.warn(`Key "${key}" not found in locale "${locale}". Falling back to English.`);
                const englishValueTranslations = translations.en;
                let fallbackValue = englishValueTranslations;
                for (const fk of keys) {
                    if (fallbackValue &&
                        typeof fallbackValue === 'object' &&
                        fk in fallbackValue) {
                        fallbackValue = fallbackValue[fk];
                    }
                    else {
                        // Missing in fallback too
                        return `[${locale}:${key}_fallback_not_found]`;
                    }
                }
                if (typeof fallbackValue === 'string')
                    return formatWithParams(fallbackValue, params);
                const pluralFallback = selectPluralString(fallbackValue, params);
                if (pluralFallback !== null)
                    return formatWithParams(pluralFallback, params);
                // structure not a string and no plural applicable
                return `[${locale}:${key}_fallback_not_found]`;
            }
        }
        if (typeof value === 'string')
            return formatWithParams(value, params);
        const pluralCurrent = selectPluralString(value, params);
        if (pluralCurrent !== null)
            return formatWithParams(pluralCurrent, params);
        // not a string and no pluralization
        return `[${locale}:${key}_fallback_not_found]`;
    };
}
/**
 * Retrieve an array translation for a given key, with English fallback.
 * Returns an empty array if not found.
 */
function getI18nArray(locale) {
    const current = translations[locale] ?? translations.en;
    const resolve = (root, key) => {
        const keys = key.split('.');
        let value = root;
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            }
            else {
                return undefined;
            }
        }
        return value;
    };
    return (key) => {
        const val = resolve(current, key);
        if (Array.isArray(val))
            return val;
        const fallbackVal = resolve(translations.en, key);
        if (Array.isArray(fallbackVal))
            return fallbackVal;
        console.warn(`Key "${key}" not found as array in locale "${locale}" or fallback.`);
        return [];
    };
}
function selectPluralString(value, params) {
    if (!value || typeof value !== 'object')
        return null;
    const obj = value;
    const count = typeof params?.count === 'number' ? params.count : undefined;
    if (count === undefined)
        return null;
    if ('zero' in obj && count === 0 && typeof obj.zero === 'string')
        return obj.zero;
    if ('one' in obj && count === 1 && typeof obj.one === 'string')
        return obj.one;
    if ('other' in obj && typeof obj.other === 'string')
        return obj.other;
    return null;
}
function formatWithParams(template, params) {
    if (!params)
        return template;
    return template.replace(/\{(\w+)\}/g, (_, k) => {
        const v = params[k];
        if (v === null || v === undefined)
            return `{${k}}`;
        return String(v);
    });
}
