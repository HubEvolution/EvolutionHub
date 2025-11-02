import type { APIContext } from 'astro';
import { withAuthApiMiddleware, createApiSuccess, createApiError } from '@/lib/api-middleware';
import Stripe from 'stripe';
import { logUserEvent } from '@/lib/security-logger';
import { sanitizeReturnTo } from '@/utils/sanitizeReturnTo';

/**
 * POST /api/billing/session
 * Erstellt eine neue Stripe Checkout Session
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 */
export const POST = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { clientAddress, locals } = context;
    const user = locals.user;

    // Benutzeraktion protokollieren (user kann null sein → anonym loggen)
    const uid = user?.id ?? 'anonymous';
    logUserEvent(uid, 'checkout_session_created', {
      ipAddress: clientAddress,
    });
    // Stripe-Checkout mit Astro APIContext
    const rawEnv = (locals?.runtime?.env ?? {}) as Record<string, unknown>;

    // BASE_URL aus Env oder aus Request ableiten (Fallback)
    const requestUrl = new URL(context.request.url);
    const baseUrl: string =
      (typeof rawEnv.BASE_URL === 'string' ? (rawEnv.BASE_URL as string) : '') ||
      `${requestUrl.protocol}//${requestUrl.host}`;

    // PRICING_TABLE kann als JSON-String oder Objekt hinterlegt sein
    let pricingTable: Record<string, string> = {};
    try {
      const pt = rawEnv.PRICING_TABLE as unknown;
      pricingTable =
        typeof pt === 'string'
          ? (JSON.parse(pt) as Record<string, string>)
          : (pt as Record<string, string>) || {};
    } catch {
      pricingTable = {};
    }

    // PRICING_TABLE_ANNUAL kann als JSON-String oder Objekt hinterlegt sein
    let pricingTableAnnual: Record<string, string> = {};
    try {
      const pt = rawEnv.PRICING_TABLE_ANNUAL as unknown;
      pricingTableAnnual =
        typeof pt === 'string'
          ? (JSON.parse(pt) as Record<string, string>)
          : (pt as Record<string, string>) || {};
    } catch {
      pricingTableAnnual = {};
    }

    const body = (await context.request.json().catch(() => null)) as {
      plan?: 'pro' | 'premium' | 'enterprise';
      workspaceId?: string;
      interval?: 'monthly' | 'annual';
      returnTo?: string;
    } | null;
    if (!body || !body.plan || !body.workspaceId) {
      return createApiError('validation_error', 'plan and workspaceId are required');
    }

    let refererPath = '';
    try {
      const ref = context.request.headers.get('referer') || '';
      if (ref) {
        const ru = new URL(ref);
        const origin = `${requestUrl.protocol}//${requestUrl.host}`;
        if (ru.origin === origin) {
          refererPath = `${ru.pathname}${ru.search}`;
        }
      }
    } catch {}
    const safeReturnTo = sanitizeReturnTo(body.returnTo) || sanitizeReturnTo(refererPath);

    const interval = body.interval || 'monthly';
    const priceId = interval === 'annual' ? pricingTableAnnual[body.plan] : pricingTable[body.plan];
    if (!priceId) {
      return createApiError('validation_error', 'Unknown plan');
    }

    const stripeSecret =
      typeof rawEnv.STRIPE_SECRET === 'string' ? (rawEnv.STRIPE_SECRET as string) : '';
    if (!stripeSecret) {
      return createApiError('server_error', 'Stripe not configured');
    }

    if (!user) {
      return createApiError('auth_error', 'Unauthorized');
    }
    // Do not pin apiVersion here to avoid TS literal mismatches; use package default
    const stripe = new Stripe(stripeSecret);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url: `${baseUrl}/api/billing/sync?session_id={CHECKOUT_SESSION_ID}&ws=${encodeURIComponent(body.workspaceId)}${safeReturnTo ? `&return_to=${encodeURIComponent(safeReturnTo)}` : ''}`,
      cancel_url: `${baseUrl}/pricing`,
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user!.email,
      client_reference_id: user!.id,
      metadata: { workspaceId: body.workspaceId, userId: user!.id, plan: body.plan },
    });

    return createApiSuccess({ url: session.url });
  },
  {
    // Zusätzliche Logging-Metadaten
    logMetadata: { action: 'create_checkout_session' },

    // Spezielle Fehlerbehandlung für diesen Endpunkt
    onError: (context: APIContext, error: unknown) => {
      const { clientAddress, locals } = context;
      const user = locals.user;

      // Fehler protokollieren
      logUserEvent(user?.id ?? 'anonymous', 'checkout_error', {
        error: error instanceof Error ? error.message : String(error),
        ipAddress: clientAddress,
      });

      return new Response(JSON.stringify({ error: 'An error occurred during checkout' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    },
  }
);
