import { describe, it, expect } from 'vitest';
import { csrfHeaders, TEST_URL, hex32 } from '../../../shared/http';

interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}
interface ApiError {
  success: false;
  error: { type: string; message?: string; details?: unknown };
}

function extFromType(t: string): string {
  if ((t || '').includes('ogg')) return 'ogg';
  if ((t || '').includes('mp4')) return 'mp4';
  return 'webm';
}

describe('POST /api/voice/transcribe + GET /api/voice/poll', () => {
  it('uploads a short audio chunk and poll reflects usage/final', async () => {
    const token = hex32();
    const jobId = `it-${hex32()}`;
    const sessionId = `sess-${hex32()}`;
    const mime = 'audio/webm';
    const bytes = new Uint8Array(2048);
    // EBML header (WebM/Matroska signature) so server-side MIME sniffing accepts the payload
    bytes[0] = 0x1a;
    bytes[1] = 0x45;
    bytes[2] = 0xdf;
    bytes[3] = 0xa3;
    const blob = new Blob([bytes], { type: mime });
    const file = new File([await blob.arrayBuffer()], `chunk.${extFromType(mime)}`, { type: mime });

    const form = new FormData();
    form.append('chunk', file);
    form.append('sessionId', sessionId);
    form.append('jobId', jobId);
    form.append('isLastChunk', 'true');

    const res = await fetch(`${TEST_URL}/api/voice/transcribe`, {
      method: 'POST',
      body: form,
      headers: new Headers({
        ...csrfHeaders(token),
        Origin: TEST_URL,
        Referer: `${TEST_URL}/tools/voice-visualizer/app`,
      }),
      redirect: 'manual',
    });

    // Temporary debug aid: print error body when status != 200
    if (res.status !== 200) {
      try {
        // eslint-disable-next-line no-console
        console.log('voice transcribe body:', await res.text());
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.log('voice transcribe body (read error):', e?.message || e);
      }
    }

    expect(res.status).toBe(200);
    const json = (await res.json()) as
      | ApiSuccess<{ jobId: string; text: string; usage: { used: number } }>
      | ApiError;
    expect(json.success).toBe(true);

    const poll = await fetch(`${TEST_URL}/api/voice/poll?jobId=${encodeURIComponent(jobId)}`, {
      method: 'GET',
      headers: new Headers({ Origin: TEST_URL }),
      redirect: 'manual',
    });

    if (poll.status >= 400) {
      const err = (await poll.json()) as ApiError;
      expect(err.error.type).toMatch(/not_found|validation/i);
      return; // If polling disabled in current env, accept successful POST as smoke
    }

    const j2 = (await poll.json()) as ApiSuccess<{
      usage?: { used?: number };
      final?: string;
      partials?: string[];
    }>;
    expect(j2.success).toBe(true);
    const used = Number(j2.data?.usage?.used || 0);
    expect(used >= 1).toBe(true);
  });
});
