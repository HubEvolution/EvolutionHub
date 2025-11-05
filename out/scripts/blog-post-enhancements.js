"use strict";
/*
 * Blog Post Enhancements
 * - Lazy Loading für Artikelbilder
 * - A11y-Verbesserung für Fußnotenlinks
 *
 * Hinweis: Idempotent und ohne Top-Level-Side-Effects. Exportiert init()/cleanup().
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = init;
exports.cleanup = cleanup;
let initialized = false;
function enhanceLazyImages() {
    try {
        const images = document.querySelectorAll('article img:not([loading])');
        images.forEach((img) => {
            // Prefer property when available, but always set attribute for broad support
            if ('loading' in img) {
                img.loading = 'lazy';
            }
            img.setAttribute('loading', 'lazy');
        });
    }
    catch (err) {
        if (import.meta.env.DEV)
            console.warn('[BlogEnhancements] enhanceLazyImages failed', err);
    }
}
// Smooth Scrolling wird global in `src/layouts/BaseLayout.astro` gehandhabt,
// daher kein zusätzlicher Click-Listener hier, um Doppelbindungen zu vermeiden.
function enhanceFootnotes() {
    try {
        const footnotes = document.querySelectorAll('a[href^="#fn"], a[href^="#ref"]');
        footnotes.forEach((a) => {
            if (a.hasAttribute('data-footnote-enhanced'))
                return;
            a.setAttribute('data-footnote-enhanced', 'true');
            a.setAttribute('data-tooltip', 'Zum entsprechenden Absatz springen');
            a.classList.add('underline', 'decoration-dotted', 'decoration-gray-400', 'underline-offset-4');
        });
    }
    catch (err) {
        if (import.meta.env.DEV)
            console.warn('[BlogEnhancements] enhanceFootnotes failed', err);
    }
}
function init() {
    if (initialized)
        return;
    if (typeof document === 'undefined')
        return;
    enhanceLazyImages();
    enhanceFootnotes();
    initialized = true;
}
function cleanup() {
    if (!initialized)
        return;
    initialized = false;
}
