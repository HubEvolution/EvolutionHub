import { test, expect } from '@playwright/test';

// CSP compliance tests, staging-aware and environment-sensitive
// - In dev: allows 'unsafe-inline' and 'unsafe-eval'
// - In prod: uses per-request nonce + 'strict-dynamic' and disallows 'unsafe-eval'
// The test extracts the nonce from the header and ensures it matches a DOM <script nonce>.

test.describe('CSP policy and nonce', () => {
  test('CSP header present and nonce matches DOM scripts', async ({ page }) => {
    const res = await page.goto('/en/');
    expect(res?.ok()).toBeTruthy();

    const headers = res!.headers();
    const csp = headers['content-security-policy'];
    expect(csp, 'Content-Security-Policy header should be present').toBeTruthy();

    // Detect environment from policy shape
    const isDev = /script-src[^;]*'unsafe-inline'/.test(csp);

    if (isDev) {
      expect(csp).toMatch(/script-src[^;]*'unsafe-inline'/);
      expect(csp).toMatch(/script-src[^;]*'unsafe-eval'/);
    } else {
      expect(csp).toMatch(/script-src[^;]*'strict-dynamic'/);
      expect(csp).toMatch(/script-src[^;]*'nonce-[^']+'/);
      expect(csp).not.toMatch(/'unsafe-eval'/);
    }

    // CDN allow-list present
    expect(csp).toContain('cdn.jsdelivr.net');

    // Connect-src should allow HTTPS and WS for dev/prod respectively
    expect(csp).toMatch(/connect-src[^;]*https:/);

    // Extract CSP nonce and assert it exists on at least one <script>
    const m = csp.match(/'nonce-([^']+)'/);
    expect(m, 'Expected a nonce value in CSP').toBeTruthy();
    const nonce = m![1];

    const noncedScriptCount = await page.locator(`script[nonce="${nonce}"]`).count();
    expect(noncedScriptCount).toBeGreaterThan(0);

    // In prod, ensure no inline script without nonce slips through
    if (!isDev) {
      const inlineNoNonce = await page.$$eval('script:not([src]):not([nonce])', els => els.length);
      expect(inlineNoNonce).toBe(0);
    }
  });
});
