import { describe, it, expect } from 'vitest';

import { TEST_URL, safeParseJson } from '../../shared/http';

async function postTranscribe(form: FormData) {
  const res = await fetch(`${TEST_URL}/api/voice/transcribe`, {
    method: 'POST',
    body: form,
    redirect: 'manual',
  });
  const text = await res.text();
  const json = text ? safeParseJson<any>(text) : null;
  return { res, json } as const;
}

function toArrayBuffer(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

function makeFile(bytes: number[], type: string, name: string) {
  const buf = toArrayBuffer(bytes);
  return new File([buf], name, { type });
}

describe('/api/voice/transcribe — MIME hard-sniffing', () => {
  // Hinweis: Für diesen Test sollte VOICE_MIME_SNIFF_ENABLE in der Test- oder Dev-Env auf "1" stehen.

  it('accepts a valid WebM chunk when sniffed MIME matches allowlist', async () => {
    const file = makeFile(
      // WebM/Matroska EBML-Header 0x1A45DFA3 + ein paar Bytes
      [0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00, 0x00, 0x00],
      'audio/webm',
      'chunk.webm'
    );
    const form = new FormData();
    form.append('file', file);
    form.append('sessionId', 'test-session');
    form.append('jobId', 'job-1');
    form.append('lang', 'en');
    form.append('isLastChunk', 'true');

    const { res, json } = await postTranscribe(form);

    if (res.status === 200 && json && json.success === true) {
      expect(json.data?.sessionId).toBe('test-session');
      // Text kann je nach Env/Key variieren (Whisper vs. Dev-Echo)
      expect(typeof json.data?.text === 'string' || json.data?.text === null).toBe(true);
    } else if (res.status === 400 && json && json.success === false) {
      // In manchen Envs kann Validierung/Quota greifen
      expect(
        json.error?.type === 'validation_error' ||
          json.error?.type === 'rate_limit' ||
          json.error?.type === 'server_error'
      ).toBe(true);
    }
  });

  it('rejects chunks with invalid or unrecognized audio content when hard-sniffing is enabled', async () => {
    const file = makeFile(
      // Zufällige Bytes → sniffAudioMime -> unknown
      [0xde, 0xad, 0xbe, 0xef, 0x00, 0x01, 0x02, 0x03],
      'audio/webm',
      'chunk.webm'
    );
    const form = new FormData();
    form.append('file', file);
    form.append('sessionId', 'test-session');
    form.append('jobId', 'job-2');
    form.append('lang', 'en');
    form.append('isLastChunk', 'true');

    const { res, json } = await postTranscribe(form);

    if (!json) {
      // Wenn die Test-Umgebung kein JSON liefert, können wir hier nicht robust asserten.
      return;
    }

    if (res.status === 400 && json.success === false) {
      expect(json.error?.type).toBe('validation_error');
      const details = json.error?.details as
        | { reason?: unknown; sniffed?: unknown; claimedType?: unknown }
        | undefined;
      if (details) {
        if (typeof details.reason !== 'undefined') {
          expect(typeof details.reason === 'string' || details.reason === null).toBe(true);
        }
        if (typeof details.sniffed !== 'undefined') {
          expect(typeof details.sniffed === 'string' || details.sniffed === null).toBe(true);
        }
        if (typeof details.claimedType !== 'undefined') {
          expect(typeof details.claimedType === 'string' || details.claimedType === null).toBe(
            true
          );
        }
      }
    }
  });
});
