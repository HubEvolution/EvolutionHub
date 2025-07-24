import type { APIContext } from 'astro';
import { createSession } from '../../../lib/auth-v2';
import { hash } from 'bcrypt-ts';

export async function POST(context: APIContext): Promise<Response> {
  const formData = await context.request.formData();
  const email = formData.get('email');
  const password = formData.get('password');
  const name = formData.get('name');
  const username = formData.get('username');

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
    password.length < 6 ||
    typeof name !== 'string' ||
    name.length < 2 ||
    typeof username !== 'string' ||
    username.length < 3
  ) {
    return new Response('Invalid input', { status: 400 });
  }

  const hashedPassword = await hash(password, 10);
  const userId = crypto.randomUUID();

  try {
    await context.locals.runtime.env.DB.prepare(
      'INSERT INTO users (id, email, password_hash, name, username) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(userId, email, hashedPassword, name, username)
      .run();

    const session = await createSession(context.locals.runtime.env.DB, userId);
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
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed')) {
      return new Response('Email or username already used', {
        status: 400
      });
    }
    console.error(e);
    return new Response('An internal error occurred', {
      status: 500
    });
  }
}