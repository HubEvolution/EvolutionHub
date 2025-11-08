import { beforeAll, describe, it, expect } from 'vitest';
import { seedReferralEvents } from '../setup/referral-fixtures';

const BASE = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const ORIGIN = BASE;

function referralFlagEnabled(): boolean {
  const flag = process.env.ENABLE_REFERRAL_REWARDS || '';
  return ['1', 'true', 'on'].includes(flag.toLowerCase());
}

async function request(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (!headers.has('Origin')) headers.set('Origin', ORIGIN);
  const res = await fetch(`${BASE}${path}`, { ...init, headers, redirect: 'manual' });
  const contentType = res.headers.get('content-type') || '';
  let json: any = null;
  if (contentType.includes('application/json')) {
    try {
      json = await res.json();
    } catch {
      /* ignore non json */
    }
  }
  return { status: res.status, json } as const;
}

function adminHeaders(): HeadersInit {
  const cookie = process.env.TEST_ADMIN_COOKIE || 'session_id=e2e-admin-session-0001';
  const csrf = 'csrf_' + Math.random().toString(36).slice(2);
  return {
    'X-CSRF-Token': csrf,
    Cookie: `${cookie}; csrf_token=${csrf}`,
  };
}

async function seedAdminReferrals() {
  await seedReferralEvents();
}

describe('Admin Referrals List API', () => {
  beforeAll(async () => {
    await seedAdminReferrals();

    if (!referralFlagEnabled()) {
      return;
    }
  });

  it('denies unauthenticated access with 401', async () => {
    const { status, json } = await request('/api/admin/referrals/list?limit=5');
    expect(status).toBe(401);
    if (json) {
      expect(json.success).toBe(false);
    }
  });

  it('returns 403 when feature flag disabled', async () => {
    if (referralFlagEnabled()) {
      expect(true).toBe(true);
      return; // skip when enabled
    }

    const { status, json } = await request('/api/admin/referrals/list', {
      headers: adminHeaders(),
    });
    expect(status).toBe(403);
    expect(json?.error).toBeDefined();
  });

  it('lists referral events with pagination and filters', async () => {
    if (!referralFlagEnabled()) {
      expect(true).toBe(true);
      return;
    }

    const { status, json } = await request(
      '/api/admin/referrals/list?limit=10&offset=0&status=verified',
      {
        headers: adminHeaders(),
      }
    );

    expect(status).toBe(200);
    expect(json?.success).toBe(true);
    expect(Array.isArray(json?.data?.events)).toBe(true);
    expect(json?.data?.filters?.status).toBe('verified');
  });
});
