import type { APIContext } from 'astro';
import { hash } from 'bcrypt-ts';

export async function POST(context: APIContext): Promise<Response> {
  const formData = await context.request.formData();
  const token = formData.get('token');
  const password = formData.get('password');

  if (typeof token !== 'string' || typeof password !== 'string' || password.length < 6) {
    const location = token ? `/reset-password?token=${token}&error=InvalidInput` : '/login?error=InvalidToken';
    return new Response(null, {
      status: 302,
      headers: { Location: location }
    });
  }

  try {
    const db = context.locals.runtime.env.DB;
    const tokenResult = await db.prepare('SELECT * FROM password_reset_tokens WHERE id = ?').bind(token).first();

    if (!tokenResult) {
      return new Response(null, {
        status: 302,
        headers: { Location: `/reset-password?token=${token}&error=InvalidToken` }
      });
    }

    const expiresAt = new Date(Number(tokenResult.expires_at) * 1000);
    if (expiresAt.getTime() < Date.now()) {
      await db.prepare('DELETE FROM password_reset_tokens WHERE id = ?').bind(token).run();
      return new Response(null, {
        status: 302,
        headers: { Location: `/reset-password?token=${token}&error=ExpiredToken` }
      });
    }

    const hashedPassword = await hash(password, 10);
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(hashedPassword, tokenResult.user_id).run();
    await db.prepare('DELETE FROM password_reset_tokens WHERE id = ?').bind(token).run();

    return context.redirect('/auth/password-reset-success', 302);
  } catch (e) {
    console.error(e);
    return new Response(null, {
      status: 302,
      headers: { Location: `/reset-password?token=${token}&error=UnknownError` }
    });
  }
}