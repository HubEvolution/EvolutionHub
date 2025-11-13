import type { APIContext } from 'astro';
import {
  withAuthApiMiddleware,
  withApiMiddleware,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { formatZodError } from '@/lib/validation';
import { billingCreditsRequestSchema } from '@/lib/validation';
import Stripe from 'stripe';
import { logUserEvent } from '@/lib/security-logger';
import { sanitizeReturnTo } from '@/utils/sanitizeReturnTo';

/**
 * POST /api/billing/credits
 * Creates a Stripe Checkout Session for one-time credit packs (200 / 1000 images)
 * Body: { pack: 200 | 1000, workspaceId?: string }
 */
export const POST = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { locals, clientAddress } = context;
    const user = locals.user;

    // Parse body
    const unknownBody: unknown = await context.request.json().catch(() => null);
    const parsed = billingCreditsRequestSchema.safeParse(unknownBody);
    if (!parsed.success) {
      return createApiError('validation_error', 'Invalid JSON body', {
        details: formatZodError(parsed.error),
      });
    }
    const body = parsed.data;

    const rawEnv = (locals?.runtime?.env ?? {}) as Record<string, unknown>;
    const stripeSecret =
      typeof rawEnv.STRIPE_SECRET === 'string' ? (rawEnv.STRIPE_SECRET as string) : '';
    if (!stripeSecret) {
      return createApiError('server_error', 'stripe_not_configured');
    }

    // Map pack -> price id via env
    let table: Record<string, string> = {};
    try {
      const raw = rawEnv.CREDITS_PRICING_TABLE as unknown;
      table =
        typeof raw === 'string'
          ? (JSON.parse(raw) as Record<string, string>)
          : (raw as Record<string, string>) || {};
    } catch {
      table = {};
    }
    const priceId = table[String(body.pack)];
    if (!priceId) {
      return createApiError('validation_error', 'pack_not_configured');
    }

    const requestUrl = new URL(context.request.url);
    const baseUrl: string =
      (typeof rawEnv.BASE_URL === 'string' ? (rawEnv.BASE_URL as string) : '') ||
      `${requestUrl.protocol}//${requestUrl.host}`;

    const safeReturnTo = sanitizeReturnTo(body.returnTo);

    // Audit log
    logUserEvent(user?.id ?? 'anonymous', 'credits_checkout_session_created', {
      ipAddress: clientAddress,
      pack: String(body.pack),
    });

    const stripe = new Stripe(stripeSecret);
    let successUrl = `${baseUrl}/dashboard?ws=${body.workspaceId || 'default'}&credits=1`;
    try {
      if (safeReturnTo) {
        const u = new URL(`${baseUrl}${safeReturnTo}`);
        u.searchParams.set('credits', '1');
        successUrl = u.toString();
      }
    } catch {
      // ignore malformed returnTo; fallback to dashboard successUrl
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: `${baseUrl}/pricing`,
      allow_promotion_codes: false,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user!.email,
      client_reference_id: user!.id,
      metadata: { purpose: 'credits', userId: user!.id, pack: String(body.pack) },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  },
  { enforceCsrfToken: true }
);

export const GET = withApiMiddleware(() => createMethodNotAllowed('POST'), {
  disableAutoLogging: true,
});
export const PUT = withApiMiddleware(() => createMethodNotAllowed('POST'), {
  disableAutoLogging: true,
});
export const PATCH = withApiMiddleware(() => createMethodNotAllowed('POST'), {
  disableAutoLogging: true,
});
export const DELETE = withApiMiddleware(() => createMethodNotAllowed('POST'), {
  disableAutoLogging: true,
});
