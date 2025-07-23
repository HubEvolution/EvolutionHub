import type { APIRoute } from 'astro';

export const DELETE: APIRoute = () => {
  return new Response(null, { status: 204 });
};