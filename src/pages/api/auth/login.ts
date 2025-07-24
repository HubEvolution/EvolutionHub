import type { APIContext } from 'astro';
import { createSession } from '../../../lib/auth-v2';

import { compare } from 'bcrypt-ts';

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
    return new Response(null, {
      status: 302,
      headers: { Location: '/login?error=InvalidInput' }
    });
  }
  
  try {
    const db = context.locals.runtime.env.DB;
    const existingUser = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

    if (!existingUser) {
      return new Response(null, {
        status: 302,
        headers: { Location: '/login?error=InvalidCredentials' }
      });
    }

    if (!existingUser.password_hash) {
        return new Response(null, {
            status: 302,
            headers: { Location: '/login?error=InvalidCredentials' }
        });
    }

    const validPassword = await compare(password, existingUser.password_hash);
    if (!validPassword) {
      return new Response(null, {
        status: 302,
        headers: { Location: '/login?error=InvalidCredentials' }
      });
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
    console.error(e);
    return new Response(null, {
      status: 302,
      headers: { Location: '/login?error=UnknownError' }
    });
  }
}