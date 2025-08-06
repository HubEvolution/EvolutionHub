import type { APIRoute } from 'astro';
import { withAuthApiMiddleware } from '@/lib/api-middleware';
import { handleStripeCheckout } from '../../../lib/handlers.ts';
import { logUserEvent } from '@/lib/security-logger';

/**
 * POST /api/billing/session
 * Erstellt eine neue Stripe Checkout Session
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 */
export const POST = withAuthApiMiddleware(async (context) => {
  const { clientAddress, locals } = context;
  const user = locals.user;
  
  // Benutzeraktion protokollieren
  logUserEvent(user.id, 'checkout_session_created', {
    ipAddress: clientAddress
  });
  
  return handleStripeCheckout(context);
}, {
  // Zusätzliche Logging-Metadaten
  logMetadata: { action: 'create_checkout_session' },
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    const { clientAddress, locals } = context;
    const user = locals.user;
    
    // Fehler protokollieren
    logUserEvent(user.id, 'checkout_error', {
      error: error instanceof Error ? error.message : String(error),
      ipAddress: clientAddress
    });
    
    return new Response(JSON.stringify({ error: 'An error occurred during checkout' }), { 
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
});