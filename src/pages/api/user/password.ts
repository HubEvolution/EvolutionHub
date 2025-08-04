import type { APIContext } from 'astro';
import { hash, compare } from 'bcrypt-ts';
import { withApiMiddleware, createApiSuccess } from '@/lib/api-middleware';
import { logApiAccess, logSecurityEvent } from '@/lib/security-logger';

/**
 * POST /api/user/password
 * Ändert das Passwort eines Benutzers
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 */
export const POST = withApiMiddleware(async (context: APIContext) => {
  const { locals, clientAddress, url } = context;
  const user = locals.user;
  const endpoint = url ? url.pathname : '/api/user/password';

  const formData = await context.request.formData();
  const currentPassword = formData.get('current-password');
  const newPassword = formData.get('new-password');

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 6) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const db = locals.runtime.env.DB;
  const userResult = await db.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.id).first();

  if (!userResult || !userResult.password_hash) {
    return new Response(JSON.stringify({ error: 'User not found' }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const validPassword = await compare(currentPassword, userResult.password_hash);
  if (!validPassword) {
    // Fehlgeschlagene Passwortänderung protokollieren
    logSecurityEvent(user.id, clientAddress, {
      event: 'password_change_failed',
      reason: 'incorrect_current_password',
      endpoint
    });
    
    return new Response(JSON.stringify({ error: 'Incorrect current password' }), { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const hashedPassword = await hash(newPassword, 10);
  await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .bind(hashedPassword, user.id)
    .run();
    
  // Erfolgreiche Passwortänderung protokollieren
  logSecurityEvent(user.id, clientAddress, {
    event: 'password_changed',
    endpoint
  });
  
  // API-Zugriff protokollieren
  logApiAccess(user.id, clientAddress, {
    endpoint,
    method: 'POST',
    action: 'password_update'
  });
  
  return createApiSuccess({ message: 'Password updated successfully' });
}, {
  // Erfordert Authentifizierung
  requireAuth: true,
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    console.error('Password update error:', error);
    
    return new Response(JSON.stringify({ error: 'An unknown error occurred during password update' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});