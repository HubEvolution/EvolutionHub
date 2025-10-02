import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { csrfHeaders, TEST_URL } from '../shared/http';

const FIX = (name: string) => join(process.cwd(), 'tests', 'fixtures', name);

describe('POST /api/prompt-enhance (multipart)', () => {
  it('accepts image/png + text and returns success', async () => {
    const form = new FormData();
    form.set('text', 'Bitte verbessere den Prompt anhand des Bildes.');
    form.set('mode', 'creative');
    const pngBuf = readFileSync(FIX('tiny.png'));
    const file = new File([new Uint8Array(pngBuf)], 'tiny.png', { type: 'image/png' });
    form.append('files[]', file);

    const res = await fetch(`${TEST_URL}/api/prompt-enhance`, {
      method: 'POST',
      body: form as any,
      headers: new Headers({ ...csrfHeaders(Math.random().toString(16).slice(2)), Origin: TEST_URL, Referer: `${TEST_URL}/tools/prompt-enhancer/app` }),
    });

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.success).toBe(true);
    expect(json.data?.enhancedPrompt).toBeTypeOf('string');
  });

  it('accepts text/plain + text and returns success', async () => {
    const form = new FormData();
    form.set('text', 'Improve this prompt using the attached notes.');
    form.set('mode', 'professional');
    const noteBuf = readFileSync(FIX('note.txt'));
    form.append('files[]', new File([new Uint8Array(noteBuf)], 'note.txt', { type: 'text/plain' }));

    const token = Math.random().toString(16).slice(2);
    const res = await fetch(`${TEST_URL}/api/prompt-enhance`, {
      method: 'POST',
      body: form as any,
      headers: new Headers({ ...csrfHeaders(token), Origin: TEST_URL, Referer: `${TEST_URL}/tools/prompt-enhancer/app` }),
    });

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.success).toBe(true);
  });

  it('rejects unsupported file type', async () => {
    const form = new FormData();
    form.set('text', 'test');
    form.set('mode', 'concise');
    const bad = new Blob(['abc'], { type: 'application/x-msdownload' });
    form.append('files[]', new File([bad], 'malware.exe', { type: 'application/x-msdownload' }));

    const token2 = Math.random().toString(16).slice(2);
    const res = await fetch(`${TEST_URL}/api/prompt-enhance`, {
      method: 'POST',
      body: form as any,
      headers: new Headers({ ...csrfHeaders(token2), Origin: TEST_URL, Referer: `${TEST_URL}/tools/prompt-enhancer/app` }),
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
    const json: any = await res.json();
    expect(json.success).toBe(false);
    expect(String(json.error?.type || '')).toMatch(/validation/i);
  });

  // NOTE: PDF path uses OpenAI file_search; running it requires OPENAI_API_KEY in the worker.
  it('optionally accepts application/pdf when OPENAI key present', async () => {
    if (!process.env.RUN_PDF_TEST) return;
    const form = new FormData();
    form.set('text', 'Use PDF content.');
    form.set('mode', 'professional');
    const pdfBuf = readFileSync(FIX('tiny.pdf'));
    form.append('files[]', new File([new Uint8Array(pdfBuf)], 'tiny.pdf', { type: 'application/pdf' }));
    const token3 = Math.random().toString(16).slice(2);
    const res = await fetch(`${TEST_URL}/api/prompt-enhance`, { method: 'POST', body: form as any, headers: new Headers({ ...csrfHeaders(token3), Origin: TEST_URL, Referer: `${TEST_URL}/tools/prompt-enhancer/app` }) });
    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.success).toBe(true);
  });
});
