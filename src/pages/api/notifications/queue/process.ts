import type { APIContext } from 'astro';
import { withAuthApiMiddleware, createApiError, createApiSuccess } from '@/lib/api-middleware';
import { NotificationService } from '@/lib/services/notification-service';
import { createEmailService } from '@/lib/services/email-service-impl';
import type { TemplateVariables } from '@/lib/types/notifications';

interface EmailQueueEnv {
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
  BASE_URL: string;
  ENVIRONMENT?: string;
}

interface QueueResultItem {
  id: string;
  success: boolean;
  error?: string;
}

function resolveRuntimeEnv(context: APIContext): Record<string, unknown> {
  const env =
    (context.locals as { runtime?: { env?: Record<string, unknown> } })?.runtime?.env ?? {};
  return env;
}

function resolveDb(context: APIContext): D1Database {
  const db = resolveRuntimeEnv(context).DB as D1Database | undefined;
  if (!db) {
    throw new Error('DB binding missing');
  }
  return db;
}

function resolveEmailEnv(context: APIContext): EmailQueueEnv {
  const env = resolveRuntimeEnv(context);
  const emailEnv: EmailQueueEnv = {
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

function renderTemplate(html: string, variables: TemplateVariables): string {
  let output = html;
  for (const [key, value] of Object.entries(variables)) {
    const re = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    output = output.replace(re, String(value ?? ''));
  }
  return output;
}

function parseTemplateVariables(raw: string | null | undefined): TemplateVariables {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as TemplateVariables;
    }
  } catch {
    // ignore malformed JSON
  }
  return {};
}

function parseLimit(search: URLSearchParams): number {
  const requested = Number.parseInt(search.get('limit') ?? '10', 10);
  if (!Number.isFinite(requested) || requested <= 0) {
    return 10;
  }
  return Math.max(1, Math.min(50, requested));
}

export const POST = withAuthApiMiddleware(
  async (context: APIContext) => {
    try {
      const db = resolveDb(context);
      const emailEnv = resolveEmailEnv(context);

      const notificationService = new NotificationService(db);
      const emailService = createEmailService({
        db,
        resendApiKey: emailEnv.RESEND_API_KEY,
        fromEmail: emailEnv.EMAIL_FROM,
        baseUrl: emailEnv.BASE_URL,
        isDevelopment: emailEnv.ENVIRONMENT !== 'production',
      });

      const url = new URL(context.request.url);
      const limit = parseLimit(url.searchParams);

      const pending = await notificationService.getPendingEmails(limit);
      const results: QueueResultItem[] = [];

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

      return createApiSuccess({ processed: results.length, results });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createApiError('server_error', message);
    }
  },
  {
    requireSameOriginForUnsafeMethods: true,
    enforceCsrfToken: false,
  }
);
