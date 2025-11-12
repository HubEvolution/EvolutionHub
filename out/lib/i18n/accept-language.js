'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.parseAcceptLanguage = parseAcceptLanguage;
exports.pickBestLanguage = pickBestLanguage;
function toBaseLang(raw) {
  const base = (raw || '').trim().toLowerCase().split(';')[0]?.split(',')[0] || '';
  const lang = base.split('-')[0];
  if (lang === 'de') return 'de';
  if (lang === 'en') return 'en';
  return null;
}
function parseAcceptLanguage(header) {
  const h = (header || '').trim();
  if (!h) return [{ lang: 'de', q: 1 }];
  const parts = h.split(',');
  const map = new Map();
  for (const part of parts) {
    const seg = part.trim();
    if (!seg) continue;
    const [range, ...params] = seg.split(';').map((s) => s.trim());
    const base = toBaseLang(range);
    if (!base) continue;
    let q = 1;
    for (const p of params) {
      const m = p.match(/^q\s*=\s*([01](?:\.\d+)?)$/i);
      if (m) {
        const v = Number(m[1]);
        if (!Number.isNaN(v) && v >= 0 && v <= 1) q = v;
      }
    }
    const prev = map.get(base) ?? 0;
    if (q > prev) map.set(base, q);
  }
  if (map.size === 0) return [{ lang: 'de', q: 1 }];
  return Array.from(map.entries())
    .map(([lang, q]) => ({ lang, q }))
    .sort((a, b) => b.q - a.q);
}
function pickBestLanguage(header, fallback = 'de') {
  const arr = parseAcceptLanguage(header);
  return arr[0]?.lang ?? fallback;
}
