import type { ApiErrorBody, ApiSuccess, GenerateResponseData, UsageResponseData } from './types';

export async function getUsage(
  debug: boolean = false
): Promise<ApiSuccess<UsageResponseData> | ApiErrorBody> {
  const endpoint = `/api/ai-image/usage?t=${Date.now()}${debug ? '&debug=1' : ''}`;
  const res = await fetch(endpoint, { credentials: 'same-origin', cache: 'no-store' });
  const data = (await res.json()) as ApiSuccess<UsageResponseData> | ApiErrorBody;
  return data;
}

export async function postGenerate(
  fd: FormData,
  csrf: string,
  signal?: AbortSignal
): Promise<ApiSuccess<GenerateResponseData> | ApiErrorBody | Response> {
  const res = await fetch('/api/ai-image/generate', {
    method: 'POST',
    body: fd,
    credentials: 'same-origin',
    headers: { 'X-CSRF-Token': csrf },
    signal,
  });
  if (res.status === 429) return res; // let caller handle Retry-After
  const data = (await res.json()) as ApiSuccess<GenerateResponseData> | ApiErrorBody;
  return data;
}

export async function postCredits(
  pack: number,
  workspaceId: string,
  csrf: string
): Promise<Response> {
  return fetch('/api/billing/credits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: JSON.stringify({ pack, workspaceId }),
    credentials: 'include',
  });
}
