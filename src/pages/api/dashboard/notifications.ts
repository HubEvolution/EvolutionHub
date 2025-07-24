import type { APIContext } from 'astro';
import type { Notification } from '../../../types/dashboard';

export async function GET(context: APIContext): Promise<Response> {
  const locals = context.locals as any;
  if (!locals.user) {
    return new Response(null, { status: 401 });
  }

  try {
    const db = locals.runtime.env.DB;
    const stmt = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').bind(locals.user.id);
    const { results } = await stmt.all();

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (e) {
    console.error(e);
    return new Response('An unknown error occurred', { status: 500 });
  }
}