import type { APIContext } from 'astro';
import { hash, compare } from 'bcrypt-ts';
import { withAuthApiMiddleware, createApiSuccess, createApiError } from '@/lib/api-middleware';
import { logUserEvent } from '@/lib/security-logger';

/**
 * POST /api/user/password
 * Ändert das Passwort eines Benutzers
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 */
export const POST = withAuthApiMiddleware(async (context: APIContext) => {
  const { locals, clientAddress } = context;
  const user = locals.user; // Das authentifizierte Benutzerobjekt

  const formData = await context.request.formData();
  const currentPassword = formData.get('current-password');
  const newPassword = formData.get('new-password');

  // Grundlegende Validierung der Eingabeparameter
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 6) {
    // Logging des Fehlversuchs mit spezifischem Grund
    logUserEvent(user.id, 'password_change_failed', {
      reason: 'invalid_input',
      ipAddress: clientAddress
    });
    return createApiError('validation_error', 'Password must be at least 6 characters');
  }

  const db = locals.runtime.env.DB;
  const userResult = await db.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.id).first();

  // Überprüfen, ob der Benutzer und sein Passwort-Hash existieren
  if (!userResult || !userResult.password_hash) {
    // Dies sollte idealerweise nicht passieren, wenn die Authentifizierung erfolgreich war
    logUserEvent(user.id, 'password_change_failed', {
      reason: 'user_or_hash_missing',
      ipAddress: clientAddress
    });
    return createApiError('not_found', 'User not found');
  }

  // Aktuelles Passwort vergleichen
  const validPassword = await compare(currentPassword, userResult.password_hash);
  if (!validPassword) {
    // Fehlgeschlagene Passwortänderung protokollieren
    logUserEvent(user.id, 'password_change_failed', {
      reason: 'incorrect_current_password',
      ipAddress: clientAddress
    });
    
    return createApiError('forbidden', 'Incorrect current password');
  }

  // Neues Passwort hashen und in der Datenbank speichern
  const hashedPassword = await hash(newPassword, 10); // bcrypt Work-Factor 10
  await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .bind(hashedPassword, user.id)
    .run();
    
  // Erfolgreiche Passwortänderung protokollieren
  logUserEvent(user.id, 'password_changed', {
    ipAddress: clientAddress
  });
  
  // Erfolgsmeldung zurückgeben
  return createApiSuccess({ message: 'Password updated successfully' });
}, {
  // Zusätzliche Logging-Metadaten
  logMetadata: { action: 'password_update' },
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt, um detailliertes Logging zu ermöglichen
  onError: (context, error) => {
    const { locals, clientAddress } = context;
    const user = locals.user; // Sicherstellen, dass user vorhanden ist, da withAuthApiMiddleware es hinzufügt
    
    // Fehler protokollieren, falls Benutzerobjekt vorhanden ist
    if (user) {
      logUserEvent(user.id, 'password_update_error', {
        error: error instanceof Error ? error.message : String(error),
        ipAddress: clientAddress
      });
    }
    
    // Einheitliche Fehlermeldung an den Client senden
    return createApiError('server_error', 'An error occurred during password update');
  }
});