import type { APIRoute } from 'astro';

export const PUT: APIRoute = () => {
  return new Response(JSON.stringify({ message: 'Settings updated successfully' }), { status: 200 });
};