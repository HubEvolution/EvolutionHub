"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postTranscribeChunk = postTranscribeChunk;
exports.getVoiceUsage = getVoiceUsage;
const csrf_1 = require("@/lib/security/csrf");
async function postTranscribeChunk(blob, sessionId, lang, jobId, isLastChunk) {
    const token = (0, csrf_1.ensureCsrfToken)();
    const fd = new FormData();
    const fileName = blob.type.includes('mp4')
        ? 'chunk.mp4'
        : blob.type.includes('ogg')
            ? 'chunk.ogg'
            : blob.type.includes('webm')
                ? 'chunk.webm'
                : 'chunk.webm';
    const fallbackType = blob.type ||
        (fileName.endsWith('.mp4')
            ? 'audio/mp4'
            : fileName.endsWith('.ogg')
                ? 'audio/ogg'
                : 'audio/webm');
    const file = new File([blob], fileName, { type: fallbackType });
    fd.append('chunk', file);
    fd.append('sessionId', sessionId);
    if (lang)
        fd.append('lang', lang);
    if (jobId)
        fd.append('jobId', jobId);
    if (typeof isLastChunk === 'boolean')
        fd.append('isLastChunk', String(isLastChunk));
    const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: {
            'X-CSRF-Token': token,
        },
        body: fd,
    });
    const json = (await res.json());
    const ra = res.headers.get('Retry-After');
    return { ...json, retryAfter: ra ? parseInt(ra, 10) : undefined };
}
async function getVoiceUsage() {
    const res = await fetch('/api/voice/usage');
    return res.json();
}
