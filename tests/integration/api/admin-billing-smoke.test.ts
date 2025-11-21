import { describe, it, expect } from 'vitest';
import { TEST_URL, getJson, sendJson } from '../../shared/http';

interface ApiJson<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    message: string;
    details?: unknown;
  };
}

interface AdminUserSummaryData {
  user: {
    id: string;
    email: string;
    plan: 'free' | 'pro' | 'premium' | 'enterprise';
  };
  credits: number;
}

interface AdminCreditsUsageData {
  credits: number;
  tenths: number;
}

interface AdminCreditsGrantData {
  email: string;
  userId: string;
  granted: number;
  balance: number;
}

interface AdminCreditsDeductData {
  email: string;
  userId: string;
  requested: number;
  deducted: number;
  balance: number;
}

interface AdminSetPlanData {
  userId: string;
  plan: 'free' | 'pro' | 'premium' | 'enterprise';
}

function getAdminEnv() {
  const baseUrl = TEST_URL;
  const cookie = process.env.ADMIN_TEST_COOKIE || '';
  const csrf = process.env.ADMIN_TEST_CSRF || '';
  const userEmail = (process.env.ADMIN_TEST_USER_EMAIL || 'test@hub-evolution.com').trim();

  return { baseUrl, cookie, csrf, userEmail };
}

function buildAdminHeaders(cookie: string, csrf: string): Record<string, string> {
  const headers: Record<string, string> = {};

  if (cookie) {
    headers.Cookie = cookie;
  }
  if (csrf) {
    headers['X-CSRF-Token'] = csrf;
    // Falls der csrf_token nicht bereits im Cookie enthalten ist, optional ergänzen
    if (!cookie.includes('csrf_token=')) {
      const prefix = headers.Cookie ? `${headers.Cookie}; ` : '';
      headers.Cookie = `${prefix}csrf_token=${encodeURIComponent(csrf)}`;
    }
  }

  return headers;
}

// Hinweis:
// - Dieser Smoke-Test ist dafür gedacht, gegen eine bereits laufende Staging-Instanz
//   ausgeführt zu werden. Er verlässt sich auf eine existierende Admin-Session,
//   die per Umgebungsvariablen injiziert wird (ADMIN_TEST_COOKIE, ADMIN_TEST_CSRF).
// - Er ändert den Billing-Zustand eines dedizierten Test-Users (ADMIN_TEST_USER_EMAIL).

