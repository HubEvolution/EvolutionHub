import type { APIRoute } from 'astro';
import { withApiMiddleware, createApiSuccess, createApiError } from '@/lib/api-middleware';
import { logApiAccess, logAuthFailure } from '@/lib/security-logger';

/**
 * GET /api/comments
 * Ruft Kommentare für einen bestimmten Post ab.
 * 
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Fehler
 */
export const GET = withApiMiddleware(async (context) => {
  const { request, locals, clientAddress, url } = context;
  const { env } = locals.runtime;
  const endpoint = url ? url.pathname : '/api/comments';
  
  const requestUrl = new URL(request.url);
  const postId = requestUrl.searchParams.get('postId');

  // Validierung der Parameter
  if (!postId) {
    // Fehler protokollieren
    logAuthFailure(clientAddress, {
      reason: 'invalid_request',
      endpoint,
      details: 'Missing postId parameter'
    });
    
    return createApiError('postId is required', 400);
  }
  
  const { results } = await env.DB.prepare(
    'SELECT * FROM comments WHERE postId = ?1 AND approved = 1'
  )
    .bind(postId)
    .all();
  
  // API-Zugriff protokollieren
  logApiAccess(clientAddress, clientAddress, {
    endpoint,
    method: 'GET',
    action: 'get_comments',
    postId,
    commentCount: results.length
  });
  
  return createApiSuccess(results);
}, {
  // Keine Authentifizierung erforderlich für öffentliche Kommentare
  requireAuth: false,
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    const { clientAddress, url } = context;
    const endpoint = url ? url.pathname : '/api/comments';
    const requestUrl = new URL(context.request.url);
    const postId = requestUrl.searchParams.get('postId');
    
    console.error(`Error fetching comments for postId ${postId}:`, error);
    
    // Serverfehler protokollieren
    logAuthFailure(clientAddress, {
      reason: 'server_error',
      endpoint,
      details: error instanceof Error ? error.message : String(error)
    });
    
    return createApiError('Internal Server Error', 500);
  }
});

/**
 * POST /api/comments
 * Erstellt einen neuen Kommentar für einen Post.
 * 
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle API-Zugriffe und Fehler
 * - Input-Validierung: Prüft und bereinigt Eingabedaten
 */
export const POST = withApiMiddleware(async (context) => {
  const { request, locals, clientAddress, url } = context;
  const { env } = locals.runtime;
  const endpoint = url ? url.pathname : '/api/comments';
  
  const { postId, author, content } = await request.json<{
    postId: string;
    author: string;
    content: string;
  }>();

  // Validierung der Eingabedaten
  if (!postId || !author || !content) {
    // Fehler protokollieren
    logAuthFailure(clientAddress, {
      reason: 'invalid_request',
      endpoint,
      details: 'Missing required fields in comment creation'
    });
    
    return createApiError('Missing required fields', 400);
  }
  
  // Zusätzliche Validierung: Länge der Eingaben begrenzen
  if (author.length > 100 || content.length > 2000) {
    // Fehler protokollieren
    logAuthFailure(clientAddress, {
      reason: 'invalid_request',
      endpoint,
      details: 'Input exceeds maximum length'
    });
    
    return createApiError('Input exceeds maximum length', 400);
  }

  const newComment = {
    id: crypto.randomUUID(),
    postId,
    author,
    content,
    createdAt: new Date().toISOString(),
    approved: false, // Default to not approved
  };

  await env.DB.prepare(
    'INSERT INTO comments (id, postId, author, content, createdAt, approved) VALUES (?1, ?2, ?3, ?4, ?5, 0)'
  )
    .bind(
      newComment.id,
      newComment.postId,
      newComment.author,
      newComment.content,
      newComment.createdAt
    )
    .run();

  // API-Zugriff protokollieren
  logApiAccess(clientAddress, clientAddress, {
    endpoint,
    method: 'POST',
    action: 'create_comment',
    postId,
    commentId: newComment.id
  });
  
  return new Response(JSON.stringify(newComment), { 
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}, {
  // Keine Authentifizierung erforderlich für öffentliche Kommentare
  requireAuth: false,
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    const { clientAddress, url } = context;
    const endpoint = url ? url.pathname : '/api/comments';
    
    console.error('Error creating comment:', error);
    
    // Fehler protokollieren
    logAuthFailure(clientAddress, {
      reason: 'invalid_request',
      endpoint,
      details: 'Invalid request body format'
    });
    
    return createApiError('Invalid request body', 400);
  }
});
