import { csrfHeaders, TEST_URL, hex32 } from '../../tests/shared/http.js';

const run = async () => {
  const token = hex32();
  const jobId = `it-${hex32()}`;
  const sessionId = `sess-${hex32()}`;
  const mime = 'audio/webm';

  const blob = new Blob([new Uint8Array(2048)], { type: mime });
  const file = new File([await blob.arrayBuffer()], 'chunk.webm', { type: mime });

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

  console.log('status =', res.status);
  try { console.log('json  =', await res.json()); }
  catch { console.log('text  =', await res.text()); }
};
run().catch((e) => { console.error(e); process.exit(1); });