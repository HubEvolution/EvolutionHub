import type { APIContext } from 'astro';
import { withAuthApiMiddleware, createApiSuccess, createApiError } from '@/lib/api-middleware';
import { logUserEvent } from '@/lib/security-logger';

/**
 * POST /api/user/avatar
 * Lädt ein neues Profilbild hoch und speichert es in R2 Storage
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 */
export const POST = withAuthApiMiddleware(async (context: APIContext) => {
  const { locals, clientAddress } = context;
  const user = locals.user;

  const formData = await context.request.formData();
  const avatarFile = formData.get('avatar');

  if (!(avatarFile instanceof File)) {
    return createApiError('validation_error', 'No file uploaded');
  }

  const bucket = locals.runtime.env.R2_AVATARS;
  const db = locals.runtime.env.DB;
  
  // Generate a unique key for the file
  const fileKey = `avatars/${user.id}/${crypto.randomUUID()}-${avatarFile.name}`;

  // Upload to R2
  await bucket.put(fileKey, await avatarFile.arrayBuffer(), {
    httpMetadata: { contentType: avatarFile.type },
  });

  // Construct the public URL (assuming you have a public domain connected to your R2 bucket)
  // For now, we'll just store the key. You'll need to set up a public domain for R2 to serve images.
  const imageUrl = `/r2/${fileKey}`; // This is a placeholder URL structure

  // Update user's image URL in the database
  await db.prepare('UPDATE users SET image = ? WHERE id = ?')
    .bind(imageUrl, user.id)
    .run();
    
  // Avatar-Aktualisierung protokollieren
  logUserEvent(user.id, 'avatar_updated', {
    ipAddress: clientAddress
  });

  return createApiSuccess({ message: 'Avatar updated successfully', imageUrl });
}, {
  // Zusätzliche Logging-Metadaten
  logMetadata: { action: 'avatar_update' },
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    const { locals, clientAddress } = context;
    const user = locals.user;
    
    if (user) {
      logUserEvent(user.id, 'avatar_update_error', {
        error: error instanceof Error ? error.message : String(error),
        ipAddress: clientAddress
      });
    }
    
    return createApiError('server_error', 'An error occurred during avatar upload');
  }
});