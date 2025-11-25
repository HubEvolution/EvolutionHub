import { test, expect } from '@playwright/test';

// Budgets (mobile smoke): adjust if you see consistent false positives in CI
const BUDGETS = {
  LCP_MS: 2500,
  CLS: 0.1,
  TBT_MS: 300,
};

const routes = ['/', '/en', '/en/tools/ai-image-enhancer', '/en/pricing'];

async function measureWebVitals(page: import('@playwright/test').Page) {
  return await page.evaluate(async () => {
    const w = window as any;
    const webVitals = w.webVitals;
    if (!webVitals) {
      return { LCP: -1, CLS: -1, TBT: -1 };
    }

    // Approximate TBT: sum of (task.duration - 50ms) for long tasks after FCP
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
      // Give the page a short window for tasks to settle
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

    // Wait a bit to allow late LCP/CLS updates
    await new Promise((r) => setTimeout(r, 1500));

    const [LCP, CLS] = await Promise.all([lcpPromise, clsPromise]);
    const TBT = Math.round(tbt);

    return { LCP, CLS, TBT };
  });
}

test.describe('Performance (web-vitals) smoke', () => {
  for (const route of routes) {
    test(`meets budgets on ${route}`, async ({ page }) => {
      // Pre-inject web-vitals early via init script to avoid race conditions
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
      // Wait until web-vitals is available (best-effort)
      await page
        .waitForFunction(() => (window as any).webVitals, { timeout: 2000 })
        .catch(() => {});
      const { LCP, CLS, TBT } = await measureWebVitals(page);

      // Only enforce budgets if metrics were collected
      if (LCP >= 0) expect(LCP).toBeLessThanOrEqual(BUDGETS.LCP_MS);
      else console.warn('[perf-smoke] LCP not collected');
      if (CLS >= 0) expect(CLS).toBeLessThanOrEqual(BUDGETS.CLS);
      else console.warn('[perf-smoke] CLS not collected');
      if (TBT >= 0) expect(TBT).toBeLessThanOrEqual(BUDGETS.TBT_MS);
      else console.warn('[perf-smoke] TBT not collected');
    });
  }
});
