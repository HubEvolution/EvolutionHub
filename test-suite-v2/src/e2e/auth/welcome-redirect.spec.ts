import { test, expect } from '@playwright/test';
import { isRemoteTarget } from '../../../fixtures/auth-helpers';

const BASE_URL = process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:8787';

function uniqueEmail(prefix: string) {
  const rand = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString().slice(-6);
  return `${prefix}-${rand}-${ts}@example.com`;
}

// A) Locale in path -> direct dashboard (no welcome)
test('magic-link from /en/login ends in /en/dashboard (first-time may see welcome-profile)', async ({
  page,
}) => {
  test.skip(isRemoteTarget(), 'Only runs on local target with fake provider');

  // Visit /en/login to set pref_locale via middleware
  await page.goto(`${BASE_URL}/en/login`);
  await page.waitForLoadState('domcontentloaded');

  const email = uniqueEmail('e2e-en');
  // Dev bypass of magic link callback
  await page.goto(`${BASE_URL}/api/auth/callback?token=dev-ok&email=${encodeURIComponent(email)}`);

  // Expect no generic /welcome; first-time users may see /en/welcome-profile then continue
  await page.waitForLoadState('domcontentloaded');
  await expect(page).not.toHaveURL(/\/welcome(\?|$)/);
  // Allow either /en/dashboard or /en/welcome-profile (and tolerate neutral /welcome-profile)
  const urlNow = page.url();
  if (!/(\/en\/(dashboard|welcome-profile)|\/welcome-profile)/.test(urlNow)) {
    // Wait briefly for post-login redirect to settle
    await page.waitForTimeout(1200);
  }
  await expect(page).toHaveURL(/(\/en\/(dashboard|welcome-profile)|\/welcome-profile)/);
});

// B) Neutral path -> welcome once -> locale target
test('magic-link from /login reaches localized dashboard (welcome may auto-continue)', async ({
  page,
}) => {
  test.skip(isRemoteTarget(), 'Only runs on local target with fake provider');

  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('domcontentloaded');

  const email = uniqueEmail('e2e-neutral');
  await page.goto(`${BASE_URL}/api/auth/callback?token=dev-ok&email=${encodeURIComponent(email)}`);

  // After redirect chain (may include /welcome auto-continue), expect welcome-profile or dashboard
  await page.waitForLoadState('domcontentloaded');
  // If still on /welcome, allow auto-continue delay
  if (/\/welcome(\?|$)/.test(page.url())) {
    await page.waitForTimeout(1200);
  }
  await expect(page).toHaveURL(/\/(en\/)?(welcome-profile|dashboard)/);
});
