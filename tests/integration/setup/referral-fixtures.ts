interface SeedOptions {
  baseUrl?: string;
  headers?: HeadersInit;
}

const DEFAULT_BASE_URL = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

export async function seedReferralEvents(options?: SeedOptions) {
  const baseUrl = (options?.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  const suiteUrl = `${baseUrl}/api/test/seed-suite-v2`;
  const url = `${baseUrl}/api/test/seed-referral-events`;

  const headers = new Headers(options?.headers);
  if (!headers.has('x-test-seed')) {
    headers.set('x-test-seed', '1');
  }
  if (!headers.has('Origin')) {
    headers.set('Origin', baseUrl);
  }

  const suiteResponse = await fetch(suiteUrl, {
    method: 'POST',
    headers,
  });

  if (!suiteResponse.ok) {
    const body = await suiteResponse.text().catch(() => '');
    throw new Error(
      `Failed to seed suite v2 users: ${suiteResponse.status} ${suiteResponse.statusText}${
        body ? ` — ${body}` : ''
      }`
    );
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Failed to seed referral events: ${response.status} ${response.statusText}${body ? ` — ${body}` : ''}`
    );
  }

  return response;
}
