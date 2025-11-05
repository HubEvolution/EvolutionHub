"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitPromptEnhancerStarted = emitPromptEnhancerStarted;
exports.emitPromptEnhancerSucceeded = emitPromptEnhancerSucceeded;
exports.emitPromptEnhancerFailed = emitPromptEnhancerFailed;
exports.emitPromptEnhancerCtaUpgradeClick = emitPromptEnhancerCtaUpgradeClick;
const csrf_1 = require("../security/csrf");
// Feature flag must gate all telemetry
const TELEMETRY_FLAG = (import.meta.env.PUBLIC_PROMPT_TELEMETRY_V1 || 'false');
async function postTelemetry(eventName, props) {
    if (TELEMETRY_FLAG === 'false')
        return; // gated off
    try {
        const body = {
            eventName,
            ts: Date.now(),
            context: { tool: 'prompt-enhancer' },
            props,
        };
        const csrf = (0, csrf_1.ensureCsrfToken)();
        await fetch('/api/telemetry', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrf,
            },
            body: JSON.stringify(body),
        }).catch(() => undefined);
    }
    catch {
        // swallow telemetry errors
    }
}
function emitPromptEnhancerStarted(props) {
    return postTelemetry('prompt_enhance_started', props);
}
function emitPromptEnhancerSucceeded(props) {
    return postTelemetry('prompt_enhance_succeeded', props);
}
function emitPromptEnhancerFailed(props) {
    return postTelemetry('prompt_enhance_failed', props);
}
function emitPromptEnhancerCtaUpgradeClick() {
    return postTelemetry('prompt_enhance_cta_upgrade_click', {});
}
