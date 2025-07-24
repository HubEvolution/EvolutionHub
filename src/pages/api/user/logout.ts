import type { APIContext } from 'astro';
import { invalidateSession } from '../../../lib/auth-v2';

async function handleLogout(context: APIContext): Promise<Response> {
  const sessionId = context.cookies.get('session_id')?.value ?? null;
  
  if (sessionId) {
    await invalidateSession(context.locals.runtime.env.DB, sessionId);
    context.cookies.delete('session_id', { path: '/' });
  }

  // Redirect to the homepage regardless of whether a session existed
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/'
    }
  });
}

export const POST = handleLogout;
export const GET = handleLogout;