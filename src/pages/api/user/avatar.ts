import {
  withAuthApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { logUserEvent } from '@/lib/security-logger';
import { createRateLimiter } from '@/lib/rate-limiter';

// Rate-Limiter für Avatar-Uploads (5/Minute in Prod; erhöht in Dev für stabile Tests)
const avatarLimiter = createRateLimiter({
  maxRequests: import.meta.env.DEV ? 50 : 5,
  windowMs: 60 * 1000,
  name: 'avatarUpload',
});

/**
 * POST /api/user/avatar
 * Lädt ein neues Profilbild hoch und speichert es in R2 Storage
 * Jetzt mit einheitlicher Middleware für bessere Sicherheit und Konsistenz
 */
export const POST = withAuthApiMiddleware(
  async (context) => {
    const { locals, clientAddress, request } = context;
    const user = locals.user;

    // Benutzer ist bereits durch Middleware authentifiziert
    if (!user) {
      return createApiError('auth_error', 'Für diese Aktion ist eine Anmeldung erforderlich');
    }

    // Formdata extrahieren
    let avatarFile;
    try {
      const formData = await request.formData();
      avatarFile = formData.get('avatar');
    } catch (_formError) {
      return createApiError('validation_error', 'Fehler beim Verarbeiten der Formulardaten');
    }

    if (!avatarFile || !(avatarFile instanceof File)) {
      return createApiError('validation_error', 'Keine gültige Datei hochgeladen');
    }

    // Zugriff auf Umgebungsvariablen überprüfen
    const bucket = locals.runtime?.env?.R2_AVATARS;
    const db = locals.runtime?.env?.DB;

    if (!bucket) {
      return createApiError('server_error', 'R2_AVATARS bucket not available');
    }

    if (!db) {
      return createApiError('server_error', 'Database connection not available');
    }

    // Validierung: erlaubte Dateiendungen und Maximalgröße (5MB)
    const originalName = (avatarFile as File).name || '';
    const ext = originalName.split('.').pop()?.toLowerCase() || '';
    const allowedExt = new Set(['jpg', 'jpeg', 'png', 'webp']);
    if (!allowedExt.has(ext)) {
      return createApiError('validation_error', 'Ungültiger Dateityp');
    }
    const maxBytes = 5 * 1024 * 1024; // 5MB
    const fileSize = (avatarFile as File).size;
    if (typeof fileSize === 'number' && fileSize > maxBytes) {
      return createApiError('validation_error', 'Datei zu groß');
    }

    // Vereinfachter eindeutiger Dateiname
    const fileKey = `avatar-${user.id}-${Date.now()}.${avatarFile.name.split('.').pop()}`;

    try {
      // Upload to R2
      const fileBuffer = await avatarFile.arrayBuffer();
      await bucket.put(fileKey, fileBuffer, {
        httpMetadata: { contentType: avatarFile.type },
      });

      // Construct the public URL
      const imageUrl = `/r2/${fileKey}`;

      // Update user's image URL in the database
      await db.prepare('UPDATE users SET image = ? WHERE id = ?').bind(imageUrl, user.id).run();

      // Avatar-Aktualisierung protokollieren
      logUserEvent(user.id, 'avatar_updated', {
        ipAddress: clientAddress,
        imageUrl: imageUrl,
      });

      return createApiSuccess({
        message: 'Avatar erfolgreich aktualisiert',
        // Für Kompatibilität beide Keys anbieten
        avatarUrl: imageUrl,
        imageUrl,
      });
    } catch (uploadError) {
      const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError);

      // Fehler protokollieren
      logUserEvent(user.id, 'avatar_update_error', {
        error: errorMessage,
        ipAddress: clientAddress,
      });

      return createApiError('server_error', `Fehler beim Hochladen: ${errorMessage}`);
    }
  },
  {
    rateLimiter: avatarLimiter,
    enforceCsrfToken: true, // Avatar-Uploads benötigen CSRF-Schutz
    logMetadata: { action: 'avatar_upload' },
    onUnauthorized: () =>
      createApiError('auth_error', 'Für diese Aktion ist eine Anmeldung erforderlich'),
  }
);

// Für nicht unterstützte Methoden explizit 405 zurückgeben
export const GET = () => createMethodNotAllowed('POST');
