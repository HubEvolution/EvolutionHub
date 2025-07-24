import type { APIContext } from 'astro';
import { hash } from 'bcrypt-ts';

export async function POST(context: APIContext): Promise<Response> {
  const formData = await context.request.formData();
  const token = formData.get('token');
  const password = formData.get('password');

  if (typeof token !== 'string' || typeof password !== 'string' || password.length < 6) {
    return new Response('Invalid token or password', { status: 400 });
  }

  try {
    const db = context.locals.runtime.env.DB;
    const tokenResult = await db.prepare('SELECT * FROM password_reset_tokens WHERE id = ?').bind(token).first();

    if (!tokenResult) {
      return new Response('Invalid or expired token', { status: 400 });
    }

    const expiresAt = new Date(Number(tokenResult.expires_at) * 1000);
    if (expiresAt.getTime() < Date.now()) {
      await db.prepare('DELETE FROM password_reset_tokens WHERE id = ?').bind(token).run();
      return new Response('Invalid or expired token', { status: 400 });
    }

    const hashedPassword = await hash(password, 10);
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(hashedPassword, tokenResult.user_id).run();
    await db.prepare('DELETE FROM password_reset_tokens WHERE id = ?').bind(token).run();

    return context.redirect('/auth/password-reset-success', 302);
  } catch (e) {
    console.error(e);
    return new Response('An unknown error occurred', { status: 500 });
  }
}