import type { APIRoute } from 'astro';
import { v4 as uuidv4 } from 'uuid';

export const POST: APIRoute = async ({ locals, cookies }) => {
  const db = locals.runtime.env.DB;
  const debugEmail = 'debug@example.com';
  const sessionTableName = 'sessions';
  const userTableName = 'users';

  try {
    // 1. Find or create the debug user
    let user = await db.prepare(`SELECT * FROM ${userTableName} WHERE email = ?`).bind(debugEmail).first();

    if (!user) {
      const newUser = {
        id: crypto.randomUUID(),
        email: debugEmail,
        name: 'Debug User',
        username: 'debuguser', // FIX: Added username
        created_at: new Date().toISOString(),
      };
      await db.prepare(`INSERT INTO ${userTableName} (id, email, name, username, created_at) VALUES (?, ?, ?, ?, ?)`).bind(newUser.id, newUser.email, newUser.name, newUser.username, newUser.created_at).run();
      user = newUser;
    }

    // 2. Create a new session for the user
    const sessionId = uuidv4();
    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.prepare(`INSERT INTO ${sessionTableName} (id, user_id, expires_at) VALUES (?, ?, ?)`).bind(sessionId, user.id, sessionExpiry.toISOString()).run();

    cookies.set('session_id', sessionId, {
      path: '/',
      expires: sessionExpiry,
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
    });

    return new Response(JSON.stringify({ success: true, message: 'Debug session created for real user.' }), {
      status: 200,
    });
  } catch (error) {
    console.error('Debug login failed:', error);
    return new Response(JSON.stringify({ success: false, message: 'Debug login failed.' }), {
      status: 500,
    });
  }
};