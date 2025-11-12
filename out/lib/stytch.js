'use strict';
/*
 * Minimal Stytch fetch wrapper for Cloudflare Workers (Edge-compatible)
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.StytchError = void 0;
exports.stytchMagicLinkLoginOrCreate = stytchMagicLinkLoginOrCreate;
exports.stytchOAuthAuthenticate = stytchOAuthAuthenticate;
exports.stytchMagicLinkAuthenticate = stytchMagicLinkAuthenticate;
class StytchError extends Error {
  constructor(status, providerType, message, requestId) {
    super(message);
    this.name = 'StytchError';
    this.status = status;
    this.providerType = providerType;
    this.requestId = requestId;
  }
}
exports.StytchError = StytchError;
function toBasicAuth(projectId, secret) {
  const raw = `${projectId}:${secret}`;
  // btoa is available in Workers runtime
  return `Basic ${btoa(raw)}`;
}
function resolveBaseUrl(projectId) {
  // Simple heuristic based on project id prefix; defaults to test
  if (projectId.startsWith('project-live-')) return 'https://api.stytch.com';
  return 'https://test.stytch.com';
}
async function fetchWithTimeout(input, init, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}
function readStytchConfig(context) {
  const env = context.locals?.runtime?.env || {};
  const projectId = env.STYTCH_PROJECT_ID;
  const secret = env.STYTCH_SECRET;
  if (!projectId || !secret) {
    // Mark as provider config error to allow structured mapping at API boundary
    throw new StytchError(
      500,
      'config_error',
      'Missing STYTCH_PROJECT_ID/STYTCH_SECRET in environment'
    );
  }
  return { projectId, secret };
}
function isE2EFake(context) {
  const env = context.locals?.runtime?.env || {};
  const val = env.E2E_FAKE_STYTCH;
  const envMode = env.ENVIRONMENT || env.NODE_ENV;
  const isDev = envMode === 'development';
  return isDev && (val === '1' || val === 'true');
}
async function stytchMagicLinkLoginOrCreate(context, req) {
  if (isE2EFake(context)) {
    return {
      request_id: 'fake-request-id',
      user_id: 'fake-user-id',
      user: {
        user_id: 'fake-user-id',
        emails: [{ email: req.email, verified: true }],
      },
      status_code: 200,
    };
  }
  const { projectId, secret } = readStytchConfig(context);
  const base = resolveBaseUrl(projectId);
  const url = `${base}/v1/magic_links/email/login_or_create`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: toBasicAuth(projectId, secret),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req),
  });
  const json = await res.json();
  if (!res.ok) {
    const err = json;
    const et = typeof err.error_type === 'string' ? err.error_type : 'unknown_error';
    const em =
      typeof err.error_message === 'string'
        ? err.error_message
        : typeof err.message === 'string'
          ? err.message
          : '';
    throw new StytchError(
      res.status,
      et,
      `Stytch login_or_create failed: ${res.status} ${et}${em ? ` - ${em}` : ''}`,
      typeof err.request_id === 'string' ? err.request_id : undefined
    );
  }
  return json;
}
async function stytchOAuthAuthenticate(context, token) {
  if (isE2EFake(context)) {
    // In E2E fake mode, behave like a verified user
    let email = 'e2e@example.com';
    try {
      const url = new URL(context.request.url);
      const qp = url.searchParams.get('email');
      if (qp && qp.includes('@')) email = qp;
    } catch {
      // Ignore URL parsing failures in test mode
    }
    return {
      request_id: 'fake-oauth-auth-id',
      user_id: 'fake-user-id',
      user: { user_id: 'fake-user-id', emails: [{ email, verified: true }] },
      status_code: 200,
    };
  }
  const { projectId, secret } = readStytchConfig(context);
  const base = resolveBaseUrl(projectId);
  const url = `${base}/v1/oauth/authenticate`;
  const doAttempt = async () => {
    const res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          Authorization: toBasicAuth(projectId, secret),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      },
      5000
    );
    const json = await res.json();
    if (!res.ok) {
      const err = json;
      const et = typeof err.error_type === 'string' ? err.error_type : 'unknown_error';
      const em =
        typeof err.error_message === 'string'
          ? err.error_message
          : typeof err.message === 'string'
            ? err.message
            : '';
      throw new StytchError(
        res.status,
        et,
        `Stytch OAuth authenticate failed: ${res.status} ${et}${em ? ` - ${em}` : ''}`,
        typeof err.request_id === 'string' ? err.request_id : undefined
      );
    }
    return json;
  };
  try {
    return await doAttempt();
  } catch (e) {
    if (e instanceof StytchError) {
      throw e;
    }
    return await doAttempt();
  }
}
async function stytchMagicLinkAuthenticate(context, token, pkceCodeVerifier) {
  if (isE2EFake(context)) {
    // Allow tests to control the email so they can simulate first-time users
    // Priority:
    // 1) token like "e2e:email@example.com" → use the email after the colon
    // 2) URL query param ?email=... (same-origin E2E only)
    // 3) fallback to a default email
    let email = 'e2e@example.com';
    try {
      if (token && token.startsWith('e2e:')) {
        const candidate = token.slice(4);
        if (candidate.includes('@')) email = candidate;
      } else {
        const url = new URL(context.request.url);
        const qp = url.searchParams.get('email');
        if (qp && qp.includes('@')) email = qp;
      }
    } catch {
      // Ignore URL parsing failures in test mode
    }
    return {
      request_id: 'fake-auth-id',
      user_id: 'fake-user-id',
      user: {
        user_id: 'fake-user-id',
        emails: [{ email, verified: true }],
      },
      status_code: 200,
    };
  }
  const { projectId, secret } = readStytchConfig(context);
  const base = resolveBaseUrl(projectId);
  const url = `${base}/v1/magic_links/authenticate`;
  const doAttempt = async () => {
    const res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          Authorization: toBasicAuth(projectId, secret),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          pkceCodeVerifier ? { token, pkce_code_verifier: pkceCodeVerifier } : { token }
        ),
      },
      5000
    );
    const json = await res.json();
    if (!res.ok) {
      const err = json;
      const et = typeof err.error_type === 'string' ? err.error_type : 'unknown_error';
      const em =
        typeof err.error_message === 'string'
          ? err.error_message
          : typeof err.message === 'string'
            ? err.message
            : '';
      throw new StytchError(
        res.status,
        et,
        `Stytch authenticate failed: ${res.status} ${et}${em ? ` - ${em}` : ''}`,
        typeof err.request_id === 'string' ? err.request_id : undefined
      );
    }
    return json;
  };
  try {
    return await doAttempt();
  } catch (_e) {
    return await doAttempt();
  }
}
