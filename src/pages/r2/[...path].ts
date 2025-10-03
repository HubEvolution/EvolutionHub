import type { APIContext } from 'astro';

/**
 * Proxy-Route für R2-Bucket-Ressourcen
 * Ermöglicht es, R2-Objekte über /r2/[pfad] URLs abzurufen
 */
export async function GET(context: APIContext) {
  const { params, locals } = context;

  // Extrahiere den Pfad aus den URL-Parametern
  const path = params.path || '';
  console.log('R2 Proxy request for path:', path);

  try {
    // Zugriff auf R2-Bucket
    const bucket = locals.runtime?.env?.R2_AVATARS;

    if (!bucket) {
      console.error('R2_AVATARS bucket not available');
      return new Response('R2 bucket not configured', { status: 500 });
    }

    // Versuche, das Objekt aus dem Bucket zu holen
    const object = await bucket.get(path);

    if (!object) {
      console.log('Object not found in R2:', path);
      return new Response('File not found', { status: 404 });
    }

    console.log('Successfully retrieved object from R2:', path);

    // Response mit dem Dateiinhalt und korrekten Headers erstellen
    const headers = new Headers();

    // Content-Type setzen, falls verfügbar
    if (object.httpMetadata?.contentType) {
      headers.set('Content-Type', object.httpMetadata.contentType);
    }

    // Cache-Headers für bessere Performance
    headers.set('Cache-Control', 'public, max-age=31536000'); // 1 Jahr
    headers.set('ETag', object.httpEtag || '');

    // Avoid ReadableStream type mismatch by converting to ArrayBuffer
    const body = await object.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error serving R2 object:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
