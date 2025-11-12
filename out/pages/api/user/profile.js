'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.POST = void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const response_helpers_1 = require('@/lib/response-helpers');
const security_logger_1 = require('@/lib/security-logger');
const accept_language_1 = require('@/lib/i18n/accept-language');
const i18n_1 = require('@/utils/i18n');
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
exports.POST = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
  const locals = context.locals;
  const formData = await context.request.formData();
  const name = formData.get('name');
  const username = formData.get('username');
  const nextRaw = formData.get('next');
  // Determine locale from Accept-Language (API context has no /en path)
  const locale = (0, accept_language_1.pickBestLanguage)(
    context.request.headers.get('accept-language') || null,
    'de'
  );
  const t = (0, i18n_1.getI18n)(locale);
  // Verbesserte Validierung mit Grenzen
  if (typeof name !== 'string' || name.length < 2 || name.length > 50) {
    return (0, api_middleware_1.createApiError)(
      'validation_error',
      'Name must be between 2 and 50 characters'
    );
  }
  if (typeof username !== 'string' || username.length < 3 || username.length > 30) {
    return (0, api_middleware_1.createApiError)(
      'validation_error',
      'Username must be between 3 and 30 characters'
    );
  }
  // Username-Format-Validierung mit RegEx
  const usernamePattern = /^[a-zA-Z0-9_]+$/;
  if (!usernamePattern.test(username)) {
    return (0, api_middleware_1.createApiError)(
      'validation_error',
      'Username may only contain letters, numbers and underscores'
    );
  }
  const db = locals.runtime.env.DB;
  // Cooldown config: default 30 days, env override via PROFILE_UPDATE_COOLDOWN_DAYS
  const env = locals.runtime?.env || {};
  const parsedDays = Number.parseInt(env.PROFILE_UPDATE_COOLDOWN_DAYS || '', 10);
  const cooldownDays = Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : 30;
  const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
  const nowMs = Date.now();
  // Determine role and last profile update timestamp from DB (authoritative)
  const metaRowUnknown = await db
    .prepare('SELECT role, profile_last_updated_at AS last FROM users WHERE id = ? LIMIT 1')
    .bind(locals.user.id)
    .first();
  const metaRow = metaRowUnknown || {};
  const role = metaRow?.role || 'user';
  const lastUpdate = typeof metaRow?.last === 'number' ? metaRow.last : null;
  // Only enforce cooldown for normal users and when changes actually occur
  const currentName = String(locals.user.name ?? '');
  const currentUsername = String(locals.user.username ?? '');
  const willChange = name !== currentName || username !== currentUsername;
  if (!willChange) {
    if (role === 'user' && lastUpdate && nowMs - lastUpdate < cooldownMs) {
      const retryAfterSec = Math.max(1, Math.ceil((lastUpdate + cooldownMs - nowMs) / 1000));
      const days = Math.ceil(retryAfterSec / (24 * 60 * 60));
      const msg = t('api.user.profile.cooldown', { count: days });
      const base = (0, api_middleware_1.createApiError)('rate_limit', msg, {
        retryAfterSeconds: retryAfterSec,
      });
      const headers = new Headers(base.headers);
      headers.set('Retry-After', String(retryAfterSec));
      return new Response(base.body, { status: base.status, headers });
    }
    return (0, api_middleware_1.createApiSuccess)({
      message: t('api.user.profile.no_changes'),
      user: {
        id: locals.user.id,
        name: currentName,
        username: currentUsername,
      },
    });
  }
  if (willChange && role === 'user' && lastUpdate && nowMs - lastUpdate < cooldownMs) {
    const retryAfterSec = Math.max(1, Math.ceil((lastUpdate + cooldownMs - nowMs) / 1000));
    const days = Math.ceil(retryAfterSec / (24 * 60 * 60));
    const msg = t('api.user.profile.cooldown', { count: days });
    const base = (0, api_middleware_1.createApiError)('rate_limit', msg, {
      retryAfterSeconds: retryAfterSec,
    });
    const headers = new Headers(base.headers);
    headers.set('Retry-After', String(retryAfterSec));
    return new Response(base.body, { status: base.status, headers });
  }
  // Prüfen auf Username-Kollision, aber nur wenn sich der Username geändert hat
  if (username !== locals.user.username) {
    const existingUser = await db
      .prepare('SELECT id FROM users WHERE username = ? AND id != ?')
      .bind(username, locals.user.id)
      .first();
    if (existingUser) {
      return (0, api_middleware_1.createApiError)('validation_error', 'Username already taken');
    }
  }
  // Aktualisieren des Profils
  await db
    .prepare('UPDATE users SET name = ?, username = ?, profile_last_updated_at = ? WHERE id = ?')
    .bind(name, username, nowMs, locals.user.id)
    .run();
  // Erfolgreiche Aktualisierung protokollieren
  (0, security_logger_1.logProfileUpdate)(locals.user.id, {
    oldUsername: locals.user.username,
    newUsername: username,
    oldName: locals.user.name,
    newName: name,
  });
  // Optionaler Redirect nach erfolgreicher Aktualisierung (nur für HTML-Form-Flow)
  const isAllowedRelativePath = (p) => {
    return typeof p === 'string' && p.startsWith('/') && !p.startsWith('//');
  };
  try {
    const accept = context.request.headers.get('accept') || '';
    const wantsHtml = /\btext\/html\b/i.test(accept);
    if (wantsHtml && isAllowedRelativePath(nextRaw)) {
      return (0, response_helpers_1.createSecureRedirect)(nextRaw, 303);
    }
  } catch {}
  // Erfolgreiche Aktualisierung mit aktualisierten Daten zurückgeben (JSON API)
  return (0, api_middleware_1.createApiSuccess)({
    message: 'Profile updated successfully',
    user: {
      id: locals.user.id,
      name,
      username,
    },
  });
});
