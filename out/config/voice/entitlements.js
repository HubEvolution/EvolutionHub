"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VOICE_ENTITLEMENTS = void 0;
exports.getVoiceEntitlementsFor = getVoiceEntitlementsFor;
const voice_1 = require("@/config/voice");
const GUEST_ENTITLEMENTS = Object.freeze({
    dailyBurstCap: voice_1.VOICE_FREE_LIMIT_GUEST,
});
exports.VOICE_ENTITLEMENTS = Object.freeze({
    free: { dailyBurstCap: voice_1.VOICE_FREE_LIMIT_USER },
    pro: { dailyBurstCap: 600 },
    premium: { dailyBurstCap: 1200 },
    enterprise: { dailyBurstCap: 3000 },
});
function getVoiceEntitlementsFor(ownerType, plan) {
    if (ownerType === 'guest')
        return GUEST_ENTITLEMENTS;
    const p = plan ?? 'free';
    return exports.VOICE_ENTITLEMENTS[p];
}
