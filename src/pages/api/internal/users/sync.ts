import type { APIContext } from 'astro';
import { withApiMiddleware, createApiSuccess, createApiError } from '@/lib/api-middleware';
import { logSecurityEvent, logUserEvent } from '@/lib/security-logger';
import { internalUserSyncSchema } from '@/lib/validation/schemas/users';
import { formatZodError } from '@/lib/validation';

/**
 * POST /api/internal/users/sync
 * Synchronisiert Benutzerdaten mit der internen Datenbank.
 *
 * WARNUNG: Dieser interne Endpunkt sollte nur von vertrauenswürdigen Systemen verwendet werden!
 *
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle Synchronisierungsaktivitäten
 */
export const POST = withApiMiddleware(
  async (context: APIContext) => {
    const { request, locals, clientAddress } = context;
    const { env } = locals.runtime;

    const unknownBody: unknown = await request.json().catch(() => null);
    const parsed = internalUserSyncSchema.safeParse(unknownBody);
    if (!parsed.success) {
      // Fehlerhafte Anfrage protokollieren
      logSecurityEvent('API_ERROR', {
        reason: 'invalid_sync_request',
        ipAddress: clientAddress,
        details: 'Invalid JSON body',
      });
      return createApiError('validation_error', 'Invalid JSON body', {
        details: formatZodError(parsed.error),
      });
    }

    const { id, name, email, image } = parsed.data;
    const now = new Date().toISOString();

    const stmt = env.DB.prepare(`
      INSERT INTO users (id, name, email, image, created_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6)
      ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          email = excluded.email,
          image = excluded.image,
          updated_at = excluded.updated_at
  `);

    await stmt.bind(id, name, email, image, now, now).run();

    // Synchronisierung protokollieren
    logUserEvent(id, 'user_synced', {
      email,
      ipAddress: clientAddress,
    });

    return createApiSuccess({ message: 'User synced successfully', userId: id });
  },
  {
    // Keine Authentifizierung erforderlich für interne Synchronisierung
    // In Produktionsumgebung sollte hier ein API-Key oder andere Authentifizierung verwendet werden
    requireAuth: false,

    // Spezielle Fehlerbehandlung für diesen Endpunkt
    onError: (context: APIContext, error: unknown) => {
      const { clientAddress } = context;

      // Serverfehler protokollieren
      logSecurityEvent('API_ERROR', {
        reason: 'user_sync_error',
        error: error instanceof Error ? error.message : String(error),
        ipAddress: clientAddress,
      });

      return createApiError('server_error', 'Failed to sync user');
    },

    // Zusätzliche Logging-Metadaten
    logMetadata: { action: 'internal_user_sync' },
  }
);
