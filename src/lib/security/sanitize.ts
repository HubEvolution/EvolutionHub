/**
 * Content Sanitization für User-Generated Content
 * Verhindert XSS-Angriffe durch HTML/Script-Injection
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes comment content to prevent XSS attacks
 * Allows only safe HTML tags for basic formatting
 *
 * @param dirty - Unsanitized user input
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeCommentContent(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'title'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
  });
}

/**
 * Strips all HTML tags from content
 * Use for plain-text-only contexts (emails, notifications)
 *
 * @param dirty - Content with potential HTML
 * @returns Plain text without any HTML
 */
export function stripHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  });
}
