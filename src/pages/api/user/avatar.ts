import type { APIContext } from 'astro';
import { logUserEvent } from '@/lib/security-logger';
import { applySecurityHeaders } from '@/lib/security-headers';

// Direktes Response-Erstellen ohne Middleware
function createSuccessResponse(data: any) {
  // Extrahiere imageUrl direkt in die Hauptebene der Response für Frontend-Kompatibilität
  const responseData = {
    success: true,
    ...data // Spreize die Eigenschaften direkt in die Hauptebene
  };
  
  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

function createErrorResponse(message: string, status = 500) {
  return new Response(JSON.stringify({
    success: false,
    error: {
      type: 'server_error',
      message
    }
  }), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

/**
 * POST /api/user/avatar
 * Lädt ein neues Profilbild hoch und speichert es in R2 Storage
 * Direkte Implementierung ohne komplexe Middleware
 */
export async function POST(context: APIContext) {
  console.log('AVATAR ENDPOINT CALLED DIRECTLY');
  try {
    const { locals, clientAddress } = context;
    const user = locals.user;
    
    // Prüfen, ob Benutzer authentifiziert ist
    if (!user) {
      console.log('User not authenticated');
      return applySecurityHeaders(createErrorResponse('Für diese Aktion ist eine Anmeldung erforderlich', 401));
    }
    
    // CORS-Header setzen
    if (context.request.method === 'OPTIONS') {
      return applySecurityHeaders(createSuccessResponse({ message: 'CORS preflight response' }));
    }
    
    console.log('Avatar upload request received for user:', user.id);

    // Debug request
    console.log('Request headers:', Object.fromEntries(context.request.headers.entries()));

    // Formdata extrahieren
    let avatarFile;
    try {
      const formData = await context.request.formData();
      console.log('FormData keys:', [...formData.keys()]);
      avatarFile = formData.get('avatar');
      console.log('Avatar file received:', avatarFile ? 'yes' : 'no', 
                avatarFile instanceof File ? 'is File object' : 'not a File object');
    } catch (formError) {
      console.error('Error parsing form data:', formError);
      return applySecurityHeaders(createErrorResponse(`Could not parse form data: ${formError.message}`, 400));
    }

    if (!avatarFile) {
      return applySecurityHeaders(createErrorResponse('No file uploaded', 400));
    }

    if (!(avatarFile instanceof File)) {
      return applySecurityHeaders(createErrorResponse(`Uploaded content is not a valid file: ${typeof avatarFile}`, 400));
    }

    console.log('File details:', {
      name: avatarFile.name,
      type: avatarFile.type,
      size: avatarFile.size
    });

    // Zugriff auf Umgebungsvariablen überprüfen
    const bucket = locals.runtime?.env?.R2_AVATARS;
    const db = locals.runtime?.env?.DB;
    
    console.log('Environment check:', { 
      hasBucket: !!bucket, 
      hasDB: !!db,
      runtimeEnv: Object.keys(locals.runtime?.env || {}).join(', ')
    });
    
    if (!bucket) {
      return applySecurityHeaders(createErrorResponse('R2_AVATARS bucket not available'));
    }
    
    if (!db) {
      return applySecurityHeaders(createErrorResponse('Database connection not available'));
    }
  
    // Vereinfachter eindeutiger Dateiname
    const fileKey = `avatar-${user.id}-${Date.now()}.${avatarFile.name.split('.').pop()}`;
    console.log('Generated file key:', fileKey);

    // R2 Upload und DB Update
    try {
      // Upload to R2
      console.log('Preparing file for R2 upload...');
      const fileBuffer = await avatarFile.arrayBuffer();
      console.log('File converted to ArrayBuffer, size:', fileBuffer.byteLength);
      
      console.log('Uploading to R2...');
      const uploadResult = await bucket.put(fileKey, fileBuffer, {
        httpMetadata: { contentType: avatarFile.type },
      });
      console.log('Upload to R2 completed, result:', uploadResult);
  
      // Construct the public URL 
      const imageUrl = `/r2/${fileKey}`;
      console.log('Image URL:', imageUrl);
  
      // Update user's image URL in the database
      console.log('Updating database...');
      const result = await db.prepare('UPDATE users SET image = ? WHERE id = ?')
        .bind(imageUrl, user.id)
        .run();
      console.log('Database updated successfully, result:', result);
      
      // Avatar-Aktualisierung protokollieren
      try {
        logUserEvent(user.id, 'avatar_updated', {
          ipAddress: clientAddress,
          imageUrl: imageUrl
        });
      } catch (logError) {
        console.warn('Error logging user event:', logError);
        // Protokollierungsfehler nicht nach außen weitergeben
      }
      
      console.log('Avatar update completed successfully');
      return applySecurityHeaders(createSuccessResponse({ message: 'Avatar updated successfully', imageUrl }));
      
    } catch (uploadError) {
      console.error('Error during upload or DB update:', uploadError);
      const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError);
      return applySecurityHeaders(createErrorResponse(`Error during file processing: ${errorMessage}`));
    }
    
  } catch (error) {
    console.error('Uncaught error in avatar upload:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Manuelles Fehlerhandling innerhalb der Hauptfunktion
    if (context.locals?.user) {
      try {
        logUserEvent(context.locals.user.id, 'avatar_update_error', {
          error: errorMessage,
          ipAddress: context.clientAddress || 'unknown'
        });
      } catch (logError) {
        console.error('Error logging user event:', logError);
      }
    }
    
    // Immer eine Response zurückgeben, auch im Fehlerfall
    return applySecurityHeaders(createErrorResponse(`Avatar upload failed: ${errorMessage}`));
  }
}