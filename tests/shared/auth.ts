import { TEST_URL } from './http';

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  // Best-effort parser (sufficient for our Set-Cookie usage in tests)
  // Splits on comma+space boundaries, then extracts name=value before the first semicolon
  const parts = cookieHeader.split(', ');
  for (const part of parts) {
    const [name, ...rest] = part.split('=');
    const valueAndAttrs = rest.join('=');
    const value = valueAndAttrs.split(';')[0];
    const cookieName = name?.trim();
    if (cookieName && value != null) cookies[cookieName] = value.trim();
  }
  return cookies;
}

export interface DebugLoginResult {
  cookie: string;
  sessionId?: string;
  userId?: string;
}

export async function debugLogin(debugToken?: string): Promise<DebugLoginResult> {
  const headers: Record<string, string> = {
    Origin: TEST_URL,
    'Content-Type': 'application/json',
  };
  if (debugToken) headers['X-Debug-Token'] = debugToken;

  const res = await fetch(`${TEST_URL}/api/debug-login`, {
    method: 'POST',
    headers,
    redirect: 'manual',
  });

  if (res.status !== 200) {
    const text = await res.text().catch(() => '');
    throw new Error(`debugLogin failed: ${res.status} ${text}`);
  }

  const setCookie = res.headers.get('set-cookie') || '';
  const cookies = parseCookies(setCookie);
  const sessionId = cookies['session_id'];
  const cookie = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

  let userId: string | undefined;
  try {
    const json: any = await res.json();
    if (json && typeof json.userId === 'string') userId = json.userId;
  } catch {
    /* ignore */
  }

  return { cookie, sessionId, userId };
}
