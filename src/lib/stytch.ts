/*
 * Minimal Stytch fetch wrapper for Cloudflare Workers (Edge-compatible)
 */

import type { APIContext } from 'astro';

export class StytchError extends Error {
  status: number;
  providerType: string;
  constructor(status: number, providerType: string, message: string) {
    super(message);
    this.name = 'StytchError';
    this.status = status;
    this.providerType = providerType;
  }
}

interface StytchConfig {
  projectId: string;
  secret: string;
}

interface MagicLinkLoginOrCreateRequest {
  email: string;
  // Stytch expects magic_link_url fields for email magic links
  login_magic_link_url: string;
  signup_magic_link_url: string;
}

interface StytchUser {
  user_id: string;
  emails?: Array<{ email: string; verified: boolean }>;
}

interface MagicLinkLoginOrCreateResponse {
  request_id: string;
  user_id?: string;
  user?: StytchUser;
  status_code?: number;
}

interface MagicLinkAuthenticateResponse {
  request_id: string;
  user_id: string;
  user: StytchUser;
  status_code?: number;
}

function toBasicAuth(projectId: string, secret: string): string {
  const raw = `${projectId}:${secret}`;
  // btoa is available in Workers runtime
  return `Basic ${btoa(raw)}`;
}

function resolveBaseUrl(projectId: string): string {
  // Simple heuristic based on project id prefix; defaults to test
  if (projectId.startsWith('project-live-')) return 'https://api.stytch.com';
  return 'https://test.stytch.com';
}

function readStytchConfig(context: APIContext): StytchConfig {
  const env = (context.locals as unknown as { runtime?: { env?: Record<string, string> } })?.runtime?.env || {};
  const projectId = (env as Record<string, string>).STYTCH_PROJECT_ID;
  const secret = (env as Record<string, string>).STYTCH_SECRET;
  if (!projectId || !secret) {
    // Mark as provider config error to allow structured mapping at API boundary
    throw new StytchError(500, 'config_error', 'Missing STYTCH_PROJECT_ID/STYTCH_SECRET in environment');
  }
  return { projectId, secret };
}

function isE2EFake(context: APIContext): boolean {
  const env = (context.locals as unknown as { runtime?: { env?: Record<string, string> } })?.runtime?.env || {};
  const val = (env as Record<string, string>).E2E_FAKE_STYTCH;
  return val === '1' || val === 'true';
}

export async function stytchMagicLinkLoginOrCreate(
  context: APIContext,
  req: MagicLinkLoginOrCreateRequest
): Promise<MagicLinkLoginOrCreateResponse> {
  if (isE2EFake(context)) {
    return {
      request_id: 'fake-request-id',
      user_id: 'fake-user-id',
      user: {
        user_id: 'fake-user-id',
        emails: [{ email: req.email, verified: true }]
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
      'Authorization': toBasicAuth(projectId, secret),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req),
  });
  const json = (await res.json()) as MagicLinkLoginOrCreateResponse;
  if (!res.ok) {
    const et = (json as any)?.error_type || 'unknown_error';
    const em = (json as any)?.error_message || (json as any)?.message || '';
    throw new StytchError(res.status, et, `Stytch login_or_create failed: ${res.status} ${et}${em ? ` - ${em}` : ''}`);
  }
  return json;
}

export async function stytchMagicLinkAuthenticate(
  context: APIContext,
  token: string
): Promise<MagicLinkAuthenticateResponse> {
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
    } catch {}

    return {
      request_id: 'fake-auth-id',
      user_id: 'fake-user-id',
      user: {
        user_id: 'fake-user-id',
        emails: [{ email, verified: true }]
      },
      status_code: 200,
    };
  }
  const { projectId, secret } = readStytchConfig(context);
  const base = resolveBaseUrl(projectId);
  const url = `${base}/v1/magic_links/authenticate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': toBasicAuth(projectId, secret),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });
  const json = (await res.json()) as MagicLinkAuthenticateResponse;
  if (!res.ok) {
    const et = (json as any)?.error_type || 'unknown_error';
    const em = (json as any)?.error_message || (json as any)?.message || '';
    throw new StytchError(res.status, et, `Stytch authenticate failed: ${res.status} ${et}${em ? ` - ${em}` : ''}`);
  }
  return json;
}
