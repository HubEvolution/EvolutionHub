import type { APIContext } from 'astro';
import { standardApiLimiter } from '@/lib/rate-limiter';
import { secureJsonResponse, secureErrorResponse } from '@/lib/security-headers';
import { logProfileUpdate, logApiError, logPermissionDenied } from '@/lib/security-logger';

/**
 * POST /api/user/profile
 * Aktualisiert das Benutzerprofil mit validierten Daten.
 * Implementiert Username-Kollisionsprüfung, verbesserte Validierung,
 * Rate-Limiting, Security-Headers und Audit-Logging.
 */
export async function POST(context: APIContext): Promise<Response> {
  // Rate-Limiting anwenden
  const rateLimitResponse = await standardApiLimiter(context);
  if (rateLimitResponse) {
    return rateLimitResponse; // Wenn Rate-Limit überschritten wurde
  }
  
  const locals = context.locals as any;
  if (!locals.user) {
    // Unautorisierter Zugriff protokollieren
    logPermissionDenied('anonymous', '/api/user/profile', {
      message: 'Unauthenticated profile update attempt',
      ip: context.clientAddress
    });
    
    return secureErrorResponse('Not authenticated', 401);
  }

  const formData = await context.request.formData();
  const name = formData.get('name');
  const username = formData.get('username');

  // Verbesserte Validierung mit Grenzen
  if (typeof name !== 'string' || name.length < 2 || name.length > 50) {
    return secureErrorResponse('Name must be between 2 and 50 characters', 400);
  }

  if (typeof username !== 'string' || username.length < 3 || username.length > 30) {
    return secureErrorResponse('Username must be between 3 and 30 characters', 400);
  }

  // Username-Format-Validierung mit RegEx
  const usernamePattern = /^[a-zA-Z0-9_]+$/;
  if (!usernamePattern.test(username)) {
    return secureErrorResponse('Username may only contain letters, numbers and underscores', 400);
  }

  try {
    const db = locals.runtime.env.DB;
    
    // Prüfen auf Username-Kollision, aber nur wenn sich der Username geändert hat
    if (username !== locals.user.username) {
      const existingUser = await db.prepare('SELECT id FROM users WHERE username = ? AND id != ?')
        .bind(username, locals.user.id)
        .first();
      
      if (existingUser) {
        return secureErrorResponse('Username already taken', 409);
      }
    }
    
    // Aktualisieren des Profils
    await db.prepare('UPDATE users SET name = ?, username = ? WHERE id = ?')
      .bind(name, username, locals.user.id)
      .run();

    // Erfolgreiche Aktualisierung protokollieren
    logProfileUpdate(locals.user.id, {
      oldUsername: locals.user.username,
      newUsername: username,
      oldName: locals.user.name,
      newName: name
    });
    
    // Erfolgreiche Aktualisierung mit aktualisierten Daten zurückgeben
    return secureJsonResponse({ 
      message: 'Profile updated successfully',
      user: { 
        id: locals.user.id, 
        name, 
        username 
      }
    }, 200);
  } catch (e) {
    // Fehler protokollieren
    logApiError('/api/user/profile', e as Error, {
      userId: locals.user.id,
      action: 'profile_update'
    });
    
    console.error('Profile update error:', e);
    return secureErrorResponse('Failed to update profile', 500);
  }
}