#!/usr/bin/env node
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  ({ chromium } = await import('playwright-core'));
}

const BASE = process.env.TEST_BASE_URL || process.argv[2] || 'http://127.0.0.1:8787';
const PATH = process.env.ENHANCER_PATH || '/en/tools/imag-enhancer/app';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  page.on('console', (msg) => console.log('[page]', msg.text()));

  const url = `${BASE.replace(/\/$/, '')}${PATH}`;
  console.log(`[smoke] Navigating to ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const results = await page.evaluate(async () => {
    async function setupCsrf() {
      const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
      document.cookie = `csrf_token=${token}; Path=/; SameSite=Lax`;
      return token;
    }
    async function getSamplePng() {
      const r = await fetch('/favicons/apple-touch-icon.png', { cache: 'no-store' });
      if (!r.ok) throw new Error('Failed to fetch sample PNG');
      const b = await r.blob();
      return new File([b], 'sample.png', { type: b.type || 'image/png' });
    }

    // 1) usage
    const usageRes = await fetch('/api/ai-image/usage');
    const usageBody = await usageRes.json().catch(() => null);

    // 2) generate
    const token = await setupCsrf();
    const file = await getSamplePng();
    const fd = new FormData();
    fd.append('image', file);
    fd.append(
      'model',
      'nightmareai/real-esrgan:f0992969a94014d73864d08e6d9a39286868328e4263d9ce2da6fc4049d01a1a'
    );

    const genRes = await fetch('/api/ai-image/generate', {
      method: 'POST',
      headers: { 'X-CSRF-Token': token },
      body: fd,
    });
    const genBody = await genRes.json().catch(() => null);

    // 3) result fetch via R2 proxy
    let resultStatus = null,
      resultCT = null,
      resultCC = null;
    if (genBody?.success && genBody.data?.imageUrl) {
      const r = await fetch(genBody.data.imageUrl);
      resultStatus = r.status;
      resultCT = r.headers.get('content-type');
      resultCC = r.headers.get('cache-control');
    }

    return {
      usage: { status: usageRes.status, ok: !!(usageBody && usageBody.success) },
      generate: {
        status: genRes.status,
        ok: !!(genBody && genBody.success),
        hasUrl: !!genBody?.data?.imageUrl,
      },
      result: { status: resultStatus, contentType: resultCT, cacheControl: resultCC },
    };
  });

  console.log('[smoke] Results:');
  console.log(JSON.stringify(results, null, 2));

  await browser.close();

  const ok =
    results.usage.ok &&
    results.generate.ok &&
    results.generate.hasUrl &&
    results.result.status === 200 &&
    (results.result.contentType || '').startsWith('image/');
  if (!ok) process.exit(1);
})();
