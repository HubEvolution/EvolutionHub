"use strict";
// AI Video Enhancer configuration
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_DURATION_SECONDS_TIER = exports.TIER_CREDITS = exports.VIDEO_RETENTION_DAYS = exports.MAX_UPLOAD_BYTES_TIER = exports.ALLOWED_VIDEO_CONTENT_TYPES = exports.AI_VIDEO_R2_PREFIX = void 0;
exports.AI_VIDEO_R2_PREFIX = 'ai-video';
exports.ALLOWED_VIDEO_CONTENT_TYPES = [
    'video/mp4',
    'video/quicktime', // mov
    'video/webm',
];
exports.MAX_UPLOAD_BYTES_TIER = Object.freeze({
    // 720p ≤ 60s
    '720p': 250 * 1024 * 1024, // 250MB
    // 1080p ≤ 45s
    '1080p': 400 * 1024 * 1024, // 400MB
});
exports.VIDEO_RETENTION_DAYS = 14;
// Credits mapping (1 Credit = $0.08)
exports.TIER_CREDITS = Object.freeze({
    '720p': 5,
    '1080p': 8,
});
exports.MAX_DURATION_SECONDS_TIER = Object.freeze({
    '720p': 60,
    '1080p': 45,
});
