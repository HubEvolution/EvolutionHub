"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.POST = exports.GET = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const voice_stream_aggregator_1 = require("@/lib/services/voice-stream-aggregator");
const logger_factory_1 = require("@/server/utils/logger-factory");
function sseHeaders() {
    const h = new Headers();
    h.set('Content-Type', 'text/event-stream');
    h.set('Cache-Control', 'no-store');
    h.set('Connection', 'keep-alive');
    return h;
}
exports.GET = (0, api_middleware_1.withRedirectMiddleware)(async (context) => {
    const { request, locals } = context;
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId') || crypto.randomUUID?.() || Math.random().toString(36).slice(2);
    const env = (locals.runtime?.env ?? {});
    const log = logger_factory_1.loggerFactory.createLogger('voice-stream-api');
    if (String(env.VOICE_STREAM_SSE) !== '1') {
        try {
            log.warn('voice_stream_disabled', {
                action: 'voice_stream_disabled',
                metadata: { jobId: jobId || null },
            });
        }
        catch { }
        return (0, api_middleware_1.createApiError)('not_found', 'Streaming disabled');
    }
    const kv = env.KV_VOICE_TRANSCRIBE;
    const aggregator = new voice_stream_aggregator_1.VoiceStreamAggregator(kv);
    await aggregator.ensure(jobId);
    const encoder = new TextEncoder();
    let timer;
    const stream = new ReadableStream({
        start(controller) {
            const write = (s) => controller.enqueue(encoder.encode(s));
            // Allow quick client retry on disconnect
            write(`retry: 2000\n\n`);
            write(`event: connected\n`);
            write(`data: ${JSON.stringify({ jobId })}\n\n`);
            try {
                log.info('voice_stream_connected', {
                    action: 'voice_stream_connected',
                    metadata: { jobId },
                });
            }
            catch { }
            // Heartbeats every ~25s to keep connections alive through proxies
            timer = setInterval(() => {
                write(`:keep-alive\n\n`);
            }, 25000);
        },
        cancel() {
            if (timer)
                clearInterval(timer);
            try {
                log.debug('voice_stream_disconnected', {
                    action: 'voice_stream_disconnected',
                    metadata: { jobId },
                });
            }
            catch { }
        },
    });
    return new Response(stream, { status: 200, headers: sseHeaders() });
});
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('GET');
exports.POST = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
