import type { APIContext } from 'astro';
import { hash, compare } from 'bcrypt-ts';

export async function POST(context: APIContext): Promise<Response> {
  const locals = context.locals as any;
  if (!locals.user) {
    return new Response(null, { status: 401 });
  }

  const formData = await context.request.formData();
  const currentPassword = formData.get('current-password');
  const newPassword = formData.get('new-password');

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 6) {
    return new Response('Invalid input', { status: 400 });
  }

  try {
    const db = locals.runtime.env.DB;
    const userResult = await db.prepare('SELECT password_hash FROM users WHERE id = ?').bind(locals.user.id).first();

    if (!userResult || !userResult.password_hash) {
      return new Response('User not found', { status: 404 });
    }

    const validPassword = await compare(currentPassword, userResult.password_hash);
    if (!validPassword) {
      return new Response('Incorrect current password', { status: 403 });
    }

    const hashedPassword = await hash(newPassword, 10);
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(hashedPassword, locals.user.id)
      .run();

    return new Response(JSON.stringify({ message: 'Password updated successfully' }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response('An unknown error occurred', { status: 500 });
  }
}