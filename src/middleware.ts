import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async ({ locals, cookies }, next) => {
  const sessionId = cookies.get('session_id')?.value;

  if (sessionId) {
    try {
      const db = locals.runtime.env.DB;
      const sessionTableName = 'sessions';
      const userTableName = 'users';

      // 1. Find the session in the database
      const session = await db.prepare(`SELECT * FROM ${sessionTableName} WHERE id = ?`).bind(sessionId).first();

      if (session && new Date(session.expires_at) > new Date()) {
        // 2. If session is valid, fetch the user
        const user = await db.prepare(`SELECT * FROM ${userTableName} WHERE id = ?`).bind(session.user_id).first();
        if (user) {
          locals.user = user;
        }
      } else if (session) {
        // Clean up expired session
        await db.prepare(`DELETE FROM ${sessionTableName} WHERE id = ?`).bind(sessionId).run();
        cookies.delete('session_id', { path: '/' });
      }
    } catch (error) {
      console.error('Middleware error:', error);
      // In case of DB error, ensure user is not set
      locals.user = undefined;
    }
  }

  return next();
});