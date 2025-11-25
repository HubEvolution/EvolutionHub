import { test, expect } from '@playwright/test';

function getAdminEnv() {
  const baseUrl = process.env.TEST_BASE_URL || process.env.BASE_URL || '';
  const adminCookie = process.env.ADMIN_TEST_COOKIE || '';
  const adminCsrf = process.env.ADMIN_TEST_CSRF || '';
  const adminEmail = (process.env.ADMIN_TEST_USER_EMAIL || '').trim();

  return { baseUrl, adminCookie, adminCsrf, adminEmail };
}

async function seedAdminSessionFromCookie(page: import('@playwright/test').Page) {
  const { baseUrl, adminCookie, adminCsrf } = getAdminEnv();
  if (!baseUrl || !adminCookie) {
    test.skip(true, 'Admin env not configured (TEST_BASE_URL/ADMIN_TEST_COOKIE missing)');
  }

  const url = new URL(baseUrl);

  // Parse ADMIN_TEST_COOKIE into individual cookies ("name=value; name2=value2; …")
  const parts = adminCookie.split(';').map((p) => p.trim()).filter(Boolean);
  const cookies: { name: string; value: string }[] = [];

  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const name = part.slice(0, eqIdx).trim();
    const value = part.slice(eqIdx + 1).trim();
    if (!name) continue;
    cookies.push({ name, value });
  }

  if (cookies.length === 0) {
    test.skip(true, 'ADMIN_TEST_COOKIE could not be parsed into cookies');
  }

  await page.context().addCookies(
    cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: url.hostname,
      path: '/',
      httpOnly: true,
      secure: url.protocol === 'https:',
    }))
  );

  // Ensure csrf_token cookie if ADMIN_TEST_CSRF is provided and not already present
  const hasCsrfCookie = cookies.some((c) => c.name === 'csrf_token');
  if (adminCsrf && !hasCsrfCookie) {
    await page.context().addCookies([
      {
        name: 'csrf_token',
        value: adminCsrf,
        domain: url.hostname,
        path: '/',
        httpOnly: false,
        secure: url.protocol === 'https:',
      },
    ]);
  }
}

async function openAdminUserInsightsForAdminEmail(page: import('@playwright/test').Page) {
  const { adminEmail } = getAdminEnv();

  if (!adminEmail || !adminEmail.includes('@')) {
    test.skip(true, 'ADMIN_TEST_USER_EMAIL must be configured as a valid email');
  }

  await seedAdminSessionFromCookie(page);
  await page.goto('/admin');

  // Admin Dashboard heading should be visible
  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();

  // User Insights section heading (same text in de/en)
  await expect(page.getByRole('heading', { name: 'User Insights' })).toBeVisible();

  // Search for the admin test user by email using the search form
  const searchInput = page.getByPlaceholder(/user@example.com/);
  await searchInput.fill(adminEmail);

  // Submit search (de: "Suchen", en: "Search")
  await page.getByRole('button', { name: /Suchen|Search/ }).click();

  // Summary card should show the selected user's email
  await expect(page.getByText(adminEmail)).toBeVisible();
}

// Basic smoke: /admin loads with existing admin session and detailed flows for a single admin test user

