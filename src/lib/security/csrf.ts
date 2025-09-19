export function ensureCsrfToken(): string {
  try {
    const cookie = document.cookie || '';
    const m = cookie.match(/(?:^|; )csrf_token=([^;]+)/);
    if (m && m[1]) return decodeURIComponent(m[1]);
    const buf = new Uint8Array(16);
    (globalThis.crypto || window.crypto).getRandomValues(buf);
    const token = Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
    const attrs = [
      'Path=/',
      'SameSite=Lax',
      (typeof location !== 'undefined' && location.protocol === 'https:') ? 'Secure' : ''
    ].filter(Boolean).join('; ');
    document.cookie = `csrf_token=${encodeURIComponent(token)}; ${attrs}`;
    return token;
  } catch {
    return '';
  }
}
