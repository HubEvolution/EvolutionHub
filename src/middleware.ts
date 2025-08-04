import { defineMiddleware } from 'astro:middleware';
import { validateSession } from '@/lib/auth-v2';

export const onRequest = defineMiddleware(async (context, next) => {
  // Detaillierte Request-Logging
  console.log('[Middleware] Incoming request:', {
    url: context.request.url,
    method: context.request.method,
    headers: Object.fromEntries(context.request.headers.entries()),
  });

  // Authentifizierung
  if (!context.locals.runtime) {
    console.log('[Middleware] No runtime context available');
    context.locals.user = null;
    context.locals.session = null;
    return next();
  }
  
  const sessionId = context.cookies.get('session_id')?.value ?? null;
  console.log('[Middleware] Session ID from cookie:', sessionId ? 'Present' : 'Not present');

  if (!sessionId) {
    context.locals.user = null;
    context.locals.session = null;
    return next();
  }

  try {
    const { session, user } = await validateSession(context.locals.runtime.env.DB, sessionId);
    console.log('[Middleware] Session validation result:', {
      sessionValid: !!session,
      userValid: !!user,
    });

    context.locals.session = session;
    context.locals.user = user;
  } catch (error) {
    console.error('[Middleware] Error during session validation:', error);
    context.locals.session = null;
    context.locals.user = null;
  }
  
  // Führe den nächsten Middleware-Schritt aus
  const response = await next();
  
  // Detaillierte Response-Logging
  console.log('[Middleware] Outgoing response:', {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
  });
  
  // MIME-Typ-Korrektur für Assets
  const url = new URL(context.request.url);
  const path = url.pathname;
  
  console.log('[Middleware] Processing path:', path);
  
  // Setze MIME-Typen für verschiedene Dateitypen
  if (path.endsWith('.css')) { // Geänderte Bedingung: Alle .css-Dateien berücksichtigen
    response.headers.set('Content-Type', 'text/css');
    console.log('[Middleware] Set Content-Type to text/css for CSS file');
  } else if (path.endsWith('.js')) {
    response.headers.set('Content-Type', 'application/javascript');
    console.log('[Middleware] Set Content-Type to application/javascript for JS file');
  } else if (path.endsWith('.svg')) {
    response.headers.set('Content-Type', 'image/svg+xml');
    console.log('[Middleware] Set Content-Type to image/svg+xml for SVG file');
  }
  
  return response;
});