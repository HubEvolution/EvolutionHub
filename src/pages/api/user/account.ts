import type { APIRoute } from 'astro';
import { withAuthApiMiddleware, createApiError, createApiSuccess } from '@/lib/api-middleware';
import { logUserEvent } from '@/lib/security-logger';

/**
 * DELETE /api/user/account
 * Löscht das Benutzerkonto und alle zugehörigen Daten
 * 
 * Führt folgende Aktionen aus:
 * - Löscht alle Benutzer-Sessions für eine sichere Abmeldung
 * - Löscht alle Aktivitäten, Kommentare und Projekte des Benutzers
 * - Entfernt persönliche Daten aus dem Benutzerkonto
 * - Markiert das Konto als gelöscht, anstatt es vollständig zu entfernen
 *
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 */
export const DELETE = withAuthApiMiddleware(async (context) => {
  const { locals, clientAddress, request } = context;
  const { env } = locals.runtime;
  const user = locals.user;
  const db = env.DB;
  
  // Optional: Bestätigung einfordern und validieren
  let confirmDelete = false;
  try {
    const data = await request.json().catch(() => ({}));
    confirmDelete = !!data.confirm;
  } catch (error) {
    // JSON parsing error ignorieren, confirmDelete bleibt false
  }
  
  if (!confirmDelete) {
    logUserEvent(user.id, 'account_deletion_aborted', {
      reason: 'confirmation_missing',
      ipAddress: clientAddress
    });
    return createApiError('validation_error', 'Confirmation required to delete account');
  }
  
  try {
    // Transaktion starten für atomare Operationen
    // Hinweis: D1 unterstützt derzeit keine echten Transaktionen, wir verwenden batch als Alternative
    const statements = [];
    
    // 1. Alle Sessions des Benutzers löschen (Abmeldung auf allen Geräten)
    statements.push(
      db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id)
    );
    
    // 2. Alle Aktivitäten des Benutzers löschen
    statements.push(
      db.prepare('DELETE FROM activities WHERE user_id = ?').bind(user.id)
    );
    
    // 3. Alle Kommentare des Benutzers anonymisieren
    statements.push(
      db.prepare('UPDATE comments SET content = ?, author_name = ? WHERE user_id = ?').bind("[Deleted comment]", "[Deleted user]", user.id)
    );
    
    // 4. Alle Projekte des Benutzers markieren oder löschen
    statements.push(
      db.prepare('UPDATE projects SET title = ?, description = "" WHERE user_id = ?').bind("[Deleted project]", user.id)
    );
    
    // 5. Benutzer anonymisieren statt löschen (DSGVO-konform, ermöglicht Datenanalyse)
    const anonymizedEmail = `deleted-${user.id.slice(0, 8)}@example.com`;
    statements.push(
      db.prepare(`UPDATE users SET 
        email = ?, 
        name = "[Deleted User]", 
        username = "deleted_user_${user.id.slice(0, 8)}", 
        password_hash = "", 
        avatar = "", 
        is_deleted = 1, 
        deleted_at = ?
        WHERE id = ?`
      ).bind(anonymizedEmail, new Date().toISOString(), user.id)
    );
    
    // Alle Operationen als Batch ausführen
    await db.batch(statements);
    
    // Erfolgreiche Kontolöschung protokollieren
    logUserEvent(user.id, 'account_deletion_successful', {
      ipAddress: clientAddress,
      timestamp: new Date().toISOString()
    });
    
    // 204 No Content zurückgeben
    return new Response(null, { status: 204 });
  } catch (error) {
    // Error wird von der Middleware geloggt und behandelt
    console.error(`Error deleting account for user ${user.id}:`, error);
    throw error; // Error weitergeben, damit die Middleware ihn behandeln kann
  }
}, {
  // Zusätzliche Logging-Metadaten
  logMetadata: { action: 'account_deletion_requested' },
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    const { locals, clientAddress } = context;
    const user = locals?.user; // Optional chaining for safety
    
    if (user) {
      logUserEvent(user.id, 'account_deletion_error', {
        error: error instanceof Error ? error.message : String(error),
        ipAddress: clientAddress
      });
    }
    
    return createApiError('server_error', 'An error occurred during account deletion');
  }
});