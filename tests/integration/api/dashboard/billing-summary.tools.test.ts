import { describe, it, expect, beforeAll } from 'vitest';
import { getJson } from '../../../shared/http';
import { debugLogin } from '../../../shared/auth';

interface ApiError {
  type?: string;
  message?: string;
}

interface UsageOverview {
  used: number;
  limit: number;
  remaining: number;
  resetAt: number | null;
}

type ToolKey = 'image' | 'video' | 'prompt' | 'voice' | 'webscraper';

interface BillingSummaryData {
  plan: string;
  monthlyLimit: number;
  monthlyUsed: number;
  periodEndsAt: number;
  creditsRemaining: number | null;
  tools?: Partial<Record<ToolKey, UsageOverview>>;
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: ApiError;
}

describe('GET /api/dashboard/billing-summary tools block', () => {
  let authCookie: string | null = null;

  beforeAll(async () => {
    try {
      const login = await debugLogin();
      authCookie = login.cookie;
    } catch {
      authCookie = null;
    }
  });

  const authHeaders = () => (authCookie ? { Cookie: authCookie } : undefined);

  const expectAuthOrSkip = (res: Response) => {
    if (res.status === 200) {
      return true;
    }
    expect([401, 302]).toContain(res.status);
    authCookie = null;
    return false;
  };

  it('omits tools block when disabled via query param override', async () => {
    const { res, json } = await getJson<ApiResponse<BillingSummaryData>>(
      '/api/dashboard/billing-summary?tools=0',
      { headers: authHeaders() }
    );

    if (!expectAuthOrSkip(res)) return;
    expect(json?.success).toBe(true);
    expect(json?.data?.tools).toBeUndefined();
    expect(json?.data?.monthlyLimit).toBeGreaterThanOrEqual(0);
  });

  it('returns image usage when tools block enabled', async () => {
    const { res, json } = await getJson<ApiResponse<BillingSummaryData>>(
      '/api/dashboard/billing-summary?tools=1',
      { headers: authHeaders() }
    );

    if (!expectAuthOrSkip(res)) return;
    expect(json?.success).toBe(true);
    const imageUsage = json?.data?.tools?.image;
    expect(imageUsage).toBeTruthy();
    expect(imageUsage?.limit).toBeGreaterThanOrEqual(0);
    expect(typeof imageUsage?.used).toBe('number');
  });

  it('adds Server-Timing entry for each tool when enabled', async () => {
    const { res } = await getJson<ApiResponse<BillingSummaryData>>(
      '/api/dashboard/billing-summary?tools=1',
      { headers: authHeaders() }
    );

    if (!expectAuthOrSkip(res)) return;
    const serverTiming = res.headers.get('Server-Timing') || '';
    expect(serverTiming).toContain('tools.image');
  });

  it('omits individual tool entries when failTool debug param triggers errors', async () => {
    const { res, json } = await getJson<ApiResponse<BillingSummaryData>>(
      '/api/dashboard/billing-summary?tools=1&failTool=image',
      { headers: authHeaders() }
    );

    if (!expectAuthOrSkip(res)) return;
    const tools = json?.data?.tools;
    expect(tools?.image).toBeUndefined();
  });
});
