'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.POST = void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const notification_service_1 = require('@/lib/services/notification-service');
const email_service_impl_1 = require('@/lib/services/email-service-impl');
function resolveRuntimeEnv(context) {
  const env = context.locals?.runtime?.env ?? {};
  return env;
}
function resolveDb(context) {
  const db = resolveRuntimeEnv(context).DB;
  if (!db) {
    throw new Error('DB binding missing');
  }
  return db;
}
function resolveEmailEnv(context) {
  const env = resolveRuntimeEnv(context);
  const emailEnv = {
    RESEND_API_KEY: String(env.RESEND_API_KEY || ''),
    EMAIL_FROM: String(env.EMAIL_FROM || ''),
    BASE_URL: String(env.BASE_URL || ''),
    ENVIRONMENT: typeof env.ENVIRONMENT === 'string' ? env.ENVIRONMENT : undefined,
  };
  if (!emailEnv.RESEND_API_KEY || !emailEnv.EMAIL_FROM || !emailEnv.BASE_URL) {
    throw new Error('Email environment not configured');
  }
  return emailEnv;
}
function renderTemplate(html, variables) {
  let output = html;
  for (const [key, value] of Object.entries(variables)) {
    const re = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    output = output.replace(re, String(value ?? ''));
  }
  return output;
}
function parseTemplateVariables(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // ignore malformed JSON
  }
  return {};
}
function parseLimit(search) {
  const requested = Number.parseInt(search.get('limit') ?? '10', 10);
  if (!Number.isFinite(requested) || requested <= 0) {
    return 10;
  }
  return Math.max(1, Math.min(50, requested));
}
exports.POST = (0, api_middleware_1.withAuthApiMiddleware)(
  async (context) => {
    try {
      const db = resolveDb(context);
      const emailEnv = resolveEmailEnv(context);
      const notificationService = new notification_service_1.NotificationService(db);
      const emailService = (0, email_service_impl_1.createEmailService)({
        db,
        resendApiKey: emailEnv.RESEND_API_KEY,
        fromEmail: emailEnv.EMAIL_FROM,
        baseUrl: emailEnv.BASE_URL,
        isDevelopment: emailEnv.ENVIRONMENT !== 'production',
      });
      const url = new URL(context.request.url);
      const limit = parseLimit(url.searchParams);
      const pending = await notificationService.getPendingEmails(limit);
      const results = [];
      for (const item of pending) {
        try {
          const template = await notificationService.getEmailTemplateById(item.templateId);
          const vars = parseTemplateVariables(item.variables);
          const html = renderTemplate(template.htmlContent, vars);
          const subject = renderTemplate(template.subject, vars);
          const sent = await emailService.sendEmail({
            to: [item.to],
            subject,
            html,
          });
          if (sent.success) {
            await notificationService.markEmailAsSent(item.id);
            results.push({ id: item.id, success: true });
          } else {
            const errorMessage = sent.error || 'Unknown error';
            await notificationService.markEmailAsFailed(item.id, errorMessage);
            results.push({ id: item.id, success: false, error: errorMessage });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await notificationService.markEmailAsFailed(item.id, message);
          results.push({ id: item.id, success: false, error: message });
        }
      }
      return (0, api_middleware_1.createApiSuccess)({ processed: results.length, results });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return (0, api_middleware_1.createApiError)('server_error', message);
    }
  },
  {
    requireSameOriginForUnsafeMethods: true,
    enforceCsrfToken: false,
  }
);
