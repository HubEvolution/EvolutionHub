import { test, expect } from '@playwright/test';
import { createHmac } from 'crypto';
import { completeMagicLinkFlow } from '../../../../test-suite-v2/fixtures/auth-helpers';

// Ensure required environment defaults for local E2E runs
process.env.ENABLE_DEV_BYPASS ??= '1';
process.env.ENABLE_REFERRAL_REWARDS ??= '1';
process.env.REFERRAL_REWARD_TENTHS ??= '150';
process.env.STRIPE_SECRET ??= 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET ??= 'whsec_dummy';
process.env.PRICING_TABLE ??= JSON.stringify({ pro: 'price_pro' });

const ENABLE_DEV_BYPASS = process.env.ENABLE_DEV_BYPASS === '1';
const ENABLE_REFERRAL_REWARDS =
  process.env.ENABLE_REFERRAL_REWARDS === '1' ||
  process.env.ENABLE_REFERRAL_REWARDS?.toLowerCase() === 'true';
const REFERRAL_REWARD_TENTHS = Number(process.env.REFERRAL_REWARD_TENTHS || '0');
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_dummy';

/**
 * Referral reward happy-path flow
 *
 * Preconditions: ENABLE_DEV_BYPASS=1, ENABLE_REFERRAL_REWARDS=1,
 * REFERRAL_REWARD_TENTHS>0, Stripe secrets configured in runtime env.
 */
test.describe('Referral rewards flow', () => {
  test.skip(!ENABLE_DEV_BYPASS, 'Magic link dev bypass required for referral E2E');
  test.skip(!ENABLE_REFERRAL_REWARDS, 'Referral rewards feature flag must be enabled');
  test.skip(REFERRAL_REWARD_TENTHS <= 0, 'Referral reward amount must be configured');

  test('grants credits to referral owner when invitee subscribes', async ({ browser, request }) => {
    // 1. Login referral owner (seed user) and grab referral link from dashboard card
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();

    const ownerEmail = 'user@test-suite.local';
    await ownerPage.goto('/en/login?r=/dashboard');
    await completeMagicLinkFlow(ownerPage, ownerEmail, {
      locale: 'en',
      targetAfterAuth: '/dashboard',
    });
    await ownerPage.waitForURL('**/dashboard');

    // ReferralCard fetches summary once mounted; allow data refresh
    await ownerPage.waitForTimeout(1_000);
    const referralLinkLocator = ownerPage.locator('[data-testid="referral-link"]');
    await expect(referralLinkLocator).toBeVisible();
    const referralLink = (await referralLinkLocator.textContent())?.trim() ?? '';
    expect(referralLink.startsWith('http')).toBeTruthy();

    // 2. New invitee registers via referral link (separate browser context)
    const inviteContext = await browser.newContext();
    const invitePage = await inviteContext.newPage();
    await invitePage.goto(referralLink, { waitUntil: 'networkidle' });

    const referredEmail = `referral-e2e-${Date.now()}@example.com`;
    await completeMagicLinkFlow(invitePage, referredEmail, {
      locale: 'en',
      targetAfterAuth: '/dashboard',
    });
    await invitePage.waitForURL('**/dashboard', { timeout: 15_000 });

    const referredUserId = await extractUserId(invitePage);
    expect.soft(referredUserId).toBeTruthy();

    // 3. Trigger Stripe webhook to simulate subscription activation
    const webhookResponse = await triggerCheckoutWebhook(request, {
      userId: referredUserId,
      customerEmail: referredEmail,
    });
    expect(webhookResponse.status()).toBe(200);

    // 4. Owner dashboard should show verified referral event with credits
    await ownerPage.bringToFront();
    await ownerPage.reload();

    const summaryResponse = await ownerPage.request.get('/api/dashboard/referral-summary');
    expect(summaryResponse.ok()).toBeTruthy();
    const summaryJson = (await summaryResponse.json()) as {
      success?: boolean;
      data?: {
        stats?: { verified?: number; totalCredits?: number };
        recentEvents?: Array<{ status?: string; creditsAwarded?: number }>;
      };
    };
    expect(summaryJson?.success).toBe(true);
    const verifiedCount = summaryJson?.data?.stats?.verified ?? 0;
    const totalCredits = summaryJson?.data?.stats?.totalCredits ?? 0;
    expect(verifiedCount).toBeGreaterThan(0);
    expect(totalCredits).toBeGreaterThanOrEqual(Math.floor(REFERRAL_REWARD_TENTHS / 10));

    const recentEvents = summaryJson?.data?.recentEvents ?? [];
    expect(recentEvents.length).toBeGreaterThan(0);
    const latestEvent = recentEvents[0] ?? {};
    expect(latestEvent.status).toBe('verified');
    expect(latestEvent.creditsAwarded ?? 0).toBeGreaterThanOrEqual(
      Math.floor(REFERRAL_REWARD_TENTHS / 10)
    );

    await ownerContext.close();
    await inviteContext.close();
  });
});

async function extractUserId(page: import('@playwright/test').Page): Promise<string> {
  const apiResponse = await page.request.get('/api/user/me');
  if (!apiResponse.ok()) return '';
  try {
    const payload = (await apiResponse.json()) as { success?: boolean; data?: { id?: string } };
    if (payload?.success && payload.data?.id) {
      return payload.data.id;
    }
  } catch (error) {
    console.error('extractUserId json parse failed', error);
  }
  return '';
}

async function triggerCheckoutWebhook(
  request: import('@playwright/test').APIRequestContext,
  options: { userId: string; customerEmail: string }
): Promise<import('@playwright/test').APIResponse> {
  const subscriptionId = `sub_${Date.now()}_referral_e2e`;
  const payload = {
    id: `evt_checkout_${Date.now()}`,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_${Date.now()}`,
        mode: 'subscription',
        customer: `cus_${Date.now()}`,
        subscription: subscriptionId,
        client_reference_id: options.userId,
        metadata: {
          userId: options.userId,
          plan: 'pro',
        },
        customer_details: {
          email: options.customerEmail,
        },
      },
    },
  };

  const payloadJson = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payloadJson}`;
  const signature = createHmac('sha256', STRIPE_WEBHOOK_SECRET).update(signedPayload).digest('hex');
  const stripeSignature = `t=${timestamp},v1=${signature}`;
  return request.post('/api/billing/stripe-webhook', {
    headers: {
      'stripe-signature': stripeSignature,
      'content-type': 'application/json',
    },
    data: payloadJson,
  });
}
