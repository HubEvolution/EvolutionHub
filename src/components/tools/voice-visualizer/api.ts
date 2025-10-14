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
    jobId?: string;
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
  lang?: string,
  jobId?: string,
  isLastChunk?: boolean
): Promise<VoiceTranscribeResponse & { retryAfter?: number }> {
  const token = ensureCsrfToken();
  const fd = new FormData();
  const fileName = blob.type.includes('mp4')
    ? 'chunk.mp4'
    : blob.type.includes('ogg')
      ? 'chunk.ogg'
      : blob.type.includes('webm')
        ? 'chunk.webm'
        : 'chunk.webm';
  const fallbackType =
    blob.type ||
    (fileName.endsWith('.mp4')
      ? 'audio/mp4'
      : fileName.endsWith('.ogg')
        ? 'audio/ogg'
        : 'audio/webm');
  const file = new File([blob], fileName, { type: fallbackType });
  fd.append('chunk', file);
  fd.append('sessionId', sessionId);
  if (lang) fd.append('lang', lang);
  if (jobId) fd.append('jobId', jobId);
  if (typeof isLastChunk === 'boolean') fd.append('isLastChunk', String(isLastChunk));

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
