import { withRedirectMiddleware } from '@/lib/api-middleware';

export const GET = withRedirectMiddleware(async (context) => {
  const { locals, request, cookies } = context;
  const url = new URL(request.url);
  const env: any = locals?.runtime?.env ?? {};

  // Accept either session_id or cs as parameter
  const sessionId = url.searchParams.get('session_id') || url.searchParams.get('cs') || '';
  const ws = url.searchParams.get('ws') || 'default';

  // If no sessionId is provided, we still proceed to link-pending flow
  // so unauthenticated checkouts can be associated via webhook-pending mapping.

  const baseUrl: string = env.BASE_URL || `${url.protocol}//${url.host}`;
  const user = locals.user;

  const dest = sessionId
    ? `${baseUrl}/api/billing/sync?session_id=${encodeURIComponent(sessionId)}&ws=${encodeURIComponent(ws)}`
    : `${baseUrl}/api/billing/link-pending`;

  if (user) {
    // Already authenticated → go straight to sync
    return new Response(null, {
      status: 302,
      headers: {
        Location: dest,
        'Cache-Control': 'no-store'
      }
    });
  }

  // Not authenticated → store post-auth redirect to complete sync after login
  try {
    const secure = url.protocol === 'https:';
    cookies.set('post_auth_redirect', dest, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
    });
  } catch (_err) {
    // Ignore cookie setting failures; redirect will proceed anyway
  }

  // Redirect to login; login flow will honor post_auth_redirect and finish sync automatically
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${baseUrl}/login`,
      'Cache-Control': 'no-store'
    }
  });
}, {
  onError: () => new Response('sync_cb_error', { status: 500 })
});
