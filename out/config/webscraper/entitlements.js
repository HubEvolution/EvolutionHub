"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEBSCRAPER_ENTITLEMENTS = void 0;
exports.getWebscraperEntitlementsFor = getWebscraperEntitlementsFor;
const GUEST_ENTITLEMENTS = Object.freeze({
    dailyBurstCap: 5,
});
exports.WEBSCRAPER_ENTITLEMENTS = Object.freeze({
    free: { dailyBurstCap: 20 },
    pro: { dailyBurstCap: 100 },
    premium: { dailyBurstCap: 300 },
    enterprise: { dailyBurstCap: 1000 },
});
function getWebscraperEntitlementsFor(ownerType, plan) {
    if (ownerType === 'guest')
        return GUEST_ENTITLEMENTS;
    const p = plan ?? 'free';
    return exports.WEBSCRAPER_ENTITLEMENTS[p];
}