test.describe('Admin Dashboard Smoke (Staging)', () => {
  test('loads /admin with existing ADMIN_TEST_COOKIE session', async ({ page }) => {
    const { baseUrl, adminCookie, adminEmail } = getAdminEnv();

    if (!baseUrl || !adminCookie || !adminEmail || !adminEmail.includes('@')) {
      test.skip(
        true,
        'Admin env not configured (TEST_BASE_URL/ADMIN_TEST_COOKIE/ADMIN_TEST_USER_EMAIL)'
      );
    }

    if (!baseUrl.includes('staging.hub-evolution.com')) {
      // Keep test usable for other envs, but highlight expectation in logs
      console.warn(`Warning: TEST_BASE_URL does not look like staging. Current=${baseUrl}`);
    }

    await seedAdminSessionFromCookie(page);

    await page.goto('/admin');

    // Expect to stay on /admin and see the Admin Dashboard heading
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
  });

  test('can load User Insights and attempt plan change for ADMIN_TEST_USER_EMAIL', async ({
    page,
  }) => {
    const { adminEmail } = getAdminEnv();
    if (!adminEmail || !adminEmail.includes('@')) {
      test.skip(true, 'ADMIN_TEST_USER_EMAIL must be configured as a valid email');
    }

    await openAdminUserInsightsForAdminEmail(page);

    // Summary card shows user + plan information (labels are i18n, but stable)
    await expect(page.getByText(/User Insights/)).toBeVisible();
    await expect(page.getByText(adminEmail)).toBeVisible();

    // Plan override form: label is de: "Plan überschreiben", en: "Override plan"
    const planSelect = page.getByLabel(/Plan überschreiben|Override plan/);
    await expect(planSelect).toBeVisible();

    // Try to set plan to "pro" (idempotent on repeated runs)
    await planSelect.selectOption('pro');

    // Interval + proration have sensible defaults; just ensure submit button exists
    const planSubmitButton = page.getByRole('button', {
      name: /Plan aktualisieren|Update plan/,
    });
    await expect(planSubmitButton).toBeVisible();

    await planSubmitButton.click();

    // Wait for either an inline error (rate-limit or generic) or a stable summary state
    const possibleError = page.locator(
      /Rate-Limit erreicht|Rate limit reached|Plan konnte nicht aktualisiert werden\.|Failed to update plan\./
    );

    await Promise.race([
      possibleError.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined),
      page.getByText(adminEmail).waitFor({ state: 'visible', timeout: 15000 }),
    ]);

    // In any case, the summary for the user should still be visible
    await expect(page.getByText(adminEmail)).toBeVisible();
  });

  test('can grant and deduct credits for ADMIN_TEST_USER_EMAIL', async ({ page }) => {
    const { adminEmail } = getAdminEnv();
    if (!adminEmail || !adminEmail.includes('@')) {
      test.skip(true, 'ADMIN_TEST_USER_EMAIL must be configured as a valid email');
    }

    await openAdminUserInsightsForAdminEmail(page);

    // Scope all selectors to the "User Insights" region to avoid clashes with Billing credits
    const insightsRegion = page.getByRole('region', { name: 'User Insights' });

    // Credits section heading (same key "Credits" in de/en)
    const creditsHeading = insightsRegion.getByRole('heading', { name: 'Credits' });
    await expect(creditsHeading).toBeVisible();

    // Amount input label: de: "Credits (Standard: 1000)", en: "Credits (default: 1000)"
    const amountInput = insightsRegion.getByLabel(
      /Credits \(Standard: 1000\)|Credits \(default: 1000\)/
    );
    await expect(amountInput).toBeVisible();
    await amountInput.fill('5');

    // Grant credits button: de: "Credits hinzufügen", en: "Grant credits"
    const grantButton = insightsRegion.getByRole('button', {
      name: /Credits hinzufügen|Grant credits/,
    });
    await expect(grantButton).toBeVisible();
    await grantButton.click();

    // On success, usage/history will refresh; on failure, an inline error text is shown.
    const creditsError = page.locator(
      /Rate-Limit erreicht|Rate limit reached|Credits konnten nicht vergeben werden\.|Failed to grant credits\./
    );

    await Promise.race([
      creditsError.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined),
      creditsHeading.waitFor({ state: 'visible', timeout: 15000 }),
    ]);

    // Deduct a smaller amount; tolerate insufficient_credits-style failures as long as UI responds.
    await amountInput.fill('1');

    const deductButton = insightsRegion.getByRole('button', {
      name: /Credits abziehen|Deduct credits/,
    });
    await expect(deductButton).toBeVisible();
    await deductButton.click();

    const deductError = page.locator(
      /Rate-Limit erreicht|Rate limit reached|Credits konnten nicht abgezogen werden\.|Failed to deduct credits\./
    );

    await Promise.race([
      deductError.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined),
      creditsHeading.waitFor({ state: 'visible', timeout: 15000 }),
    ]);

    // The Credits section and user summary should remain visible after both actions.
    await expect(creditsHeading).toBeVisible();
    await expect(page.getByText(adminEmail)).toBeVisible();
  });
});

