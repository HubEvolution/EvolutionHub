import type { APIContext } from 'astro';
import { withAuthApiMiddleware, createApiSuccess, createApiError } from '@/lib/api-middleware';
import { createSecureRedirect } from '@/lib/response-helpers';
import { logProfileUpdate } from '@/lib/security-logger';

/**
 * POST /api/user/profile
 * Aktualisiert das Benutzerprofil mit validierten Daten.
 * Implementiert Username-Kollisionsprüfung, verbesserte Validierung,
 * Rate-Limiting, Security-Headers und Audit-Logging.
 *
 * Verwendet die withAuthApiMiddleware für:
 * - Authentifizierungsprüfung
 * - Rate-Limiting
 * - Security-Headers
 * - Einheitliche Fehlerbehandlung
 */
export const POST = withAuthApiMiddleware(async (context: APIContext) => {
  const locals = context.locals as any;

  const formData = await context.request.formData();
  const name = formData.get('name');
  const username = formData.get('username');
  const nextRaw = formData.get('next');

  // Verbesserte Validierung mit Grenzen
  if (typeof name !== 'string' || name.length < 2 || name.length > 50) {
    return createApiError('validation_error', 'Name must be between 2 and 50 characters');
  }

  if (typeof username !== 'string' || username.length < 3 || username.length > 30) {
    return createApiError('validation_error', 'Username must be between 3 and 30 characters');
  }

  // Username-Format-Validierung mit RegEx
  const usernamePattern = /^[a-zA-Z0-9_]+$/;
  if (!usernamePattern.test(username)) {
    return createApiError(
      'validation_error',
      'Username may only contain letters, numbers and underscores'
    );
  }

  const db = locals.runtime.env.DB;

  // Prüfen auf Username-Kollision, aber nur wenn sich der Username geändert hat
  if (username !== locals.user.username) {
    const existingUser = await db
      .prepare('SELECT id FROM users WHERE username = ? AND id != ?')
      .bind(username, locals.user.id)
      .first();

    if (existingUser) {
      return createApiError('validation_error', 'Username already taken');
    }
  }

  // Aktualisieren des Profils
  await db
    .prepare('UPDATE users SET name = ?, username = ? WHERE id = ?')
    .bind(name, username, locals.user.id)
    .run();

  // Erfolgreiche Aktualisierung protokollieren
  logProfileUpdate(locals.user.id, {
    oldUsername: locals.user.username,
    newUsername: username,
    oldName: locals.user.name,
    newName: name,
  });

  // Optionaler Redirect nach erfolgreicher Aktualisierung (nur für HTML-Form-Flow)
  const isAllowedRelativePath = (p: unknown): p is string => {
    return typeof p === 'string' && p.startsWith('/') && !p.startsWith('//');
  };
  try {
    const accept = context.request.headers.get('accept') || '';
    const wantsHtml = /\btext\/html\b/i.test(accept);
    if (wantsHtml && isAllowedRelativePath(nextRaw)) {
      return createSecureRedirect(nextRaw, 303);
    }
  } catch {}

  // Erfolgreiche Aktualisierung mit aktualisierten Daten zurückgeben (JSON API)
  return createApiSuccess({
    message: 'Profile updated successfully',
    user: {
      id: locals.user.id,
      name,
      username,
    },
  });
});
