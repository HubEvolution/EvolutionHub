import type { APIContext } from 'astro';
import {
  withApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { contactFormLimiter } from '@/lib/rate-limiter';
import { formatZodError } from '@/lib/validation';
import { contactMessageSchema } from '@/lib/validation';
import { createEmailService } from '@/lib/services/email-service-impl';
import { logMetricCounter } from '@/lib/security-logger';
import { contactInfo } from '@/config/contact';

const TURNSTILE_VERIFY_ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type ContactEnv = {
  DB: import('@cloudflare/workers-types').D1Database;
  RESEND_API_KEY: string;
  EMAIL_FROM?: string;
  BASE_URL?: string;
  CONTACT_RECIPIENTS?: string;
  TURNSTILE_SECRET_KEY?: string;
  ENVIRONMENT?: string;
};

interface ParsedBody {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  consent?: unknown;
  locale?: unknown;
  turnstileToken?: unknown;
  source?: unknown;
}

const parseBody = async (request: Request): Promise<ParsedBody> => {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const json = (await request.json()) as ParsedBody;
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
      const value = (name: string) => form.get(name) ?? undefined;
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

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeRecipients = (raw: string | undefined): string[] => {
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

async function verifyTurnstileToken(
  secret: string,
  token: string,
  request: Request
): Promise<boolean> {
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

    const json = (await response.json()) as { success?: boolean };
    return json?.success === true;
  } catch {
    return false;
  }
}

const handler = async (context: APIContext) => {
  const { request, locals, cookies } = context;
  const runtimeEnv = (locals.runtime?.env ?? {}) as Partial<ContactEnv>;
  const env = runtimeEnv as ContactEnv;

  const body = await parseBody(request);
  const consentBoolean =
    typeof body.consent === 'string'
      ? body.consent === 'true' || body.consent === 'on' || body.consent === '1'
      : Boolean(body.consent);

  const parsed = contactMessageSchema.safeParse({
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
    return createApiError('validation_error', 'Invalid request', {
      details: formatZodError(parsed.error),
    });
  }

  const data = parsed.data;

  const turnstileSecret = env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    const valid = await verifyTurnstileToken(turnstileSecret, data.turnstileToken, request);
    if (!valid) {
      logMetricCounter('contact_turnstile_failed');
      return createApiError('validation_error', 'Turnstile verification failed');
    }
    logMetricCounter('contact_turnstile_success');
  }

  const recipients = normalizeRecipients(env.CONTACT_RECIPIENTS);
  if (!recipients.length && contactInfo.email) {
    recipients.push(contactInfo.email);
  }
  if (!recipients.length) {
    return createApiError('server_error', 'No contact recipient configured');
  }

  const db = env.DB;
  if (!db) {
    return createApiError('server_error', 'Database binding missing');
  }

  const baseUrl = env.BASE_URL || new URL(request.url).origin;
  const emailService = createEmailService({
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
    logMetricCounter('contact_send_failed');
    return createApiError('server_error', sendResult.error || 'Failed to send message');
  }

  logMetricCounter('contact_send_success');

  // Leere das CSRF-Cookie nicht; optional success cookie für UI
  try {
    cookies.delete('contact_form_data', { path: '/' });
  } catch {}

  return createApiSuccess({ status: 'queued' });
};

export const POST = withApiMiddleware(handler, {
  rateLimiter: contactFormLimiter,
  enforceCsrfToken: true,
});

const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
