// test-suite-v2/fixtures/stytch-test-api.ts
// Test-only helper to talk to the Stytch Email Magic Link API in the TEST environment.
// Uses STYTCH_TEST_PROJECT_ID and STYTCH_TEST_SECRET from the local/CI environment.

const STYTCH_TEST_PROJECT_ID = process.env.STYTCH_TEST_PROJECT_ID;
const STYTCH_TEST_SECRET = process.env.STYTCH_TEST_SECRET;

const STYTCH_TEST_BASE_URL = 'https://test.stytch.com/v1';

function getBasicAuthHeader(): string {
  if (!STYTCH_TEST_PROJECT_ID || !STYTCH_TEST_SECRET) {
    throw new Error(
      'Stytch test credentials not configured. Please set STYTCH_TEST_PROJECT_ID and STYTCH_TEST_SECRET in your environment.'
    );
  }

  const token = Buffer.from(`${STYTCH_TEST_PROJECT_ID}:${STYTCH_TEST_SECRET}`, 'utf8').toString(
    'base64'
  );
  return `Basic ${token}`;
}

interface StytchMagicLinkResponse {
  /** Optional direct URL for the Magic Link (Create Magic Link API). */
  magic_link_url?: string;
  /** Some variants may nest the URL under magic_link.url; keep it flexible. */
  magic_link?: { url?: string };
  /** Fallback; some examples use url directly. */
  url?: string;
}

function extractMagicLinkUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as StytchMagicLinkResponse;

  if (typeof data.magic_link_url === 'string' && data.magic_link_url.length > 0) {
    return data.magic_link_url;
  }
  if (data.magic_link && typeof data.magic_link.url === 'string' && data.magic_link.url.length > 0) {
    return data.magic_link.url;
  }
  if (typeof data.url === 'string' && data.url.length > 0) {
    return data.url;
  }
  return null;
}

/**
 * Create a Magic Link for the given email address using Stytch's TEST API.
 *
 * This helper is intentionally liberal in how it interprets the response shape so that
 * minor upstream changes in the API do not immediately break tests. If the response
 * does not contain a recognizable Magic Link URL, a descriptive error is thrown.
 */
export async function createTestMagicLinkForEmail(
  email: string,
  callbackUrl: string
): Promise<string> {
  if (!email || !email.includes('@')) {
    throw new Error(`Invalid email for Stytch test magic link: ${email}`);
  }

  const authHeader = getBasicAuthHeader();
  const endpoint = `${STYTCH_TEST_BASE_URL}/magic_links`;

  const body = {
    email,
    login_magic_link_url: callbackUrl,
    signup_magic_link_url: callbackUrl,
  } as const;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    // keep json as null; we will surface the raw response below on error
  }

  if (!res.ok) {
    const message =
      (json && typeof json === 'object' && (json as { message?: string }).message) ||
      `Stytch test API returned ${res.status}`;
    throw new Error(`Failed to create Stytch test magic link: ${message}`);
  }

  const url = extractMagicLinkUrl(json);
  if (!url) {
    throw new Error('Stytch test API response did not contain a Magic Link URL');
  }

  return url;
}
