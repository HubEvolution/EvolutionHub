'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getUsage = getUsage;
exports.postGenerate = postGenerate;
exports.postCredits = postCredits;
async function getUsage(debug = false) {
  const endpoint = `/api/ai-image/usage?t=${Date.now()}${debug ? '&debug=1' : ''}`;
  const res = await fetch(endpoint, { credentials: 'same-origin', cache: 'no-store' });
  const data = await res.json();
  return data;
}
async function postGenerate(fd, csrf, signal) {
  const res = await fetch('/api/ai-image/generate', {
    method: 'POST',
    body: fd,
    credentials: 'same-origin',
    headers: { 'X-CSRF-Token': csrf },
    signal,
  });
  if (res.status === 429) return res; // let caller handle Retry-After
  const data = await res.json();
  return data;
}
async function postCredits(pack, workspaceId, csrf) {
  return fetch('/api/billing/credits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: JSON.stringify({ pack, workspaceId }),
    credentials: 'include',
  });
}
