import type { APIContext } from 'astro';

/**
 * Proxy route for R2 AI Images bucket
 * Serves objects under /r2-ai/[...path]
 */
export async function GET(context: APIContext) {
  const { params, locals } = context;
  const path = params.path || '';

  try {
    const bucket = locals.runtime?.env?.R2_AI_IMAGES;
    if (!bucket) {
      console.error('R2_AI_IMAGES bucket not available');
      return new Response('R2 bucket not configured', { status: 500 });
    }

    const object = await bucket.get(path);
    if (!object) {
      return new Response('File not found', { status: 404 });
    }

    const headers = new Headers();
    if (object.httpMetadata?.contentType) {
      headers.set('Content-Type', object.httpMetadata.contentType);
    }
    headers.set('Cache-Control', 'public, max-age=31536000');
    headers.set('ETag', object.httpEtag || '');

    // Use ArrayBuffer to avoid ReadableStream type mismatch in different runtimes
    const buf = await object.arrayBuffer();
    return new Response(buf, { status: 200, headers });
  } catch (error) {
    console.error('Error serving R2 AI object:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
