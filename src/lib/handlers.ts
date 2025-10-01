import Stripe from 'stripe';
import type { KVNamespace } from '@cloudflare/workers-types';
import type { APIContext } from 'astro';

export interface Env {
  STRIPE_SECRET: string;
  STRIPE_WEBHOOK_SECRET: string;
  BASE_URL: string;
  TOOLS: KVNamespace;
  PRICING_TABLE: Record<string, string>;
}

const stripeFromEnv = (env: Env) =>
  new Stripe(env.STRIPE_SECRET, { apiVersion: '2022-11-15' } as Stripe.StripeConfig);

// Minimal context typing to avoid implicit any; Hono-like context is expected
type JsonFn = (data: unknown, init?: number | ResponseInit) => Response;
interface Ctx {
  req: Request;
  env: Env;
  json: JsonFn;
}

export async function handleStripeCheckout(c: Ctx): Promise<Response> {
  const { plan, workspaceId } = (await c.req.json()) as { plan: string; workspaceId: string };
  const session = await stripeFromEnv(c.env).checkout.sessions.create({
    mode: 'subscription',
    success_url: `${c.env.BASE_URL}/dashboard?ws=${workspaceId}`,
    cancel_url: `${c.env.BASE_URL}/pricing`,
    line_items: [{ price: c.env.PRICING_TABLE[plan], quantity: 1 }],
    metadata: { workspaceId }
  });
  return c.json({ url: session.url });
}

export async function listTools(c: Ctx | APIContext): Promise<Response> {
  // Support both our minimal Ctx (with env/json) and Astro's APIContext (with locals.runtime.env)
  const contextWithEnv = c as { env?: Env; locals?: { runtime?: { env?: Env } } };
  const env = contextWithEnv.env ?? contextWithEnv.locals?.runtime?.env;
  const tools = await env?.TOOLS?.get('manifest', 'json');
  return new Response(JSON.stringify(tools ?? null), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
