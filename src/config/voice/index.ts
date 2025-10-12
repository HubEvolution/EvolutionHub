import type { KVNamespace } from '@cloudflare/workers-types';

export const VOICE_ALLOWED_CONTENT_TYPES = [
  'audio/webm; codecs=opus',
  'audio/ogg; codecs=opus',
  // lenient fallbacks accepted by some browsers/providers
  'audio/webm',
  'audio/ogg',
] as const;

export const VOICE_MAX_CHUNK_BYTES = 1_200_000; // ~1.2MB per chunk (MVP)

export const VOICE_FREE_LIMIT_GUEST = 60; // chunks/day (~60s @1s cadence)
export const VOICE_FREE_LIMIT_USER = 300; // chunks/day (~5min)

export const DEFAULT_WHISPER_MODEL = 'whisper-1';

export type VoiceOwnerType = 'user' | 'guest';

export interface VoiceRuntimeEnv {
  KV_VOICE_TRANSCRIBE?: KVNamespace;
  OPENAI_API_KEY?: string;
  WHISPER_MODEL?: string;
  ENVIRONMENT?: string;
}
