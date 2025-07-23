import type { APIContext } from 'astro';

export async function POST({ locals, cookies }: APIContext) {
  const sessionId = cookies.get('session_id')?.value;

  if (!sessionId) {
    return new Response(JSON.stringify({ message: 'No session to invalidate' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = locals.runtime.env.DB;
    const sessionTableName = 'sessions';

    // Invalidate the session by deleting it from the database
    await db.prepare(`DELETE FROM ${sessionTableName} WHERE id = ?`).bind(sessionId).run();

    // Delete the session cookie
    cookies.delete('session_id', { path: '/' });

    return new Response(JSON.stringify({ message: 'Logout successful' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ message: 'An error occurred during logout' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}