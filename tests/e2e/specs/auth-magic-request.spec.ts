import { test, expect } from '@playwright/test';

// Deterministic smoke tests for the Magic Link flow.
// Uses dev/E2E provider bypass behaviour so the flow works without real email delivery.

test.describe('Auth Magic Request', () => {
  test('Magic link form on /en/login submits and updates status', async ({ page }) => {
    await page.goto('/en/login');

    const emailInput = page.locator('#email-magic');
    await expect(emailInput).toBeVisible();

    await emailInput.fill(`e2e-magic+${Date.now()}@example.com`);

    const submitButton = page.locator('#magic-link-form-login button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    const status = page.locator('#magic-link-form-login-status');
    // The enhancer should render a status or error message after submission.
    await expect(status).toBeVisible();
    // Role is set to "status" on success and "alert" on error; both are acceptable
    // in this smoke test, as long as the client wiring reacts.
    await expect(status).toHaveAttribute('role', /^(status|alert)$/);
  });

  test('POST /api/auth/magic/request accepts CSRF and returns success JSON', async ({
    request,
  }) => {
    const csrf = `e2e-csrf-${Date.now()}`;
    const email = `e2e-magic+${Date.now()}@example.com`;

    const res = await request.post('/api/auth/magic/request', {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf,
        Cookie: `csrf_token=${csrf}`,
        Accept: 'application/json',
      },
      data: {
        email,
        locale: 'en',
      },
    });

    const status = res.status();
    expect(status, 'Magic request status should be 2xx').toBeGreaterThanOrEqual(200);
    expect(status, 'Magic request status should be 2xx').toBeLessThan(300);

    const json = (await res.json()) as { success?: boolean; data?: { sent?: boolean } };
    expect(json.success).toBe(true);
    expect(json.data?.sent).toBe(true);
  });
});
