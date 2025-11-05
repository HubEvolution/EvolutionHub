"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLocalizedPath = isLocalizedPath;
exports.getPathLocale = getPathLocale;
exports.localizePath = localizePath;
exports.switchLocalePath = switchLocalePath;
const LOCALE_PREFIX_RE = /^\/(de|en)(\/|$)/;
/**
 * Prüft, ob ein Pfad bereits mit einer Locale versehen ist.
 */
function isLocalizedPath(path) {
    return LOCALE_PREFIX_RE.test(path);
}
/**
 * Liefert die Locale aus einem Pfad, wenn vorhanden.
 */
function getPathLocale(path) {
    const m = path.match(LOCALE_PREFIX_RE);
    return m?.[1] ?? null;
}
/**
 * Baut einen locale-bewussten internen Link.
 * - Externe Links (http/https,//), mailto:, tel:, reine Hash-/Query-Links werden unverändert zurückgegeben
 * - Bereits lokalisierte Pfade bleiben unverändert
 * - Für 'en' wird "/en" vorangestellt; für 'de' bleibt Pfad neutral
 */
function localizePath(locale, href) {
    if (!href)
        return href;
    const lower = href.toLowerCase();
    if (lower.startsWith('http://') ||
        lower.startsWith('https://') ||
        lower.startsWith('//') ||
        lower.startsWith('mailto:') ||
        lower.startsWith('tel:') ||
        href.startsWith('#') ||
        href.startsWith('?')) {
        return href;
    }
    // Ensure leading slash
    let path = href.startsWith('/') ? href : `/${href}`;
    // Already localized? keep as is
    if (isLocalizedPath(path))
        return path;
    // Normalize double slashes
    path = path.replace(/\/+/g, '/');
    if (locale === 'en') {
        // Special-case root
        if (path === '/' || path === '')
            return '/en/';
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
function switchLocalePath(targetLocale, current) {
    let url;
    if (current instanceof URL) {
        url = current;
    }
    else {
        // Kann ein Pfad oder eine volle URL sein
        try {
            url = new URL(current);
        }
        catch {
            url = new URL(current, 'http://local');
        }
    }
    const pathname = url.pathname;
    const isLoc = isLocalizedPath(pathname);
    // Entferne existierende Locale (falls vorhanden)
    const pathWithoutLocale = pathname.replace(LOCALE_PREFIX_RE, '/');
    // Hilfsfunktion: baue Pfad gemäß Ziel-Locale
    const buildPath = (basePath) => {
        if (targetLocale === 'en') {
            return basePath === '/' ? '/en/' : `/en${basePath}`;
        }
        // de: neutral (kein Prefix)
        return basePath;
    };
    let newPath;
    if (isLoc) {
        newPath = buildPath(pathWithoutLocale);
    }
    else {
        // Pfad ist neutral
        if (targetLocale === 'en') {
            // Fallback: gehe zur englischen Startseite, solange nicht überall Wrapper existieren
            newPath = '/en/';
        }
        else {
            // de: neutral beibehalten
            newPath = pathname;
        }
    }
    return `${newPath}${url.search}${url.hash}`;
}
