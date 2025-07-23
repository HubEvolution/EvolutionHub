import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  const { env, user } = locals.runtime;

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  
  const userId = user.sub;

  try {
    const userResult = await env.DB_AUTH.prepare('SELECT id, name, email, image FROM users WHERE id = ?1')
      .bind(userId)
      .first();

    if (!userResult) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }
    return new Response(JSON.stringify(userResult), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};