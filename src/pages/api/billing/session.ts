import { withAuthApiMiddleware } from '@/lib/api-middleware';
import Stripe from 'stripe';
import { logUserEvent } from '@/lib/security-logger';

/**
 * POST /api/billing/session
 * Erstellt eine neue Stripe Checkout Session
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 */
export const POST = withAuthApiMiddleware(async (context) => {
  const { clientAddress, locals } = context;
  const user = locals.user;
  
  // Benutzeraktion protokollieren (user kann null sein → anonym loggen)
  const uid = user?.id ?? 'anonymous';
  logUserEvent(uid, 'checkout_session_created', {
    ipAddress: clientAddress
  });
  // Stripe-Checkout mit Astro APIContext
  const env: any = locals?.runtime?.env ?? {};

  // BASE_URL aus Env oder aus Request ableiten (Fallback)
  const requestUrl = new URL(context.request.url);
  const baseUrl: string = env.BASE_URL || `${requestUrl.protocol}//${requestUrl.host}`;

  // PRICING_TABLE kann als JSON-String oder Objekt hinterlegt sein
  let pricingTable: Record<string, string> = {};
  try {
    const pt = env.PRICING_TABLE;
    pricingTable = typeof pt === 'string' ? JSON.parse(pt) : (pt || {});
  } catch {
    pricingTable = {};
  }

  // PRICING_TABLE_ANNUAL kann als JSON-String oder Objekt hinterlegt sein
  let pricingTableAnnual: Record<string, string> = {};
  try {
    const pt = env.PRICING_TABLE_ANNUAL;
    pricingTableAnnual = typeof pt === 'string' ? JSON.parse(pt) : (pt || {});
  } catch {
    pricingTableAnnual = {};
  }

  const body = (await context.request.json().catch(() => null)) as { plan?: 'pro' | 'premium' | 'enterprise'; workspaceId?: string; interval?: 'monthly' | 'annual' } | null;
  if (!body || !body.plan || !body.workspaceId) {
    return new Response(JSON.stringify({ error: 'plan and workspaceId are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const interval = body.interval || 'monthly';
  const priceId = interval === 'annual' ? pricingTableAnnual[body.plan] : pricingTable[body.plan];
  if (!priceId) {
    return new Response(JSON.stringify({ error: 'Unknown plan' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!env.STRIPE_SECRET) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  // Do not pin apiVersion here to avoid TS literal mismatches; use package default
  const stripe = new Stripe(env.STRIPE_SECRET);
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    success_url: `${baseUrl}/api/billing/sync?session_id={CHECKOUT_SESSION_ID}&ws=${encodeURIComponent(body.workspaceId)}`,
    cancel_url: `${baseUrl}/pricing`,
    allow_promotion_codes: true,
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user!.email,
    client_reference_id: user!.id,
    metadata: { workspaceId: body.workspaceId, userId: user!.id, plan: body.plan }
  });

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}, {
  // Zusätzliche Logging-Metadaten
  logMetadata: { action: 'create_checkout_session' },
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    const { clientAddress, locals } = context;
    const user = locals.user;
    
    // Fehler protokollieren
    logUserEvent(user?.id ?? 'anonymous', 'checkout_error', {
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