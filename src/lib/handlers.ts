import Stripe from 'stripe';

export interface Env {
  STRIPE_SECRET: string;
  STRIPE_WEBHOOK_SECRET: string;
  BASE_URL: string;
  TOOLS: KVNamespace;
  PRICING_TABLE: Record<string, string>;
}

const stripeFromEnv = (env: Env) =>
  new Stripe(env.STRIPE_SECRET, { apiVersion: '2022-11-15' });

export async function handleStripeCheckout(c) {
  const { plan, workspaceId } = await c.req.json();
  const session = await stripeFromEnv(c.env).checkout.sessions.create({
    mode: 'subscription',
    success_url: `${c.env.BASE_URL}/dashboard?ws=${workspaceId}`,
    cancel_url: `${c.env.BASE_URL}/pricing`,
    line_items: [{ price: c.env.PRICING_TABLE[plan], quantity: 1 }],
    metadata: { workspaceId }
  });
  return c.json({ url: session.url });
}

export async function listTools(c) {
  const tools = await c.env.TOOLS.get('manifest', 'json');
  return c.json(tools);
}