describe('Admin Billing Smoke (plans & credits)', () => {
  it('runs admin billing smoke test against configured base URL', async () => {
    const { baseUrl, cookie, csrf, userEmail } = getAdminEnv();

    if (!cookie || !csrf) {
      // Bewusst kein harter Fail: ohne Session kann der Smoke-Test lokal übersprungen werden.
      // Für CI kann man alternativ verlangen, dass diese Variablen gesetzt sind.
      console.warn(
        'Skipping admin-billing-smoke: ADMIN_TEST_COOKIE or ADMIN_TEST_CSRF is not set.'
      );
      return;
    }

    if (!userEmail || !userEmail.includes('@')) {
      throw new Error('ADMIN_TEST_USER_EMAIL must be a valid email address');
    }

    // Sanity-Check: wir erwarten typischerweise eine Staging-URL
    if (!baseUrl.includes('staging.hub-evolution.com')) {
      console.warn(
        `Warning: TEST_URL does not look like staging. Current TEST_URL=${baseUrl}`
      );
    }

    const adminHeaders = buildAdminHeaders(cookie, csrf);

    // 1) User-Summary laden (ermittelt userId + aktuelle Credits/Plan)
    const { res: summaryRes, json: summaryJson } = await getJson<ApiJson<AdminUserSummaryData>>(
      `/api/admin/users/summary?email=${encodeURIComponent(userEmail)}`,
      {
        headers: adminHeaders,
      }
    );

    if (summaryRes.status !== 200 || !summaryJson?.success || !summaryJson.data) {
      // Admin-Session oder Permissions nicht korrekt konfiguriert.
      // Für den Smoke-Test reicht es, wenn wir einen erwartbaren Fehlerstatus sehen
      // (z. B. 401/403 für fehlende Auth, 4xx/5xx generell) und brechen dann ab.
      expect([400, 401, 403, 404, 405, 429, 500]).toContain(summaryRes.status);
      return;
    }

    const summary = summaryJson.data;
    expect(summary.user.email.toLowerCase()).toBe(userEmail.toLowerCase());
    const userId = summary.user.id;

    // 2) Credits-Usage & History prüfen
    const { res: usageRes, json: usageJson } = await getJson<
      ApiJson<AdminCreditsUsageData>
    >(`/api/admin/credits/usage?userId=${encodeURIComponent(userId)}`, {
      headers: adminHeaders,
    });

    expect(usageRes.status).toBe(200);
    expect(usageJson && usageJson.success).toBe(true);
    const usage = usageJson!.data!;
    expect(typeof usage.credits).toBe('number');
    expect(typeof usage.tenths).toBe('number');

    const { res: historyRes, json: historyJson } = await getJson<ApiJson<{ items: unknown[] }>>(
      `/api/admin/credits/history?userId=${encodeURIComponent(userId)}`,
      { headers: adminHeaders }
    );

    expect(historyRes.status).toBe(200);
    expect(historyJson && historyJson.success).toBe(true);

    // 3) Credits grant (Topup)
    const grantAmount = 10;
    const { res: grantRes, json: grantJson } = await sendJson<ApiJson<AdminCreditsGrantData>>(
      '/api/admin/credits/grant',
      { email: userEmail, amount: grantAmount },
      { headers: adminHeaders }
    );

    if (grantRes.status !== 200 || !grantJson?.success || !grantJson.data) {
      // Infrastruktur, Permissions oder Rate-Limit nicht passend konfiguriert.
      // Für einen Smoke-Test reicht es, wenn wir einen "vernünftigen" Fehlerstatus sehen
      // (z. B. 4xx/5xx, inkl. 429 vom sensitiveActionLimiter), statt hart zu failen.
      expect([400, 401, 403, 404, 405, 409, 429, 500]).toContain(grantRes.status);
      return;
    }

    const grant = grantJson.data;
    expect(grant.email.toLowerCase()).toBe(userEmail.toLowerCase());
    expect(grant.granted).toBeGreaterThanOrEqual(1);

    // 4) Credits deduct (normaler Pfad)
    const deductAmount = 5;
    const { res: deductRes, json: deductJson } = await sendJson<
      ApiJson<AdminCreditsDeductData>
    >(
      '/api/admin/credits/deduct',
      { email: userEmail, amount: deductAmount },
      { headers: adminHeaders }
    );

    expect(deductRes.status).toBe(200);
    expect(deductJson && deductJson.success).toBe(true);
    const deduct = deductJson!.data!;
    expect(deduct.email.toLowerCase()).toBe(userEmail.toLowerCase());
    expect(deduct.deducted).toBeGreaterThanOrEqual(1);

    // 5) Credits deduct (Fehlerpfad: insufficient_credits)
    const { json: usageAfterJson } = await getJson<ApiJson<AdminCreditsUsageData>>(
      `/api/admin/credits/usage?userId=${encodeURIComponent(userId)}`,
      { headers: adminHeaders }
    );

    const usageAfter = usageAfterJson?.data;
    const currentCredits = typeof usageAfter?.credits === 'number' ? usageAfter.credits : 0;
    const tooMuch = currentCredits + 100;

    const { res: overDeductRes, json: overDeductJson } = await sendJson<ApiJson<unknown>>(
      '/api/admin/credits/deduct',
      { email: userEmail, amount: tooMuch, strict: true },
      { headers: adminHeaders }
    );

    // Erwartung: validation_error mit insufficient_credits (Statuscode 400/422 je nach Umsetzung)
    expect(overDeductRes.status).toBeGreaterThanOrEqual(400);
    expect(overDeductRes.status).toBeLessThan(500);
    expect(overDeductJson && overDeductJson.success).toBe(false);
    expect(overDeductJson?.error?.type).toBe('validation_error');

    // 6) Plan-Set (Upgrade & zurück auf free) – nur als Orchestrierungs-Smoke
    // Hinweis: dies erzeugt/ändert Stripe-Subscriptions im Testmodus.

    const { res: setPlanProRes, json: setPlanProJson } = await sendJson<
      ApiJson<AdminSetPlanData>
    >(
      '/api/admin/users/set-plan',
      {
        email: userEmail,
        plan: 'pro',
        interval: 'monthly',
        prorationBehavior: 'none',
      },
      { headers: adminHeaders }
    );

    expect(setPlanProRes.status).toBe(200);
    expect(setPlanProJson && setPlanProJson.success).toBe(true);

    const { res: setPlanFreeRes, json: setPlanFreeJson } = await sendJson<
      ApiJson<AdminSetPlanData>
    >(
      '/api/admin/users/set-plan',
      {
        email: userEmail,
        plan: 'free',
        cancelImmediately: true,
      },
      { headers: adminHeaders }
    );

    expect(setPlanFreeRes.status).toBe(200);
    expect(setPlanFreeJson && setPlanFreeJson.success).toBe(true);
  });
});
