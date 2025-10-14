import { test, expect } from '@playwright/test';

// Smoke: Verify SSE connects, upload a short Opus WebM chunk, then poll state
// Assumes local dev worker is started by the v2 Playwright config's global setup

test.describe('Voice Stream Smoke', () => {
  test('SSE connect, upload short speech, poll state', async ({ page, browserName }) => {
    if (browserName !== 'chromium') test.skip();
    // Navigate to root to ensure same-origin cookies and CSRF path
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(250);

    // Connect SSE and capture jobId
    const result = await page.evaluate(async () => {
      return await new Promise<{ ok: boolean; jobId?: string; error?: string }>((resolve) => {
        try {
          const es = new EventSource('/api/voice/stream');
          (window as any).__es = es;
          let done = false;
          es.addEventListener('connected', (ev) => {
            try {
              const data = JSON.parse((ev as MessageEvent).data || '{}');
              const jobId = data?.jobId || '';
              if (!done) {
                done = true;
                resolve({ ok: true, jobId });
              }
            } catch (e) {
              if (!done) {
                done = true;
                resolve({ ok: false, error: String(e) });
              }
            }
          });
          es.onerror = () => {
            if (!done) {
              done = true;
              resolve({ ok: false, error: 'sse_error' });
            }
          };
          setTimeout(() => {
            if (!done) {
              done = true;
              resolve({ ok: false, error: 'timeout' });
            }
          }, 7000);
        } catch (e) {
          resolve({ ok: false, error: String(e) });
        }
      });
    });

    expect(result.ok).toBeTruthy();
    expect(result.jobId).toBeTruthy();
    const jobId = result.jobId!;

    // Set CSRF cookie and header token
    const csrf = 'e2e-csrf-token-voice';
    await page.context().addCookies([
      {
        name: 'csrf_token',
        value: csrf,
        url: page.url().startsWith('http') ? new URL(page.url()).origin : 'http://localhost:8787',
      },
    ]);

    // Build a short valid Opus WebM blob using WebAudio + MediaRecorder
    // Avoids permission prompts (no getUserMedia): we render to MediaStreamDestination
    const uploadRes = await page.evaluate(
      async ({ jobId, csrf }) => {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        const ctx = new AC();
        const dest = ctx.createMediaStreamDestination();
        const osc = ctx.createOscillator();
        osc.frequency.value = 440;
        osc.connect(dest);

        const mime = 'audio/webm;codecs=opus';
        const chunks: BlobPart[] = [];
        const rec = new MediaRecorder(dest.stream, { mimeType: mime });
        await new Promise<void>((resolve) => {
          rec.ondataavailable = (e) => {
            if (e.data && e.data.size) chunks.push(e.data);
          };
          rec.onstop = () => resolve();
          rec.start(100);
          osc.start();
          setTimeout(() => {
            osc.stop();
          }, 900);
          setTimeout(() => {
            try {
              rec.stop();
            } catch {}
          }, 1200);
        });

        const blob = new Blob(chunks, { type: mime });
        const fd = new FormData();
        const file = new File([blob], 'chunk.webm', { type: mime });
        fd.append('chunk', file);
        fd.append('sessionId', 'e2e-speech');
        fd.append('jobId', jobId);
        fd.append('isLastChunk', 'true');

        const res = await fetch('/api/voice/transcribe', {
          method: 'POST',
          headers: { 'X-CSRF-Token': csrf },
          body: fd,
        });
        let body: any = null;
        try {
          body = await res.json();
        } catch {}
        return { ok: res.ok, status: res.status, body };
      },
      { jobId, csrf }
    );

    expect(uploadRes.ok).toBeTruthy();
    expect(uploadRes.status).toBe(200);

    // Poll current state
    const poll = await page.evaluate(async (jobId: string) => {
      const res = await fetch(`/api/voice/poll?jobId=${encodeURIComponent(jobId)}`);
      let body: any = null;
      try {
        body = await res.json();
      } catch {}
      return { ok: res.ok, status: res.status, body };
    }, jobId);

    expect(poll.ok).toBeTruthy();
    expect(poll.status).toBe(200);
    expect(poll.body?.success).toBe(true);
    // usage.used should be >= 1 after upload
    const used = poll.body?.data?.usage?.used;
    expect(typeof used === 'number' && used >= 1).toBeTruthy();
  });
});
