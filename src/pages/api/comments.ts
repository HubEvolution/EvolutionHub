import type { APIRoute } from 'astro';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { applySecurityHeaders } from '@/lib/security-headers';
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
export const GET: APIRoute = async (context) => {
  // Rate-Limiting anwenden
  const rateLimitResponse = await apiRateLimiter(context);
  if (rateLimitResponse) return rateLimitResponse;
  
  const { request, locals } = context;
  const { env } = locals.runtime;
  const clientAddress = context.clientAddress || '0.0.0.0';
  const endpoint = context.url ? context.url.pathname : '/api/comments';
  
  const url = new URL(request.url);
  const postId = url.searchParams.get('postId');

  // Validierung der Parameter
  if (!postId) {
    const response = new Response(JSON.stringify({ error: 'postId is required' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Security-Headers anwenden
    const securedResponse = applySecurityHeaders(response);
    
    // Fehler protokollieren
    logAuthFailure(clientAddress, {
      reason: 'invalid_request',
      endpoint,
      details: 'Missing postId parameter'
    });
    
    return securedResponse;
  }
  
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM comments WHERE postId = ?1 AND approved = 1'
    )
      .bind(postId)
      .all();
    
    // Erfolgreiche Antwort erstellen
    const response = new Response(JSON.stringify(results), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Security-Headers anwenden
    const securedResponse = applySecurityHeaders(response);
    
    // API-Zugriff protokollieren
    logApiAccess(clientAddress, clientAddress, {
      endpoint,
      method: 'GET',
      action: 'get_comments',
      postId,
      commentCount: results.length
    });
    
    return securedResponse;
  } catch (error) {
    console.error(`Error fetching comments for postId ${postId}:`, error);
    
    // Fehlerantwort erstellen
    const response = new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Security-Headers anwenden
    const securedResponse = applySecurityHeaders(response);
    
    // Serverfehler protokollieren
    logAuthFailure(clientAddress, {
      reason: 'server_error',
      endpoint,
      details: error instanceof Error ? error.message : String(error)
    });
    
    return securedResponse;
  }
};

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
export const POST: APIRoute = async (context) => {
  // Rate-Limiting anwenden
  const rateLimitResponse = await apiRateLimiter(context);
  if (rateLimitResponse) return rateLimitResponse;
  
  const { request, locals } = context;
  const { env } = locals.runtime;
  const clientAddress = context.clientAddress || '0.0.0.0';
  const endpoint = context.url ? context.url.pathname : '/api/comments';
  
  try {
    const { postId, author, content } = await request.json<{
      postId: string;
      author: string;
      content: string;
    }>();

    // Validierung der Eingabedaten
    if (!postId || !author || !content) {
      const response = new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Security-Headers anwenden
      const securedResponse = applySecurityHeaders(response);
      
      // Fehler protokollieren
      logAuthFailure(clientAddress, {
        reason: 'invalid_request',
        endpoint,
        details: 'Missing required fields in comment creation'
      });
      
      return securedResponse;
    }
    
    // Zusätzliche Validierung: Länge der Eingaben begrenzen
    if (author.length > 100 || content.length > 2000) {
      const response = new Response(JSON.stringify({ error: 'Input exceeds maximum length' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Security-Headers anwenden
      const securedResponse = applySecurityHeaders(response);
      
      // Fehler protokollieren
      logAuthFailure(clientAddress, {
        reason: 'invalid_request',
        endpoint,
        details: 'Input exceeds maximum length'
      });
      
      return securedResponse;
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

    // Erfolgreiche Antwort erstellen
    const response = new Response(JSON.stringify(newComment), { 
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Security-Headers anwenden
    const securedResponse = applySecurityHeaders(response);
    
    // API-Zugriff protokollieren
    logApiAccess(clientAddress, clientAddress, {
      endpoint,
      method: 'POST',
      action: 'create_comment',
      postId,
      commentId: newComment.id
    });
    
    return securedResponse;
  } catch (error) {
    console.error('Error creating comment:', error);
    
    // Fehlerantwort erstellen
    const response = new Response(JSON.stringify({ error: 'Invalid request body' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Security-Headers anwenden
    const securedResponse = applySecurityHeaders(response);
    
    // Fehler protokollieren
    logAuthFailure(clientAddress, {
      reason: 'invalid_request',
      endpoint,
      details: 'Invalid request body format'
    });
    
    return securedResponse;
  }
};
