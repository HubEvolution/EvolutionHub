import type { ApiErrorBody, ApiSuccess, EnhanceResponseData, UsageResponseData } from './types';

export async function getUsage(
  debug: boolean = false
): Promise<ApiSuccess<UsageResponseData> | ApiErrorBody> {
  const endpoint = `/api/prompt/usage?t=${Date.now()}${debug ? '&debug=1' : ''}`;
  const res = await fetch(endpoint, { credentials: 'same-origin', cache: 'no-store' });
  const data = (await res.json()) as ApiSuccess<UsageResponseData> | ApiErrorBody;
  return data;
}

export async function postEnhance(
  text: string,
  mode: string,
  csrf: string,
  signal?: AbortSignal,
  files?: File[]
): Promise<ApiSuccess<EnhanceResponseData> | ApiErrorBody | Response> {
  const hasFiles = Array.isArray(files) && files.length > 0;
  let res: Response;
  if (hasFiles) {
    const form = new FormData();
    form.set('text', text);
    form.set('mode', mode);
    for (const f of files!) form.append('files[]', f, f.name);
    res = await fetch('/api/prompt-enhance', {
      method: 'POST',
      body: form,
      credentials: 'same-origin',
      headers: { 'X-CSRF-Token': csrf },
      signal,
    });
  } else {
    res = await fetch('/api/prompt-enhance', {
      method: 'POST',
      body: JSON.stringify({ text, mode }),
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf,
      },
      signal,
    });
  }
  if (res.status === 429) return res; // let caller handle Retry-After
  const data = (await res.json()) as ApiSuccess<EnhanceResponseData> | ApiErrorBody;
  return data;
}
