'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.sanitizeReferralCode = sanitizeReferralCode;
exports.hasReferralCodeSearchParam = hasReferralCodeSearchParam;
const REFERRAL_CODE_PATTERN = /^[a-zA-Z0-9_-]{6,64}$/;
function sanitizeReferralCode(code) {
  if (typeof code !== 'string') {
    return null;
  }
  const normalized = code.trim();
  if (!REFERRAL_CODE_PATTERN.test(normalized)) {
    return null;
  }
  return normalized.toLowerCase();
}
function hasReferralCodeSearchParam(url) {
  const value = url.searchParams.get('ref');
  return typeof value === 'string' && sanitizeReferralCode(value) !== null;
}
