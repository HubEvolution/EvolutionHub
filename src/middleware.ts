import { defineMiddleware } from 'astro:middleware';
import { validateSession } from './lib/auth-v2';

export const onRequest = defineMiddleware(async (context, next) => {
  const sessionId = context.cookies.get('session_id')?.value ?? null;

  if (!sessionId) {
    context.locals.user = null;
    context.locals.session = null;
    return next();
  }

  const { session, user } = await validateSession(context.locals.runtime.env.DB, sessionId);

  context.locals.session = session;
  context.locals.user = user as any; // Explicitly cast to 'any' to resolve type mismatch
  return next();
});