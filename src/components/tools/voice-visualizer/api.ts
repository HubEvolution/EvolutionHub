import { ensureCsrfToken } from '@/lib/security/csrf';

export interface VoiceUsageInfo {
  used: number;
  limit: number;
  resetAt: number | null;
}

export interface VoiceTranscribeResponse {
  success: boolean;
  data?: {
    sessionId: string;
    text: string;
    isFinal?: boolean;
    usage: VoiceUsageInfo;
    limits: { user: number; guest: number };
  };
  error?: { type: string; message: string; details?: unknown };
}

export async function postTranscribeChunk(
  blob: Blob,
  sessionId: string,
  lang?: string
): Promise<VoiceTranscribeResponse & { retryAfter?: number }> {
  const token = ensureCsrfToken();
  const fd = new FormData();
  const fileName = blob.type.includes('ogg') ? 'chunk.ogg' : 'chunk.webm';
  const file = new File([blob], fileName, { type: blob.type || 'audio/webm' });
  fd.append('chunk', file);
  fd.append('sessionId', sessionId);
  if (lang) fd.append('lang', lang);

  const res = await fetch('/api/voice/transcribe', {
    method: 'POST',
    headers: {
      'X-CSRF-Token': token,
    },
    body: fd,
  });
  const json = (await res.json()) as VoiceTranscribeResponse;
  const ra = res.headers.get('Retry-After');
  return { ...json, retryAfter: ra ? parseInt(ra, 10) : undefined };
}

export async function getVoiceUsage(): Promise<{
  success: boolean;
  data?: {
    ownerType: 'user' | 'guest';
    usage: VoiceUsageInfo;
    limits: { user: number; guest: number };
    plan?: string;
  };
}> {
  const res = await fetch('/api/voice/usage');
  return res.json();
}
