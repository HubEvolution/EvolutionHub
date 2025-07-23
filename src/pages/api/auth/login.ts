import type { APIContext } from 'astro';
import { createSession } from '../../../lib/auth-v2';
import { Argon2id } from 'oslo/password';

export async function POST(context: APIContext): Promise<Response> {
  const formData = await context.request.formData();
  const email = formData.get('email');
  const password = formData.get('password');

  if (
    typeof email !== 'string' ||
    email.length < 3 ||
    typeof password !== 'string' ||
    password.length < 6
  ) {
    return new Response('Invalid email or password', { status: 400 });
  }
  
  try {
    const db = context.locals.runtime.env.DB;
    const existingUser = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

    if (!existingUser) {
      return new Response('Incorrect email or password', { status: 400 });
    }

    if (!existingUser.password_hash) {
        return new Response('Incorrect email or password', { status: 400 });
    }

    const validPassword = await new Argon2id().verify(existingUser.password_hash, password);
    if (!validPassword) {
      return new Response('Incorrect email or password', { status: 400 });
    }

    const session = await createSession(db, existingUser.id);
    context.cookies.set('session_id', session.id, {
        path: '/',
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30, // 30 days
        secure: context.url.protocol === 'https:',
        sameSite: 'lax'
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: '/dashboard'
      }
    });
  } catch (e) {
    return new Response('An unknown error occurred', {
      status: 500
    });
  }
}