import type { APIContext } from 'astro';
import { invalidateSession } from '../../../lib/auth-v2';

export async function POST(context: APIContext): Promise<Response> {
  const sessionId = context.cookies.get('session_id')?.value ?? null;
  if (!sessionId) {
    return new Response(null, { status: 401 });
  }

  await invalidateSession(context.locals.runtime.env.DB, sessionId);

  context.cookies.delete('session_id', { path: '/' });

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/login'
    }
  });
}