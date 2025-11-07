const REFERRAL_CODE_PATTERN = /^[a-zA-Z0-9_-]{6,64}$/;

export function sanitizeReferralCode(code: unknown): string | null {
  if (typeof code !== 'string') {
    return null;
  }

  const normalized = code.trim();
  if (!REFERRAL_CODE_PATTERN.test(normalized)) {
    return null;
  }

  return normalized.toLowerCase();
}

export function hasReferralCodeSearchParam(url: URL): boolean {
  const value = url.searchParams.get('ref');
  return typeof value === 'string' && sanitizeReferralCode(value) !== null;
}
