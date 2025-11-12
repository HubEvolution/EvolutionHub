'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.HEAD =
  exports.OPTIONS =
  exports.DELETE =
  exports.PATCH =
  exports.PUT =
  exports.GET =
  exports.POST =
    void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const rate_limiter_1 = require('@/lib/rate-limiter');
const validation_1 = require('@/lib/validation');
const contact_1 = require('@/lib/validation/schemas/contact');
const email_service_impl_1 = require('@/lib/services/email-service-impl');
const security_logger_1 = require('@/lib/security-logger');
const contact_2 = require('@/config/contact');
const TURNSTILE_VERIFY_ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const parseBody = async (request) => {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const json = await request.json();
      return json ?? {};
    } catch {
      return {};
    }
  }
  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    try {
      const form = await request.formData();
      const value = (name) => form.get(name) ?? undefined;
      return {
        firstName: value('firstName') ?? value('first-name'),
        lastName: value('lastName') ?? value('last-name'),
        email: value('email'),
        subject: value('subject'),
        message: value('message'),
        consent: value('consent') ?? value('privacy') ?? value('privacy-policy'),
        locale: value('locale'),
        turnstileToken: value('cf-turnstile-response') ?? value('turnstileToken'),
        source: value('source'),
      };
    } catch {
      return {};
    }
  }
  return {};
};
const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
const normalizeRecipients = (raw) => {
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};
async function verifyTurnstileToken(secret, token, request) {
  try {
    const cfConnectingIp = request.headers.get('cf-connecting-ip') || '';
    const xff = request.headers.get('x-forwarded-for') || '';
    const remoteIp = cfConnectingIp || (xff.split(',')[0] || '').trim();
    const response = await fetch(TURNSTILE_VERIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: remoteIp,
      }),
    });
    if (!response.ok) {
      return false;
    }
    const json = await response.json();
    return json?.success === true;
  } catch {
    return false;
  }
}
const handler = async (context) => {
  const { request, locals, cookies } = context;
  const runtimeEnv = locals.runtime?.env ?? {};
  const env = runtimeEnv;
  const body = await parseBody(request);
  const consentBoolean =
    typeof body.consent === 'string'
      ? body.consent === 'true' || body.consent === 'on' || body.consent === '1'
      : Boolean(body.consent);
  const parsed = contact_1.contactMessageSchema.safeParse({
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    subject: body.subject,
    message: body.message,
    consent: consentBoolean,
    locale: body.locale,
    turnstileToken: body.turnstileToken,
    source: body.source,
  });
  if (!parsed.success) {
    return (0, api_middleware_1.createApiError)('validation_error', 'Invalid request', {
      details: (0, validation_1.formatZodError)(parsed.error),
    });
  }
  const data = parsed.data;
  const turnstileSecret = env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    const valid = await verifyTurnstileToken(turnstileSecret, data.turnstileToken, request);
    if (!valid) {
      (0, security_logger_1.logMetricCounter)('contact_turnstile_failed');
      return (0, api_middleware_1.createApiError)(
        'validation_error',
        'Turnstile verification failed'
      );
    }
    (0, security_logger_1.logMetricCounter)('contact_turnstile_success');
  }
  const recipients = normalizeRecipients(env.CONTACT_RECIPIENTS);
  if (!recipients.length && contact_2.contactInfo.email) {
    recipients.push(contact_2.contactInfo.email);
  }
  if (!recipients.length) {
    return (0, api_middleware_1.createApiError)('server_error', 'No contact recipient configured');
  }
  const db = env.DB;
  if (!db) {
    return (0, api_middleware_1.createApiError)('server_error', 'Database binding missing');
  }
  const baseUrl = env.BASE_URL || new URL(request.url).origin;
  const emailService = (0, email_service_impl_1.createEmailService)({
    db,
    resendApiKey: env.RESEND_API_KEY,
    fromEmail: env.EMAIL_FROM || 'noreply@hub-evolution.com',
    baseUrl,
    isDevelopment: (env.ENVIRONMENT || '') !== 'production',
  });
  const subject = `Kontaktanfrage von ${data.firstName} ${data.lastName}`;
  const html = `
    <h2>Neue Kontaktanfrage</h2>
    <p>Quelle: ${escapeHtml(data.source ?? 'kontakt')}</p>
    <p><strong>Name:</strong> ${escapeHtml(`${data.firstName} ${data.lastName}`)}</p>
    <p><strong>E-Mail:</strong> ${escapeHtml(data.email)}</p>
    <p><strong>Betreff:</strong> ${escapeHtml(data.subject)}</p>
    <p><strong>Nachricht:</strong></p>
    <pre style="background:#f3f4f6;padding:12px;border-radius:8px;font-family:ui-monospace,monospace;white-space:pre-wrap;">
${escapeHtml(data.message)}
    </pre>
  `;
  const sendResult = await emailService.sendEmail({
    to: recipients,
    subject,
    html,
    from: env.EMAIL_FROM,
  });
  if (!sendResult.success) {
    (0, security_logger_1.logMetricCounter)('contact_send_failed');
    return (0, api_middleware_1.createApiError)(
      'server_error',
      sendResult.error || 'Failed to send message'
    );
  }
  (0, security_logger_1.logMetricCounter)('contact_send_success');
  // Leere das CSRF-Cookie nicht; optional success cookie für UI
  try {
    cookies.delete('contact_form_data', { path: '/' });
  } catch {}
  return (0, api_middleware_1.createApiSuccess)({ status: 'queued' });
};
exports.POST = (0, api_middleware_1.withApiMiddleware)(handler, {
  rateLimiter: rate_limiter_1.contactFormLimiter,
  enforceCsrfToken: true,
});
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('POST');
exports.GET = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
