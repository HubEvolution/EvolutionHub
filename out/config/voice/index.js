"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_WHISPER_MODEL = exports.VOICE_FREE_LIMIT_USER = exports.VOICE_FREE_LIMIT_GUEST = exports.VOICE_MIN_CHUNK_BYTES = exports.VOICE_MAX_CHUNK_BYTES = exports.VOICE_ALLOWED_CONTENT_TYPES = void 0;
exports.VOICE_ALLOWED_CONTENT_TYPES = [
    'audio/webm; codecs=opus',
    'audio/ogg; codecs=opus',
    // lenient fallbacks accepted by some browsers/providers
    'audio/webm',
    'audio/ogg',
    // MP4 container fallbacks
    'audio/mp4; codecs=mp4a.40.2',
    'audio/mp4',
];
exports.VOICE_MAX_CHUNK_BYTES = 1_200_000; // ~1.2MB per chunk (MVP)
exports.VOICE_MIN_CHUNK_BYTES = 8 * 1024; // 8KB client-side floor
exports.VOICE_FREE_LIMIT_GUEST = 60; // chunks/day (~60s @1s cadence)
exports.VOICE_FREE_LIMIT_USER = 300; // chunks/day (~5min)
exports.DEFAULT_WHISPER_MODEL = 'whisper-1';
