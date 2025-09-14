import { test, expect } from '@playwright/test';

// This suite validates basic Pricing interactions without requiring a real Stripe session.
// It asserts that interval toggling updates amounts/period labels via stable data attributes,
// and that clicking the checkout button POSTs to /api/billing/session with expected payload
// and then navigates to the returned URL.

const PRICING_PATH = '/pricing';

async function tryDismissCookieConsent(page: any) {
  const candidates = [
    'button:has-text("Accept")',
    'button:has-text("Akzeptieren")',
    'button:has-text("Einverstanden")',
    'button[aria-label="Accept"]',
    'button[aria-label="Akzeptieren"]',
  ];
  for (const sel of candidates) {
    const btn = page.locator(sel).first();
    if (await btn.count().catch(() => 0)) {
      try { await btn.click({ timeout: 1000 }); } catch {}
    }
  }
}

async function navigateToPricing(page: any) {
  const paths = [PRICING_PATH, '/en/pricing', '/de/pricing'];
  for (const p of paths) {
    await page.goto(p);
    await tryDismissCookieConsent(page);
    const monthlyBtn = page.locator('#interval-monthly');
    if (await monthlyBtn.count()) {
      return;
    }
  }
  // Final assert so the test fails clearly if nothing matched
  await expect(page.locator('#interval-monthly')).toBeVisible();
}

function locatorFor(page, plan: 'pro' | 'premium') {
  const amount = page.locator(`span[data-plan="${plan}"][data-role="amount"]`);
  const period = page.locator(`span[data-plan="${plan}"][data-role="period"]`);
  return { amount, period };
}

async function readAttrs(locator: ReturnType<typeof locatorFor>) {
  const monthlyAmount = await locator.amount.getAttribute('data-monthly');
  const annualAmount = await locator.amount.getAttribute('data-annual');
  const monthlyPeriod = await locator.period.getAttribute('data-monthly');
  const annualPeriod = await locator.period.getAttribute('data-annual');
  return { monthlyAmount, annualAmount, monthlyPeriod, annualPeriod };
}

// Ensures toggle buttons are present and operable
async function expectToggleButtons(page) {
  const monthlyBtn = page.locator('#interval-monthly');
  const annualBtn = page.locator('#interval-annual');
  await expect(monthlyBtn).toBeVisible();
  await expect(annualBtn).toBeVisible();
  return { monthlyBtn, annualBtn };
}

test.describe('Pricing – interval toggle and checkout wiring', () => {
  test('Toggle Monthly/Annual updates Pro and Premium amount + period labels', async ({ page }) => {
    await navigateToPricing(page);

    const { monthlyBtn, annualBtn } = await expectToggleButtons(page);

    const pro = locatorFor(page, 'pro');
    const premium = locatorFor(page, 'premium');

    // Ensure base attributes exist to compare against
    const attrsPro = await readAttrs(pro);
    const attrsPremium = await readAttrs(premium);

    // Some locales may hide labels before wiring; ensure elements are present
    await expect(pro.amount).toBeVisible();
    await expect(pro.period).toBeVisible();
    await expect(premium.amount).toBeVisible();
    await expect(premium.period).toBeVisible();

    // Switch to Annual
    await annualBtn.click();
    await expect(pro.amount).toHaveText(attrsPro.annualAmount || '');
    await expect(pro.period).toHaveText(attrsPro.annualPeriod || '');
    await expect(premium.amount).toHaveText(attrsPremium.annualAmount || '');
    await expect(premium.period).toHaveText(attrsPremium.annualPeriod || '');

    // Switch back to Monthly
    await monthlyBtn.click();
    await expect(pro.amount).toHaveText(attrsPro.monthlyAmount || '');
    await expect(pro.period).toHaveText(attrsPro.monthlyPeriod || '');
    await expect(premium.amount).toHaveText(attrsPremium.monthlyAmount || '');
    await expect(premium.period).toHaveText(attrsPremium.monthlyPeriod || '');
  });

  test('Click Buy Pro posts correct payload and navigates to returned URL', async ({ page }) => {
    await navigateToPricing(page);

    const { annualBtn } = await expectToggleButtons(page);
    // Make interval annual for this test
    await annualBtn.click();

    // Intercept the checkout session call and validate payload
    await page.route('**/api/billing/session', async (route) => {
      const req = route.request();
      expect(req.method()).toBe('POST');
      const body = await req.postDataJSON();
      // Body fields from PricingTable script
      expect(body).toMatchObject({ plan: 'pro', interval: 'annual' });
      // Fulfill with a fake checkout URL to avoid hitting real Stripe in CI
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://checkout.stripe.com/test-session' }),
      });
    });

    const buyPro = page.locator('#buy-pro-cta');
    await expect(buyPro).toBeVisible();

    const navPromise = page.waitForURL(/checkout\.stripe\.com\/test-session/, { timeout: 15000 });
    await buyPro.click();
    await navPromise;

    // Sanity: we ended up on our mocked checkout URL
    await expect(page).toHaveURL(/checkout\.stripe\.com\/test-session/);
  });
});
