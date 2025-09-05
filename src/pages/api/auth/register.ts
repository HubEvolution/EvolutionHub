import type { APIContext } from "astro";
import { authLimiter } from "@/lib/rate-limiter";
import { createSecureRedirect, createDeprecatedGoneHtml, createDeprecatedGoneJson } from '@/lib/response-helpers';
import {
  createValidator,
  ValidationRules,
  type ValidationSchema,
} from "@/lib/validators";
import { createAuthService } from "@/lib/services/auth-service-impl";
import { ServiceError, ServiceErrorType } from "@/lib/services/types";
import { handleAuthError } from "@/lib/error-handler";
import {
  createEmailService,
  type EmailServiceDependencies,
} from "@/lib/services/email-service-impl";
import { createEmailVerificationToken } from "@/pages/api/auth/verify-email";
import { loggerFactory } from "@/server/utils/logger-factory";
import { type LogContext } from "@/config/logging";
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
    resource: "auth/register",
    action: "user_registration",
    timestamp: new Date(),
    ...additionalContext,
  };
};

// Interface für Registrierungsdaten mit strikter Typisierung
interface RegisterData {
  email: string;
  password: string;
  name: string;
  username: string;
}

// Validierungsschema für Registrierungsdaten
const registerSchema: ValidationSchema<RegisterData> = {
  email: {
    required: true,
    type: "string",
    rules: [
      ValidationRules.string.email(),
      ValidationRules.string.maxLength(255),
    ],
  },
  password: {
    required: true,
    type: "string",
    rules: [
      ValidationRules.string.minLength(6),
      ValidationRules.string.maxLength(100),
    ],
  },
  name: {
    required: true,
    type: "string",
    rules: [
      ValidationRules.string.minLength(2),
      ValidationRules.string.maxLength(100),
    ],
  },
  username: {
    required: true,
    type: "string",
    rules: [
      ValidationRules.string.minLength(3),
      ValidationRules.string.maxLength(50),
      ValidationRules.string.pattern(
        /^[a-zA-Z0-9_-]+$/,
        "Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Bindestriche enthalten"
      ),
    ],
  },
};

// Register-Validator erstellen
const registerValidator = createValidator<RegisterData>(registerSchema);

