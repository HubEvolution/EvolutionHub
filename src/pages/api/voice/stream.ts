import type { APIRoute } from 'astro';
import { withRedirectMiddleware, createApiError } from '@/lib/api-middleware';
import { VoiceStreamAggregator } from '@/lib/services/voice-stream-aggregator';

function sseHeaders(): Headers {
  const h = new Headers();
  h.set('Content-Type', 'text/event-stream');
  h.set('Cache-Control', 'no-store');
  h.set('Connection', 'keep-alive');
  return h;
}

export const GET: APIRoute = withRedirectMiddleware(async ({ request, locals }) => {
  const url = new URL(request.url);
  const jobId =
    url.searchParams.get('jobId') || crypto.randomUUID?.() || Math.random().toString(36).slice(2);

  const env = (locals as any)?.runtime?.env ?? {};
  if (String(env.VOICE_STREAM_SSE) !== '1') {
    return createApiError('not_found', 'Streaming disabled');
  }
  const kv = env.KV_VOICE_TRANSCRIBE;
  const aggregator = new VoiceStreamAggregator(kv);
  await aggregator.ensure(jobId);

  const encoder = new TextEncoder();
  let timer: any;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (s: string) => controller.enqueue(encoder.encode(s));

      // Allow quick client retry on disconnect
      write(`retry: 2000\n\n`);
      write(`event: connected\n`);
      write(`data: ${JSON.stringify({ jobId })}\n\n`);

      // Heartbeats every ~25s to keep connections alive through proxies
      timer = setInterval(() => {
        write(`:keep-alive\n\n`);
      }, 25000);
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, { status: 200, headers: sseHeaders() });
});

export const POST = undefined as unknown as APIRoute; // 405 via framework
export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;
export const OPTIONS = POST;
export const HEAD = POST;
