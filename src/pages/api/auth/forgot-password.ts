import type { APIContext } from 'astro';

export async function POST(context: APIContext): Promise<Response> {
  const formData = await context.request.formData();
  const email = formData.get('email');

  if (typeof email !== 'string' || email.length < 3) {
    return new Response('Invalid email', { status: 400 });
  }

  try {
    const db = context.locals.runtime.env.DB;
    const existingUser = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

    if (!existingUser) {
      // We don't want to reveal if a user exists or not
      return new Response('If a user with this email exists, a password reset link has been sent.', { status: 200 });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await db.prepare(
      'INSERT INTO password_reset_tokens (id, user_id, expires_at) VALUES (?, ?, ?)'
    ).bind(token, existingUser.id, Math.floor(expiresAt.getTime() / 1000)).run();

    const resetLink = `${context.url.origin}/reset-password?token=${token}`;
    
    // In a real app, you'd send an email here. For this example, we'll log it.
    console.log(`Password reset link for ${email}: ${resetLink}`);

    return new Response('If a user with this email exists, a password reset link has been sent.', { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response('An unknown error occurred', { status: 500 });
  }
}