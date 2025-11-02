import { describe, it, expect } from 'vitest';

const BASE = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const ORIGIN = BASE;

function hasStripeConfig(): boolean {
  const s = process.env.STRIPE_SECRET || '';
  const monthly = process.env.PRICING_TABLE || '';
  const annual = process.env.PRICING_TABLE_ANNUAL || '';
  return Boolean(s && (monthly || annual));
}

async function request(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (!headers.has('Origin')) headers.set('Origin', ORIGIN);
  const res = await fetch(`${BASE}${path}`, { ...init, headers, redirect: 'manual' });
  const ct = res.headers.get('content-type') || '';
  let json: any = null;
  if (ct.includes('application/json')) {
    try {
      json = await res.json();
    } catch {}
  }
  return { status: res.status, headers: res.headers, json } as const;
}

function adminHeaders(): HeadersInit {
  const cookie = process.env.TEST_ADMIN_COOKIE || 'session_id=e2e-admin-session-0001';
  const csrf = 'testtoken_' + Math.random().toString(36).slice(2);
  return {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrf,
    Cookie: `${cookie}; csrf_token=${csrf}`,
  };
}

// These tests are opt-in: they will be skipped if Stripe is not configured
// (we don't want to hard-require live Stripe creds in CI).
describe('Admin Users Set Plan — happy paths (opt-in with STRIPE config)', () => {
  it('POST set-plan upgrade to pro (monthly, proration none) → 200 when Stripe configured', async () => {
    if (!hasStripeConfig()) {
      expect(true).toBe(true); // skipped
      return;
    }
    const body = {
      email: process.env.TEST_ADMIN_EMAIL || 'admin@test-suite.local',
      plan: 'pro',
      interval: 'monthly' as const,
      prorationBehavior: 'none' as const,
      reason: 'integration test upgrade',
    };
    const { status, json } = await request('/api/admin/users/set-plan', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify(body),
    });
    expect(status).toBe(200);
    if (json) expect(json.success).toBe(true);
  });

  it('POST set-plan downgrade to free (cancel at period end) → 200 when Stripe configured', async () => {
    if (!hasStripeConfig()) {
      expect(true).toBe(true); // skipped
      return;
    }
    const body = {
      email: process.env.TEST_ADMIN_EMAIL || 'admin@test-suite.local',
      plan: 'free' as const,
      cancelAtPeriodEnd: true,
      reason: 'integration test downgrade',
    };
    const { status, json } = await request('/api/admin/users/set-plan', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify(body),
    });
    expect(status).toBe(200);
    if (json) expect(json.success).toBe(true);
  });
});
