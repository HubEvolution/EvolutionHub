import type { APIContext } from "astro";
import { z } from "zod";
import { authLimiter } from "@/lib/rate-limiter";
import {
  createSecureJsonResponse,
  createDeprecatedGoneJson,
} from "@/lib/response-helpers";
import { logAuthFailure, logApiAccess } from "@/lib/security-logger";
import {
  createEmailService,
  type EmailServiceDependencies,
} from "@/lib/services/email-service-impl";
import { createEmailVerificationToken } from "@/pages/api/auth/verify-email";

// Diese API-Route sollte nicht prerendered werden, da sie Request-Header benötigt
export const prerender = false;

// Eingabevalidierung
const resendSchema = z.object({
  email: z.string().email("Invalid email format"),
});

// Strikt typisierte Benutzer-Row für DB-Abfragen
type UserRow = {
  id: string;
  email: string;
  name: string;
  username: string;
  // In D1 ist dies oft eine Zahl (0/1); wir erlauben beides und werten truthy
  email_verified: number | boolean;
};

/**
 * POST /api/auth/resend-verification
 * Resendet eine E-Mail-Verifikation, ohne User-Existenz nach außen preiszugeben
 * - JSON Body: { email: string }
 * - Erfolgs-Response ist generisch, um Enumeration zu verhindern
 */
export const POST = async (context: APIContext) => {
  // Deprecated legacy endpoint: return 410 Gone early with security logging (JSON style)
  return createDeprecatedGoneJson(context);
  // Rate Limiting (auth)
  const rateLimited = await authLimiter(context);
  if (rateLimited) {
    return rateLimited;
  }

  try {
    // Content-Type prüfen (optional defensiv)
    const contentType = context.request.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (!isJson) {
      logAuthFailure(context.clientAddress, {
        reason: "invalid_content_type",
        provided: contentType?.split(";")[0] || "unknown",
      });
      return createSecureJsonResponse(
        { error: true, message: "Unsupported Media Type" },
        415
      );
    }

    const body = await context.request.json().catch(() => null);
    const parse = resendSchema.safeParse(body);

    if (!parse.success) {
      logAuthFailure(context.clientAddress, {
        reason: "invalid_email_format",
        errors: parse.error.flatten().fieldErrors,
      });
      return createSecureJsonResponse(
        { error: true, message: "Invalid email" },
        400
      );
    }

    const { email } = parse.data;

    // Infer locale from Referer to propagate through verification URL
    const referer =
      typeof context?.request?.headers?.get === "function"
        ? context.request.headers.get("referer") ?? ""
        : "";
    const locale = referer.includes("/en/")
      ? "en"
      : referer.includes("/de/")
      ? "de"
      : "en";

    if (!context.locals.runtime) {
      const errorMsg =
        "Runtime environment is not available. Are you running in a Cloudflare environment?";
      console.error(errorMsg);
      return createSecureJsonResponse(
        { error: true, message: "Server configuration error" },
        500
      );
    }

    const db = context.locals.runtime.env.DB;

    // User-Datensatz abrufen (nur intern, Response bleibt generisch)
    const user = await db
      .prepare(
        "SELECT id, email, name, username, email_verified FROM users WHERE email = ?"
      )
      .bind(email)
      .first<UserRow>();

    // Immer generische Response nach außen, um Enumeration zu vermeiden
    const genericOk = () =>
      createSecureJsonResponse(
        {
          success: true,
          message: "If an account exists, a verification email has been sent.",
        },
        200
      );

    if (!user) {
      // Nicht vorhandenen Benutzer nicht preisgeben
      logAuthFailure(context.clientAddress, {
        reason: "resend_verification_non_existent_user",
      });
      return genericOk();
    }

    // Bereits verifiziert? Keine E-Mail senden, aber generische Success-Response
    if (user.email_verified) {
      logApiAccess(String(user.id), context.clientAddress || "unknown", {
        endpoint: "/api/auth/resend-verification",
        action: "already_verified",
      });
      return genericOk();
    }

    // Neuen Verifikations-Token erstellen (löscht alte Tokens intern)
    const token = await createEmailVerificationToken(db, user.id, email);

    const verificationUrl = `${
      context.url.origin
    }/api/auth/verify-email?token=${encodeURIComponent(
      token
    )}&email=${encodeURIComponent(email)}&locale=${encodeURIComponent(locale)}`;

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
      const envName = (context?.locals?.runtime?.env as any)?.ENVIRONMENT || "";
      if (envName === "staging" && !deps.resendApiKey) {
        console.warn(
          "[staging][resend-verification] RESEND_API_KEY fehlt – Verifikationsmail kann nicht gesendet werden"
        );
      }
    } catch (e) {
      // Avoid empty catch (ESLint: no-empty); dev-only noise
      if (import.meta.env?.DEV)
        console.debug(
          "[staging][resend-verification] RESEND_API_KEY check threw",
          e
        );
    }

    let sendResult;
    try {
      const emailService = createEmailService(deps);
      // Verifikations-E-Mail senden
      sendResult = await emailService.sendVerificationEmail({
        email,
        verificationUrl,
        userName: user.name || user.username || undefined,
      });
    } catch (e) {
      // Provider-/Konfig-Fehler nicht nach außen preisgeben
      console.warn("Failed to initialize or send verification email:", e);
      return genericOk();
    }

    if (!sendResult || !sendResult.success) {
      // Interner Fehler beim Versand – nach außen generische Meldung
      console.warn("Failed to send verification email:", sendResult?.error);
      return genericOk();
    }

    // Staging-Debug-Logging: Message-ID + maskierte Empfängeradresse
    try {
      const envName = context?.locals?.runtime?.env as any;
      const environment =
        typeof envName?.ENVIRONMENT === "string" ? envName.ENVIRONMENT : "";
      if (environment === "staging") {
        const masked = email.replace(/(^.).*(@.*$)/, "$1*****$2");
        console.log(
          "[staging][resend-verification] Verification email enqueued",
          {
            to: masked,
            messageId: sendResult.messageId,
            locale,
          }
        );
      }
    } catch (e) {
      // Avoid empty catch (ESLint: no-empty); dev-only noise
      if (import.meta.env?.DEV)
        console.debug("[staging][resend-verification] staging log failed", e);
    }

    // Erfolgreicher Versand
    logApiAccess(String(user.id), context.clientAddress || "unknown", {
      endpoint: "/api/auth/resend-verification",
      action: "verification_email_sent",
    });

    return genericOk();
  } catch (error) {
    console.error("Resend verification error:", error);
    logAuthFailure(context.clientAddress, {
      reason: "resend_verification_server_error",
      error: error instanceof Error ? error.message : String(error),
    });

    return createSecureJsonResponse(
      { error: true, message: "Server error" },
      500
    );
  }
};

// 410 für nicht unterstützte Methoden (Endpoint deprecated)
const methodNotAllowed = (context: APIContext) =>
  createDeprecatedGoneJson(
    context,
    "This endpoint has been deprecated. Please migrate to the new authentication flow.",
    { allow: "POST" }
  );

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
