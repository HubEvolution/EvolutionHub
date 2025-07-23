import type { APIRoute } from 'astro';
import { handleStripeCheckout } from '../../../lib/handlers.ts';

export const POST: APIRoute = async (context) => {
  return handleStripeCheckout(context);
};