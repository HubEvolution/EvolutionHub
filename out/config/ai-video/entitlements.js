"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIDEO_ENTITLEMENTS = void 0;
exports.getVideoEntitlementsFor = getVideoEntitlementsFor;
const GUEST_ENTITLEMENTS = Object.freeze({
    monthlyCreditsTenths: 0,
});
exports.VIDEO_ENTITLEMENTS = Object.freeze({
    free: { monthlyCreditsTenths: 0 },
    pro: { monthlyCreditsTenths: 1000 },
    premium: { monthlyCreditsTenths: 1000 },
    enterprise: { monthlyCreditsTenths: 5000 },
});
function getVideoEntitlementsFor(ownerType, plan) {
    if (ownerType === 'guest')
        return GUEST_ENTITLEMENTS;
    const p = plan ?? 'free';
    return exports.VIDEO_ENTITLEMENTS[p];
}
