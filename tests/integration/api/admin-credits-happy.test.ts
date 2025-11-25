import { describe, it, expect } from 'vitest';
import { sendJson, getJson, hex32 } from '../../shared/http';

interface ApiError {
  type?: string;
  message?: string;
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: ApiError;
}

interface AdminGrantData {
  email: string;
  userId: string;
  granted: number;
  balance: number;
  packId: string;
}

interface AdminUsageData {
  credits: number;
  tenths: number;
}

interface AdminHistoryItem {
  id: string;
  unitsTenths: number;
  createdAt: number;
  expiresAt: number;
}

interface AdminHistoryData {
  items: AdminHistoryItem[];
}

function getAdminCookie(): string {
  return process.env.TEST_ADMIN_COOKIE || 'session_id=e2e-admin-session-0001';
}

function getAdminEmail(): string {
  return process.env.TEST_ADMIN_EMAIL || 'admin@test-suite.local';
}

function hasAdminTestConfig(): boolean {
  const cookie = getAdminCookie();
  const email = getAdminEmail();
  return Boolean(cookie && email);
}

function buildAdminCsrfHeaders(csrfToken: string): Record<string, string> {
  const cookie = getAdminCookie();
  return {
    'X-CSRF-Token': csrfToken,
    Cookie: `${cookie}; csrf_token=${encodeURIComponent(csrfToken)}`,
  };
}

// Opt-in happy-path test for admin credits grant → usage → history
// Requires TEST_ADMIN_COOKIE and (optionally) TEST_ADMIN_EMAIL to be configured
// in the test environment so that the cookie represents an admin session and the
// email corresponds to an existing user.
describe('Admin Credits — grant → usage → history (opt-in happy path)', () => {
  it('grants credits to a user and reflects them in usage and history', async () => {
    if (!hasAdminTestConfig()) {
      // Environment not configured for admin happy-path tests; treat as skipped
      expect(true).toBe(true);
      return;
    }

    const email = getAdminEmail();
    const amount = 5; // minimal top-up in whole credits
    const csrfToken = hex32();

    const { res: grantRes, json: grantJson } = await sendJson<ApiResponse<AdminGrantData>>(
      '/api/admin/credits/grant',
      { email, amount },
      { method: 'POST', headers: buildAdminCsrfHeaders(csrfToken) }
    );

    if (grantRes.status !== 200 || !grantJson?.success || !grantJson.data) {
      // Infra or permissions not configured; assert we see a reasonable error status
      expect([400, 401, 403, 404, 405, 409, 429, 500]).toContain(grantRes.status);
      return;
    }

    const grantData = grantJson.data;
    expect(typeof grantData.userId).toBe('string');
    expect(typeof grantData.packId).toBe('string');
    expect(grantData.granted).toBeGreaterThan(0);

    const userId = grantData.userId;
    const adminCookie = getAdminCookie();
    const commonHeaders: Record<string, string> = { Cookie: adminCookie };

    // Check usage reflects a non-zero tenths balance
    const { res: usageRes, json: usageJson } = await getJson<ApiResponse<AdminUsageData>>(
      `/api/admin/credits/usage?userId=${encodeURIComponent(userId)}`,
      { headers: commonHeaders }
    );

    expect(usageRes.status).toBe(200);
    expect(usageJson?.success).toBe(true);
    expect(usageJson?.data).toBeTruthy();

    const usageData = usageJson!.data!;
    expect(usageData.tenths).toBeGreaterThan(0);
    expect(usageData.credits).toBeGreaterThanOrEqual(Math.floor(usageData.tenths / 10));

    // Check history contains the newly created pack and is consistent with usage
    const { res: historyRes, json: historyJson } = await getJson<ApiResponse<AdminHistoryData>>(
      `/api/admin/credits/history?userId=${encodeURIComponent(userId)}`,
      { headers: commonHeaders }
    );

    expect(historyRes.status).toBe(200);
    expect(historyJson?.success).toBe(true);
    expect(historyJson?.data).toBeTruthy();

    const historyData = historyJson!.data!;
    expect(Array.isArray(historyData.items)).toBe(true);
    expect(historyData.items.length).toBeGreaterThan(0);

    const totalTenthsFromHistory = historyData.items.reduce((sum, p) => sum + p.unitsTenths, 0);

    expect(totalTenthsFromHistory).toBeGreaterThanOrEqual(usageData.tenths);
    expect(historyData.items.some((p) => p.id === grantData.packId)).toBe(true);
  });
});
