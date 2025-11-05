"use strict";
/**
 * Content Sanitization für User-Generated Content
 * Verhindert XSS-Angriffe durch HTML/Script-Injection
 *
 * Hinweis: Um Cloudflare-Worker (kein window) kompatibel zu bleiben,
 * vermeiden wir eine harte Abhängigkeit auf DOMPurify. Stattdessen
 * verwenden wir eine konservative Escape/Whitelist-Strategie.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeCommentContent = sanitizeCommentContent;
exports.stripHtml = stripHtml;
/**
 * Sanitizes comment content to prevent XSS attacks
 * Allows only safe HTML tags for basic formatting
 *
 * @param dirty - Unsanitized user input
 * @returns Sanitized HTML string safe for rendering
 */
function sanitizeCommentContent(dirty) {
    const text = String(dirty ?? '');
    // Escape all, then allow a tiny subset via reversible placeholders
    let esc = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    // Optional: permit simple <b>,<i>,<em>,<strong>,<code>,<pre>,<br>,<p>, and <a href="...">
    // Convert encoded tags back if they match the safe pattern
    esc = esc
        // br and p
        .replace(/&lt;br\/?&gt;/gi, '<br/>')
        .replace(/&lt;p&gt;/gi, '<p>')
        .replace(/&lt;\/p&gt;/gi, '</p>')
        // inline formatting
        .replace(/&lt;(b|i|em|strong|code|pre)&gt;/gi, '<$1>')
        .replace(/&lt;\/(b|i|em|strong|code|pre)&gt;/gi, '</$1>')
        // links with http(s)/mailto only
        .replace(/&lt;a\s+href=&quot;((?:https?:\/\/|mailto:)[^"<>\s]+)&quot;(?:\s+title=&quot;([^"<>]*)&quot;)?&gt;/gi, (_m, href, title) => {
        const t = title ? ` title="${title}"` : '';
        return `<a href="${href}"${t}>`;
    })
        .replace(/&lt;\/a&gt;/gi, '</a>');
    return esc;
}
/**
 * Strips all HTML tags from content
 * Use for plain-text-only contexts (emails, notifications)
 *
 * @param dirty - Content with potential HTML
 * @returns Plain text without any HTML
 */
function stripHtml(dirty) {
    const text = String(dirty ?? '');
    // Remove tags, keep text
    return text.replace(/<[^>]*>/g, '');
}
