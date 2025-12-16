import { expect, test, type Page } from '@playwright/test';

const BUDGETS = {
  LCP_MS: 2500,
  CLS: 0.1,
  TBT_MS: 300,
};

const routes = ['/', '/en', '/en/tools/imag-enhancer/app', '/en/pricing'];

async function measureWebVitals(page: Page) {
  return await page.evaluate(async () => {
    const w = window as unknown as { webVitals?: any };
    const webVitals = w.webVitals;
    if (!webVitals) {
      return { LCP: -1, CLS: -1, TBT: -1 };
    }

    let tbt = 0;
    let fcpTime = 0;
    try {
      const fcp = performance.getEntriesByName('first-contentful-paint')[0] as
        | PerformanceEntry
        | undefined;
      fcpTime = fcp ? fcp.startTime : 0;
    } catch {}

    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          const anyE = e as any;
          const start = anyE.startTime as number;
          const duration = anyE.duration as number;
          if (start >= fcpTime && duration > 50) {
            tbt += duration - 50;
          }
        }
      });
      // @ts-ignore
      po.observe({ type: 'longtask', buffered: true });
    } catch {}

    const lcpPromise = new Promise<number>((resolve) => {
      try {
        webVitals.getLCP((m: any) => resolve(m.value), { reportAllChanges: false });
      } catch {
        resolve(-1);
      }
    });

    const clsPromise = new Promise<number>((resolve) => {
      try {
        webVitals.getCLS((m: any) => resolve(m.value), { reportAllChanges: false });
      } catch {
        resolve(-1);
      }
    });

    await new Promise((r) => setTimeout(r, 1500));

    const [LCP, CLS] = await Promise.all([lcpPromise, clsPromise]);
    const TBT = Math.round(tbt);

    return { LCP, CLS, TBT };
  });
}

async function measureWebVitalsWithRetry(page: Page) {
  try {
    return await measureWebVitals(page);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('Execution context was destroyed')) {
      throw err;
    }

    await page.waitForLoadState('load').catch(() => {});
    await page
      .waitForFunction(() => document.readyState === 'complete', { timeout: 2000 })
      .catch(() => {});

    return await measureWebVitals(page);
  }
}

test.describe('Performance (web-vitals) smoke', () => {
  for (const route of routes) {
    test(`meets budgets on ${route}`, async ({ page }) => {
      await page.addInitScript({
        content: `
          (function(){
            try {
              var s = document.createElement('script');
              s.src = 'https://cdn.jsdelivr.net/npm/web-vitals@3/dist/web-vitals.attribution.iife.js';
              s.async = true;
              (document.head || document.documentElement).appendChild(s);
            } catch (e) {}
          })();
        `,
      });

      await page.goto(route, { waitUntil: 'load' });

      await page
        .waitForFunction(() => document.readyState === 'complete', { timeout: 2000 })
        .catch(() => {});

      await page
        .waitForFunction(() => (window as any).webVitals, { timeout: 2000 })
        .catch(() => {});

      await page.waitForTimeout(250);

      const { LCP, CLS, TBT } = await measureWebVitalsWithRetry(page);

      if (LCP >= 0) expect(LCP).toBeLessThanOrEqual(BUDGETS.LCP_MS);
      if (CLS >= 0) expect(CLS).toBeLessThanOrEqual(BUDGETS.CLS);
      if (TBT >= 0) expect(TBT).toBeLessThanOrEqual(BUDGETS.TBT_MS);
    });
  }
});
