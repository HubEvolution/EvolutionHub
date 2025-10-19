export function sanitizeUiLabel(input?: string, fallback?: string): string {
  if (!input) return fallback ?? '';
  const trimmed = input.trim();
  // Treat i18n fallback tokens like "[de:...fallback_not_found]" as invalid
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) return fallback ?? '';
  if (/fallback_not_found/i.test(trimmed)) return fallback ?? '';
  return trimmed;
}
