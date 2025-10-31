// AI Video Enhancer configuration

export type VideoTier = '720p' | '1080p';

export const AI_VIDEO_R2_PREFIX = 'ai-video';

export const ALLOWED_VIDEO_CONTENT_TYPES = [
  'video/mp4',
  'video/quicktime', // mov
  'video/webm',
] as const;

export const MAX_UPLOAD_BYTES_TIER: Readonly<Record<VideoTier, number>> = Object.freeze({
  // 720p ≤ 60s
  '720p': 250 * 1024 * 1024, // 250MB
  // 1080p ≤ 45s
  '1080p': 400 * 1024 * 1024, // 400MB
});

export const VIDEO_RETENTION_DAYS = 14;

// Credits mapping (1 Credit = $0.08)
export const TIER_CREDITS: Readonly<Record<VideoTier, number>> = Object.freeze({
  '720p': 5,
  '1080p': 8,
});

export const MAX_DURATION_SECONDS_TIER: Readonly<Record<VideoTier, number>> = Object.freeze({
  '720p': 60,
  '1080p': 45,
});
