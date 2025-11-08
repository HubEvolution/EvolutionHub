"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.GET = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const referral_profile_service_1 = require("@/lib/services/referral-profile-service");
const referral_summary_service_1 = require("@/lib/services/referral-summary-service");
const security_logger_1 = require("@/lib/security-logger");
function resolveRequestOrigin(context, env) {
    const { request } = context;
    const originHeader = request.headers.get('origin');
    if (originHeader) {
        try {
            return new URL(originHeader).origin;
        }
        catch {
            // ignore invalid header and fallback
        }
    }
    const referer = request.headers.get('referer');
    if (referer) {
        try {
            return new URL(referer).origin;
        }
        catch {
            // ignore invalid referer
        }
    }
    const configuredOrigin = env.APP_ORIGIN || env.PUBLIC_APP_ORIGIN;
    if (configuredOrigin) {
        try {
            return new URL(configuredOrigin).origin;
        }
        catch {
            // ignore invalid configured origin
        }
    }
    try {
        return new URL(request.url).origin;
    }
    catch {
        return 'https://localhost';
    }
}
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
    const startedAt = Date.now();
    const { locals, clientAddress } = context;
    const user = locals.user;
    if (!user || !user.id) {
        return (0, api_middleware_1.createApiError)('auth_error', 'Unauthorized');
    }
    const env = (locals.runtime?.env ?? {});
    const db = env.DB;
    if (!db) {
        return (0, api_middleware_1.createApiError)('server_error', 'Database unavailable');
    }
    const origin = resolveRequestOrigin(context, env);
    try {
        const profile = await (0, referral_profile_service_1.getOrCreateReferralProfile)(db, user.id, startedAt);
        const summary = await (0, referral_summary_service_1.getReferralSummary)(db, user.id);
        const referralLink = (0, referral_profile_service_1.buildReferralLink)(profile.referralCode, origin);
        (0, security_logger_1.logUserEvent)(user.id, 'referral_summary_requested', {
            ipAddress: clientAddress,
            referralCodeLength: profile.referralCode.length,
            totalReferrals: summary.stats.referredTotal,
        });
        const response = (0, api_middleware_1.createApiSuccess)({
            referralCode: profile.referralCode,
            referralLink,
            stats: summary.stats,
            recentEvents: summary.recentEvents,
            updatedAt: startedAt,
        });
        try {
            const duration = Date.now() - startedAt;
            response.headers.set('Server-Timing', `total;dur=${duration}`);
        }
        catch {
            // ignore header mutation errors (immutable response)
        }
        return response;
    }
    catch (error) {
        (0, security_logger_1.logUserEvent)(user.id, 'referral_summary_failed', {
            ipAddress: clientAddress,
            error: error instanceof Error ? error.message : String(error),
        });
        return (0, api_middleware_1.createApiError)('server_error', 'Unable to load referral summary');
    }
}, {
    logMetadata: { action: 'dashboard_referral_summary' },
});
exports.POST = (0, api_middleware_1.withAuthApiMiddleware)(() => (0, api_middleware_1.createMethodNotAllowed)('GET'), { disableAutoLogging: true });
