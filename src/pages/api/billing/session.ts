import type { APIRoute } from 'astro';
import { withApiMiddleware } from '@/lib/api-middleware';
import { handleStripeCheckout } from '../../../lib/handlers.ts';
import { logApiAccess } from '@/lib/security-logger';

/**
 * POST /api/billing/session
 * Erstellt eine neue Stripe Checkout Session
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 */
export const POST = withApiMiddleware(async (context) => {
  const { clientAddress, url, locals } = context;
  const user = locals.user;
  const endpoint = url ? url.pathname : '/api/billing/session';
  
  // API-Zugriff protokollieren
  if (user) {
    logApiAccess(user.id, clientAddress, {
      endpoint,
      method: 'POST',
      action: 'create_checkout_session'
    });
  }
  
  return handleStripeCheckout(context);
}, {
  // Erfordert Authentifizierung
  requireAuth: true,
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    console.error('Stripe checkout error:', error);
    
    return new Response(JSON.stringify({ error: 'An error occurred during checkout' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});