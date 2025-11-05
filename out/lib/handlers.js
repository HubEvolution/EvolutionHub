"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStripeCheckout = handleStripeCheckout;
exports.listTools = listTools;
const stripe_1 = require("stripe");
const stripeFromEnv = (env) => new stripe_1.default(env.STRIPE_SECRET);
async function handleStripeCheckout(c) {
    const { plan, workspaceId } = (await c.req.json());
    const session = await stripeFromEnv(c.env).checkout.sessions.create({
        mode: 'subscription',
        success_url: `${c.env.BASE_URL}/dashboard?ws=${workspaceId}`,
        cancel_url: `${c.env.BASE_URL}/pricing`,
        line_items: [{ price: c.env.PRICING_TABLE[plan], quantity: 1 }],
        metadata: { workspaceId },
    });
    return c.json({ url: session.url });
}
async function listTools(c) {
    // Support both our minimal Ctx (with env/json) and Astro's APIContext (with locals.runtime.env)
    const contextWithEnv = c;
    const env = contextWithEnv.env ?? contextWithEnv.locals?.runtime?.env;
    const tools = await env?.TOOLS?.get('manifest', 'json');
    return new Response(JSON.stringify(tools ?? null), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
