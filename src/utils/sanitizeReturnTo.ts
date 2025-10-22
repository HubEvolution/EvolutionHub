export function sanitizeReturnTo(val: unknown): string {
  try {
    if (typeof val !== 'string') return '';
    if (!val || val.length > 512) return '';
    if (val.includes('\\') || /\r|\n/.test(val)) return '';
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(val)) return '';
    if (val.startsWith('//')) return '';
    if (!val.startsWith('/')) return '';
    return val;
  } catch {
    return '';
  }
}
