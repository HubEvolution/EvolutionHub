import { describe, it, expect } from 'vitest';
import { TEST_URL } from '../../shared/http';

async function get(path: string, headers: Record<string, string> = {}) {
  const res = await fetch(`${TEST_URL}${path}`, {
    method: 'GET',
    redirect: 'manual',
    headers: { Origin: TEST_URL, ...headers },
  });
  return res;
}

describe('R2 AI Proxy route (/r2-ai/[...path])', () => {
  it('returns 403 for results path when requester is not the owner (guest)', async () => {
    // Owner in path is a different guest id; middleware will assign a distinct guest_id cookie
    const res = await get('/r2-ai/ai-enhancer/results/guest/someone-else/any.png');
    expect(res.status).toBe(403);
  });

  it('returns 404 for invalid key prefix (not starting with ai-enhancer/)', async () => {
    const res = await get('/r2-ai/not-allowed/prefix.png');
    expect(res.status).toBe(404);
  });

  it('allows owner for results path (guest) and proceeds to bucket lookup (404 if not found)', async () => {
    const ownerId = 'test-guest-owner';
    const cookie = `guest_id=${encodeURIComponent(ownerId)}`;
    const res = await get(`/r2-ai/ai-enhancer/results/guest/${ownerId}/nonexistent.png`, {
      Cookie: cookie,
    });
    // Owner gate should pass; since object likely does not exist, expect 404 (not 403)
    expect(res.status).toBe(404);
  });
});
