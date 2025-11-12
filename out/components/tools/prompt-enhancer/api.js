'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getUsage = getUsage;
exports.postEnhance = postEnhance;
async function getUsage(debug = false) {
  const endpoint = `/api/prompt/usage?t=${Date.now()}${debug ? '&debug=1' : ''}`;
  const res = await fetch(endpoint, { credentials: 'same-origin', cache: 'no-store' });
  const data = await res.json();
  return data;
}
async function postEnhance(text, mode, csrf, signal, files) {
  const hasFiles = Array.isArray(files) && files.length > 0;
  let res;
  if (hasFiles) {
    const form = new FormData();
    form.set('text', text);
    form.set('mode', mode);
    for (const f of files) form.append('files[]', f, f.name);
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
  const data = await res.json();
  return data;
}
