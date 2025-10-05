import type { APIContext } from 'astro';
import { withAuthApiMiddleware, createApiError, createApiSuccess } from '@/lib/api-middleware';
import { NotificationService } from '@/lib/services/notification-service';
import { createEmailService } from '@/lib/services/email-service-impl';

function getEnv(context: APIContext): Record<string, string> {
  const env = (context.locals as unknown as { runtime?: { env?: Record<string, string> } })?.runtime
    ?.env;
  return (env || {}) as Record<string, string>;
}

function renderTemplate(html: string, variables: Record<string, any>): string {
  // Naive variable replacement {{key}}
  let output = html;
  for (const [key, value] of Object.entries(variables)) {
    const re = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    output = output.replace(re, String(value ?? ''));
  }
  return output;
}

export const POST = withAuthApiMiddleware(async (context: APIContext) => {
  try {
    const env = getEnv(context);
    const db = (context.locals as unknown as { runtime?: { env?: { DB?: D1Database } } })?.runtime
      ?.env?.DB as D1Database | undefined;

    if (!db) return createApiError('server_error', 'DB binding missing');
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.BASE_URL)
      return createApiError('server_error', 'Email environment not configured');

    const notificationService = new NotificationService(db);
    const emailService = createEmailService({
      resendApiKey: env.RESEND_API_KEY,
      fromEmail: env.EMAIL_FROM,
      baseUrl: env.BASE_URL,
      env: env as any,
      isDevelopment: process.env.NODE_ENV !== 'production',
    } as any);

    const url = new URL(context.request.url);
    const limitParam = Number(url.searchParams.get('limit') || '10');
    const limit = Math.max(1, Math.min(50, limitParam));

    const pending = await notificationService.getPendingEmails(limit);
    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const item of pending) {
      try {
        // Load template
        const template = await notificationService.getEmailTemplateById(item.templateId);
        const vars = JSON.parse(item.variables || '{}');

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
          await notificationService.markEmailAsFailed(item.id, sent.error || 'Unknown error');
          results.push({ id: item.id, success: false, error: sent.error || 'Unknown error' });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await notificationService.markEmailAsFailed(item.id, msg);
        results.push({ id: item.id, success: false, error: msg });
      }
    }

    return createApiSuccess({ processed: results.length, results });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return createApiError('server_error', msg);
  }
}, {
  // Same-origin required for POST
  requireSameOriginForUnsafeMethods: true,
  enforceCsrfToken: false,
});
