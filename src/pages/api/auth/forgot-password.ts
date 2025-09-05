import type { APIContext } from "astro";
import { Resend } from "resend";
import type { User } from "@/lib/auth-v2";
import { standardApiLimiter } from "@/lib/rate-limiter";
import {
  createSecureRedirect,
  createDeprecatedGoneHtml,
  createDeprecatedGoneJson,
} from "@/lib/response-helpers";
import { loggerFactory } from "@/server/utils/logger-factory";
import type { LogContext } from "@/config/logging";

// Logger-Instanz für Security-Events
const securityLogger = loggerFactory.createSecurityLogger();

// Hilfsfunktion für LogContext-Erstellung
const createLogContext = (
  context: APIContext,
  additionalContext?: Partial<LogContext>
): LogContext => {
  const userAgent =
    typeof context?.request?.headers?.get === "function"
      ? context.request.headers.get("user-agent") ?? ""
      : "";

  return {
    ipAddress: context.clientAddress,
    userAgent,
    requestId: crypto.randomUUID(),
    resource: "auth/forgot-password",
    action: "password_reset_attempt",
    timestamp: new Date(),
    ...additionalContext,
  };
};

// Diese API-Route sollte nicht prerendered werden, da sie Request-Header benötigt
export const prerender = false;

/**
 * POST /api/auth/forgot-password
 * Sendet eine E-Mail mit einem Passwort-Reset-Link
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 *
 * WICHTIG: Dieser Endpunkt verwendet KEINE API-Middleware, da er Redirects statt JSON zurückgibt!
 */
export const POST = async (context: APIContext) => {
  // Deprecated legacy endpoint: return 410 Gone early with security logging
  return createDeprecatedGoneHtml(context);
  // Locale aus Referer ermitteln (Fallback)
  const referer =
    typeof context?.request?.headers?.get === "function"
      ? context.request.headers.get("referer") ?? ""
      : "";
  let locale = referer.includes("/de/")
    ? "de"
    : referer.includes("/en/")
    ? "en"
    : "en";

  // Rate-Limiting anwenden
  const rateLimitResponse = await standardApiLimiter(context);
  if (rateLimitResponse) {
    securityLogger.logSecurityEvent(
      "RATE_LIMIT_EXCEEDED",
      {
        endpoint: "/api/auth/forgot-password",
        ipAddress: context.clientAddress,
      },
      createLogContext(context, { action: "rate_limit_exceeded" })
    );
    return createSecureRedirect(
      `${locale === "en" ? "/en" : ""}/forgot-password?error=TooManyRequests`
    );
  }

  try {
    const formData = await context.request.formData();
    const localeField = formData.get("locale");
    if (
      typeof localeField === "string" &&
      (localeField === "de" || localeField === "en")
    ) {
      locale = localeField;
    }
    const email = formData.get("email");

    // Validate email
    if (typeof email !== "string" || email.length < 3) {
      // Fehlgeschlagene Anfrage protokollieren
      securityLogger.logAuthFailure(
        {
          email: typeof email === "string" ? email : "unknown",
          reason: "invalid_email",
          input: typeof email === "string" ? email : null,
        },
        createLogContext(context, { action: "validation_failed" })
      );

      return createSecureRedirect(
        `${locale === "en" ? "/en" : ""}/forgot-password?error=InvalidEmail`
      );
    }

    const db = context.locals.runtime.env.DB;
    const existingUser = await db
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(email)
      .first<User>();

    if (!existingUser) {
      // We don't want to reveal if a user exists or not
      // Versuch trotzdem protokollieren, aber ohne zu viel Information preiszugeben
      securityLogger.logAuthFailure(
        {
          email: "unknown", // Wir speichern die E-Mail absichtlich nicht, um keine User-Enumeration zu ermöglichen
          reason: "password_reset_non_existent_user",
        },
        createLogContext(context, { action: "user_not_found" })
      );

      return createSecureRedirect("/auth/password-reset-sent");
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await db
      .prepare(
        "INSERT INTO password_reset_tokens (id, user_id, expires_at) VALUES (?, ?, ?)"
      )
      .bind(token, existingUser.id, Math.floor(expiresAt.getTime() / 1000))
      .run();

    // Verwende ein Fragment-Token, um das Risiko von Token-Leaks in Logs/Proxys zu reduzieren
    const resetLink = `${context.url.origin}/reset-password#token=${token}`;

    const resend = new Resend(context.locals.runtime.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Reset Your Password",
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    });

    // Erfolgreiche Passwort-Reset-Anfrage protokollieren
    securityLogger.logSecurityEvent(
      "PASSWORD_RESET",
      {
        userId: existingUser.id,
        email: email,
        ipAddress: context.clientAddress,
        action: "password_reset_requested",
      },
      createLogContext(context, {
        userId: existingUser.id,
        action: "password_reset_success",
      })
    );

    return createSecureRedirect("/auth/password-reset-sent");
  } catch (error) {
    securityLogger.logApiError(
      {
        endpoint: "/api/auth/forgot-password",
        error: error instanceof Error ? error.message : "Unknown error",
        method: "POST",
      },
      createLogContext(context, {
        action: "password_reset_error",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      })
    );

    // Generischer Serverfehler
    return createSecureRedirect(
      `${locale === "en" ? "/en" : ""}/forgot-password?error=ServerError`
    );
  }
};

// Explizite 410-Handler für nicht unterstützte Methoden (Endpoint deprecated)
const methodNotAllowed = (context: APIContext) =>
  createDeprecatedGoneJson(
    context,
    "This endpoint has been deprecated. Please migrate to the new authentication flow.",
    {
      allow: "POST",
    }
  );

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
