import { withAuthApiMiddleware } from '@/lib/api-middleware';
import Stripe from 'stripe';
import { logUserEvent } from '@/lib/security-logger';

/**
 * POST /api/billing/credits
 * Creates a Stripe Checkout Session for one-time credit packs (200 / 1000 images)
 * Body: { pack: 200 | 1000, workspaceId?: string }
 */
export const POST = withAuthApiMiddleware(async (context) => {
  const { locals, clientAddress } = context;
  const user = locals.user;

  // Parse body
  const body = (await context.request.json().catch(() => null)) as { pack?: number; workspaceId?: string } | null;
  if (!body || (body.pack !== 200 && body.pack !== 1000)) {
    return new Response(JSON.stringify({ error: 'invalid_pack' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const env: any = locals?.runtime?.env ?? {};
  if (!env.STRIPE_SECRET) {
    return new Response(JSON.stringify({ error: 'stripe_not_configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Map pack -> price id via env
  let table: Record<string, string> = {};
  try {
    const raw = env.CREDITS_PRICING_TABLE;
    table = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
  } catch {
    table = {};
  }
  const priceId = table[String(body.pack)];
  if (!priceId) {
    return new Response(JSON.stringify({ error: 'pack_not_configured' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const requestUrl = new URL(context.request.url);
  const baseUrl: string = env.BASE_URL || `${requestUrl.protocol}//${requestUrl.host}`;

  // Audit log
  logUserEvent(user?.id ?? 'anonymous', 'credits_checkout_session_created', {
    ipAddress: clientAddress,
    pack: String(body.pack)
  });

  const stripe = new Stripe(env.STRIPE_SECRET);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: `${baseUrl}/dashboard?ws=${body.workspaceId || 'default'}&credits=1`,
    cancel_url: `${baseUrl}/pricing`,
    allow_promotion_codes: false,
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user!.email,
    client_reference_id: user!.id,
    metadata: { purpose: 'credits', userId: user!.id, pack: String(body.pack) }
  });

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});