/**
 * POST /api/auth/register
 * Registriert einen neuen Benutzer und triggert E-Mail-Verifikation (keine Session bei Registrierung)
 *
 * Features:
 * - Verwendung der Service-Layer für Geschäftslogik
 * - Strikte Typisierung und Validierung der Eingabedaten
 * - Rate-Limiting zum Schutz vor Brute-Force-Angriffen
 * - Security-Headers gegen XSS und andere Angriffe
 * - Umfassendes Audit-Logging für Sicherheitsanalysen
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
  const rateLimitResponse = await authLimiter(context);
  if (rateLimitResponse) {
    return createSecureRedirect(`/${locale}/register?error=TooManyRequests`);
  }

  try {
    // Datenvalidierung mit dem Schema-Validator
    let registerData: RegisterData;

    try {
      const formData = await context.request.formData();
      const localeField = formData.get("locale");
      if (
        typeof localeField === "string" &&
        (localeField === "de" || localeField === "en")
      ) {
        locale = localeField;
      }
      const data: Record<string, unknown> = {};

      // FormData in ein Objekt konvertieren
      for (const [key, value] of formData.entries()) {
        data[key] = value;
      }

      // Validierung durchführen und getypte Daten erhalten
      registerData = registerValidator.validateOrThrow(data);
    } catch (validationError) {
      securityLogger.logApiError(
        {
          error: "Register validation error",
          details: validationError,
          endpoint: "/api/auth/register",
          method: "POST",
        },
        createLogContext(context, { action: "validation_failed" })
      );
      throw ServiceError.validation("Die eingegebenen Daten sind ungültig", {
        validationErrors: "Formatierungsfehler",
      });
    }

    if (!context.locals.runtime) {
      const error = new Error(
        "Runtime environment is not available. Are you running in a Cloudflare environment?"
      );
      securityLogger.logApiError(
        {
          error: "Runtime environment not available",
          details: error,
          endpoint: "/api/auth/register",
          method: "POST",
        },
        createLogContext(context, { action: "runtime_error" })
      );
      throw error;
    }

    // AuthService erstellen
    const authService = createAuthService({
      db: context.locals.runtime.env.DB,
      isDevelopment: import.meta.env.DEV,
    });

    // Registrierung durchführen mit Service-Layer (ohne Session)
    const authResult = await authService.register(
      {
        email: registerData.email,
        password: registerData.password,
        name: registerData.name,
        username: registerData.username,
      },
      context.clientAddress
    );

    // E-Mail-Verifikation auslösen (non-blocking), inklusive locale in URL
    try {
      const db = context.locals.runtime.env.DB;
      const userId = authResult.user.id;
      const email = authResult.user.email;

      // Neuen Verifikations-Token erstellen (löscht alte Tokens intern)
      const token = await createEmailVerificationToken(db, userId, email);

      const verificationUrl = `${
        context.url.origin
      }/api/auth/verify-email?token=${encodeURIComponent(
        token
      )}&email=${encodeURIComponent(email)}&locale=${encodeURIComponent(
        locale
      )}`;

      // E-Mail-Service konfigurieren
      const deps: EmailServiceDependencies = {
        db,
        isDevelopment: import.meta.env.DEV,
        resendApiKey: context.locals.runtime.env.RESEND_API_KEY || "",
        fromEmail:
          context.locals.runtime.env.EMAIL_FROM ||
          "EvolutionHub <noreply@hub-evolution.com>",
        baseUrl: context.url.origin,
      };

      // Staging-Hinweis, falls RESEND_API_KEY fehlt
      try {
        const envName = context?.locals?.runtime?.env?.ENVIRONMENT || "";
        if (envName === "staging" && !deps.resendApiKey) {
          securityLogger.logSecurityEvent(
            "CONFIG_WARNING",
            {
              message: "RESEND_API_KEY fehlt in staging",
              environment: "staging",
              impact: "Verifikationsmail kann nicht gesendet werden",
            },
            createLogContext(context, { action: "email_config_check" })
          );
        }
      } catch (e) {
        // Avoid empty catch (ESLint: no-empty); dev-only noise
        if (import.meta.env?.DEV) {
          securityLogger.logSecurityEvent(
            "CONFIG_CHECK_ERROR",
            {
              message: "RESEND_API_KEY check failed",
              error: e,
              environment: "staging",
            },
            createLogContext(context, { action: "email_config_check_error" })
          );
        }
      }

      const emailService = createEmailService(deps);

      // Verifikations-E-Mail senden (Fehler nicht blockierend)
      emailService
        .sendVerificationEmail({
          email,
          verificationUrl,
          userName:
            authResult.user.name || authResult.user.username || undefined,
        })
        .then((res) => {
          if (!res.success) {
            securityLogger.logApiError(
              {
                error: "Failed to send verification email",
                details: res.error,
                endpoint: "/api/auth/register",
                method: "POST",
                email: email,
              },
              createLogContext(context, { action: "email_send_failed", userId })
            );
            return;
          }

          // Staging-Debug-Logging: Message-ID + maskierte Empfängeradresse
          try {
            const envName = context?.locals?.runtime?.env?.ENVIRONMENT || "";
            if (envName === "staging") {
              const masked = email.replace(/(^.).*(@.*$)/, "$1*****$2");
              securityLogger.logSecurityEvent(
                "EMAIL_ENQUEUED",
                {
                  message: "Verification email enqueued successfully",
                  email: masked,
                  messageId: res.messageId,
                  locale,
                  environment: "staging",
                },
                createLogContext(context, { action: "email_enqueued", userId })
              );
            }
          } catch (e) {
            // Avoid empty catch (ESLint: no-empty); dev-only noise
            if (import.meta.env?.DEV) {
              securityLogger.logSecurityEvent(
                "STAGING_LOG_ERROR",
                {
                  message: "Staging log failed",
                  error: e,
                  environment: "staging",
                },
                createLogContext(context, {
                  action: "staging_log_error",
                  userId,
                })
              );
            }
          }
        })
        .catch((e) => {
          securityLogger.logApiError(
            {
              error: "Verification email error on register",
              details: e,
              endpoint: "/api/auth/register",
              method: "POST",
              email: email,
            },
            createLogContext(context, { action: "email_send_error", userId })
          );
        });
    } catch (e) {
      // Keine Blockierung der Registrierung bei E-Mail-Problemen
      securityLogger.logApiError(
        {
          error: "Non-blocking verification email setup failed",
          details: e,
          endpoint: "/api/auth/register",
          method: "POST",
        },
        createLogContext(context, { action: "email_setup_failed" })
      );
    }

    // Weiterleitung zur Verifikationsseite (locale-bewusst, aber Route ist locale-neutral)
    const verifyRedirect = `/verify-email?email=${encodeURIComponent(
      authResult.user.email
    )}&locale=${encodeURIComponent(locale)}`;
    return createSecureRedirect(verifyRedirect);
  } catch (error) {
    securityLogger.logApiError(
      {
        error: "Register error",
        details: error,
        endpoint: "/api/auth/register",
        method: "POST",
      },
      createLogContext(context, { action: "registration_failed" })
    );

    // Wenn es ein Konflikt mit Details ist, spezialisieren wir den Fehlercode
    // bevor wir zum zentralen Error-Handler weiterleiten
    if (
      error instanceof ServiceError &&
      error.type === ServiceErrorType.CONFLICT
    ) {
      let errorCode = "UserExists"; // Standard-Fehlercode für Konflikte

      // Bei der Registrierung verwenden wir spezifischere Fehlercodes
      if (error.details?.reason === "username_exists") {
        errorCode = "UsernameExists";
      }

      return createSecureRedirect(`/${locale}/register?error=${errorCode}`);
    }

    // Zentralen Error-Handler verwenden
    return handleAuthError(error, `/${locale}/register`);
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
