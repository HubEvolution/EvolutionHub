import type { APIContext } from 'astro';
import { createSession } from '../../../lib/auth-v2';
import { compare } from 'bcrypt-ts';

export async function POST(context: APIContext): Promise<Response> {
  const formData = await context.request.formData();
  const email = formData.get('email');
  const password = formData.get('password');

const token = formData.get('cf-turnstile-response');

  if (!token) {
    return new Response('Please complete the CAPTCHA.', { status: 400 });
  }

  console.log('Attempting CAPTCHA verification...');
  console.log('Using TURNSTILE_SECRET_KEY:', context.locals.runtime.env.TURNSTILE_SECRET_KEY);
  console.log('Checking for CLOUDFLARE_TURNSTILE_SECRET_KEY:', context.locals.runtime.env.CLOUDFLARE_TURNSTILE_SECRET_KEY);
  const turnstileResponse = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        secret: context.locals.runtime.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    }
  );

  const turnstileData = await turnstileResponse.json();

  if (!turnstileData.success) {
    return new Response('CAPTCHA verification failed.', { status: 400 });
  }
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

    const validPassword = await compare(password, existingUser.password_hash);
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