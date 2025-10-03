/**
 * Resend Email Service Implementation
 *
 * Diese Klasse implementiert das EmailService-Interface unter Verwendung der Resend API.
 * Sie unterstützt E-Mail-Verifikation, Willkommens-E-Mails und allgemeine E-Mail-Versendung.
 */

import { Resend } from 'resend';
import { AbstractBaseService } from './base-service';
import type {
  EmailService,
  EmailVerificationRequest,
  EmailRequest,
  EmailResult,
} from './email-service';
import type { ServiceDependencies } from './types';
import { ServiceError, ServiceErrorType } from './types';
import { log } from '@/server/utils/logger';

function maskEmail(email: string): string {
  try {
    const [user, domain] = email.split('@');
    if (!user || !domain) return email;
    const maskedUser = user.length <= 2 ? user[0] + '*' : user[0] + '***' + user[user.length - 1];
    return `${maskedUser}@${domain}`;
  } catch {
    return email;
  }
}

/**
 * Erweiterte Service-Abhängigkeiten für den E-Mail-Service
 */
export interface EmailServiceDependencies extends ServiceDependencies {
  resendApiKey: string;
  fromEmail: string;
  baseUrl: string;
}

/**
 * Implementierung des EmailService mit Resend API
 */
export class ResendEmailService extends AbstractBaseService implements EmailService {
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly baseUrl: string;

  /**
   * Erstellt eine neue Instanz des Resend Email Service
   *
   * @param deps Service-Abhängigkeiten inklusive Resend API-Key
   */
  constructor(deps: EmailServiceDependencies) {
    super(deps);

    if (!deps.resendApiKey) {
      throw new ServiceError('Resend API Key ist erforderlich', ServiceErrorType.VALIDATION, {
        missingConfig: 'resendApiKey',
      });
    }

    if (!deps.fromEmail) {
      throw new ServiceError('From-E-Mail-Adresse ist erforderlich', ServiceErrorType.VALIDATION, {
        missingConfig: 'fromEmail',
      });
    }

    if (!deps.baseUrl) {
      throw new ServiceError('Base URL ist erforderlich', ServiceErrorType.VALIDATION, {
        missingConfig: 'baseUrl',
      });
    }

    this.resend = new Resend(deps.resendApiKey);
    this.fromEmail = deps.fromEmail;
    this.baseUrl = deps.baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Sendet eine E-Mail-Verifikations-E-Mail an einen neuen Benutzer
   *
   * @param request Verifikations-E-Mail-Anfrage
   * @returns Promise mit dem Ergebnis der E-Mail-Versendung
   */
  async sendVerificationEmail(request: EmailVerificationRequest): Promise<EmailResult> {
    try {
      const subject = 'Konto aktivieren - Willkommen bei EvolutionHub';
      const html = this.generateVerificationEmailHTML(request);

      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [request.email],
        subject,
        html,
      });

      if (error) {
        log('error', 'Resend API error (verification email)', {
          errorMessage: (error as any)?.message || String(error),
          to: maskEmail(request.email),
          kind: 'verification',
        });
        return {
          success: false,
          error: error.message || 'Failed to send verification email',
        };
      }

      if (this.isDevelopment) {
        log('info', 'Verification email sent successfully', {
          to: maskEmail(request.email),
          messageId: data?.id,
        });
      }

      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log('error', 'Error sending verification email', {
        errorMessage,
        to: maskEmail(request.email),
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sendet eine Willkommens-E-Mail an einen verifizierten Benutzer
   *
   * @param email E-Mail-Adresse des Benutzers
   * @param userName Name des Benutzers
   * @returns Promise mit dem Ergebnis der E-Mail-Versendung
   */
  async sendWelcomeEmail(email: string, userName: string): Promise<EmailResult> {
    try {
      const subject = 'Willkommen bei EvolutionHub - Ihr Konto ist jetzt aktiv!';
      const html = this.generateWelcomeEmailHTML(email, userName);

      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [email],
        subject,
        html,
      });

      if (error) {
        log('error', 'Resend API error (welcome email)', {
          errorMessage: (error as any)?.message || String(error),
          to: maskEmail(email),
          kind: 'welcome',
        });
        return {
          success: false,
          error: error.message || 'Failed to send welcome email',
        };
      }

      if (this.isDevelopment) {
        log('info', 'Welcome email sent successfully', {
          to: maskEmail(email),
          userName,
          messageId: data?.id,
        });
      }

      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log('error', 'Error sending welcome email', {
        errorMessage,
        to: maskEmail(email),
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sendet eine allgemeine E-Mail
   *
   * @param request E-Mail-Anfrage
   * @returns Promise mit dem Ergebnis der E-Mail-Versendung
   */
  async sendEmail(request: EmailRequest): Promise<EmailResult> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: request.from || this.fromEmail,
        to: request.to,
        subject: request.subject,
        html: request.html,
      });

      if (error) {
        log('error', 'Resend API error (generic email)', {
          errorMessage: (error as any)?.message || String(error),
          to: (request.to || []).map(maskEmail).join(','),
          kind: 'generic',
        });
        return {
          success: false,
          error: error.message || 'Failed to send email',
        };
      }

      if (this.isDevelopment) {
        log('info', 'Email sent successfully', {
          to: (request.to || []).map(maskEmail),
          subject: request.subject,
          messageId: data?.id,
        });
      }

      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log('error', 'Error sending email', {
        errorMessage,
        to: (request.to || []).map(maskEmail),
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Validiert eine E-Mail-Adresse auf Korrektheit
   *
   * @param email Zu validierende E-Mail-Adresse
   * @returns true wenn die E-Mail-Adresse gültig ist, false andernfalls
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Generiert HTML-Inhalt für die E-Mail-Verifikations-E-Mail
   *
   * @param request Verifikations-E-Mail-Anfrage
   * @returns HTML-String für die E-Mail
   */
  private generateVerificationEmailHTML(request: EmailVerificationRequest): string {
    const userName = request.userName || 'dort';

    return `
<!DOCTYPE html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>Konto aktivieren - EvolutionHub</title>

    <!--[if mso]>
        <style>
            * {
                font-family: sans-serif !important;
            }
        </style>
    <![endif]-->

    <style>
        :root {
            --brand-primary-gradient: linear-gradient(135deg, #10b981, #06b6d4);
            --brand-accent-emerald: #10b981;
            --text-headline: #111827;
            --text-body: #6b7280;
            --background-main: #f9fafb;
            --background-content: #ffffff;
            --background-code: #f3f4f6;
            color-scheme: light dark;
            supported-color-schemes: light dark;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --text-headline: #ffffff;
                --text-body: #9ca3af;
                --background-main: #111827;
                --background-content: #1f2937;
                --background-code: #374151;
            }
        }

        html,
        body {
            margin: 0 auto !important;
            padding: 0 !important;
            height: 100% !important;
            width: 100% !important;
            background: var(--background-main);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
        }

        * {
            -ms-text-size-adjust: 100%;
            -webkit-text-size-adjust: 100%;
        }

        table,
        td {
            mso-table-lspace: 0pt !important;
            mso-table-rspace: 0pt !important;
        }

        table {
            border-spacing: 0 !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            margin: 0 auto !important;
        }

        a {
            text-decoration: none;
        }

        .container {
            background-color: var(--background-content);
            border-radius: 1rem;
            padding: 2rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            max-width: 600px;
            margin: 0 auto;
        }

        .headline {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-headline);
            margin-bottom: 1rem;
        }

        .body-text {
            font-size: 0.875rem;
            color: var(--text-body);
            line-height: 1.5;
            margin-bottom: 1.5rem;
        }

        .button {
            background: var(--brand-primary-gradient);
            border-radius: 0.5rem;
            padding: 0.75rem 1.5rem;
            color: #ffffff;
            font-weight: 600;
            display: inline-block;
            min-height: 44px;
            line-height: 1.5;
            box-sizing: border-box;
        }

        .code-block {
            background-color: var(--background-code);
            padding: 0.75rem;
            border-radius: 0.25rem;
            font-family: ui-monospace, 'Cascadia Code', monospace;
            font-size: 0.75rem;
            color: var(--text-body);
            word-break: break-all;
            margin-top: 1rem;
        }

        .validity-notice {
            font-size: 0.875rem;
            color: var(--text-body);
            margin-top: 1.5rem;
        }

        .footer {
            font-size: 0.75rem;
            color: var(--text-body);
            text-align: center;
            padding-top: 1.5rem;
        }

    </style>
</head>
<body width="100%" style="margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: var(--background-main);">
    <center style="width: 100%; background-color: var(--background-main);">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px 0;">
            <!--[if mso]>
            <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: auto;">
            <tr>
            <td align="center">
            <![endif]-->
            <div class="container">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <!-- Header -->
                    <tr>
                        <td>
                            <h1 class="headline" style="font-size: 1.5rem; font-weight: 700; color: var(--text-headline); margin-bottom: 1rem;">Nur noch ein Schritt...</h1>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td>
                            <p class="body-text" style="font-size: 0.875rem; color: var(--text-body); line-height: 1.5; margin-bottom: 1.5rem;">
                                Hallo ${userName},
                                <br><br>
                                vielen Dank für deine Registrierung bei EvolutionHub. Bitte klicke auf den Button unten, um deine E-Mail-Adresse zu bestätigen und dein Konto zu aktivieren.
                            </p>
                        </td>
                    </tr>

                    <!-- CTA Button -->
                    <tr>
                        <td style="text-align: center;">
                             <!--[if mso]>
                              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${request.verificationUrl}" style="height:44px;v-text-anchor:middle;width:250px;" arcsize="10%" strokecolor="#10b981" fillcolor="#10b981">
                                <w:anchorlock/>
                                <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">&#128640; Konto jetzt aktivieren</center>
                              </v:roundrect>
                            <![endif]-->
                            <a href="${request.verificationUrl}" class="button" style="background: linear-gradient(135deg, #10b981, #06b6d4); border-radius: 0.5rem; padding: 0.75rem 1.5rem; color: #ffffff; font-weight: 600; display: inline-block; min-height: 44px; line-height: 1.5; box-sizing: border-box; text-decoration: none; mso-hide:all;">
                                &#128640; Konto jetzt aktivieren
                            </a>
                        </td>
                    </tr>

                    <!-- Fallback Link & Validity -->
                    <tr>
                        <td>
                            <p class="body-text" style="font-size: 0.875rem; color: var(--text-body); line-height: 1.5; margin-bottom: 0; margin-top: 1.5rem;">
                                Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:
                            </p>
                            <div class="code-block" style="background-color: var(--background-code); padding: 0.75rem; border-radius: 0.25rem; font-family: ui-monospace, 'Cascadia Code', monospace; font-size: 0.75rem; color: var(--text-body); word-break: break-all; margin-top: 1rem;">${request.verificationUrl}</div>
                            <p class="validity-notice" style="font-size: 0.875rem; color: var(--text-body); margin-top: 1.5rem;">
                                &#128337; Wichtig: Dieser Link ist 24 Stunden gültig.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td class="footer" style="font-size: 0.75rem; color: var(--text-body); text-align: center; padding-top: 1.5rem;">
                             Diese E-Mail wurde an ${request.email} gesendet.<br>
                             Wenn du dich nicht registriert hast, ignoriere diese E-Mail bitte.<br>
                             &copy; ${new Date().getFullYear()} EvolutionHub. Alle Rechte vorbehalten.
                        </td>
                    </tr>
                </table>
            </div>
            <!--[if mso]>
            </td>
            </tr>
            </table>
            <![endif]-->
        </div>
    </center>
</body>
</html>
`;
  }

  /**
   * Generiert HTML-Inhalt für die Willkommens-E-Mail
   *
   * @param email E-Mail-Adresse des Benutzers
   * @param userName Name des Benutzers
   * @returns HTML-String für die E-Mail
   */
  private generateWelcomeEmailHTML(_email: string, userName: string): string {
    const dashboardUrl = `${this.baseUrl}/dashboard`;

    return `
<!DOCTYPE html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>&#127881; Willkommen bei EvolutionHub - Ihr Konto ist aktiv!</title>

    <!--[if mso]>
        <style>
            * {
                font-family: sans-serif !important;
            }
        </style>
    <![endif]-->

    <style>
        :root {
            --brand-primary-gradient: linear-gradient(135deg, #10b981, #06b6d4);
            --brand-subtle-gradient: linear-gradient(to right, #ecfdf5, #cffafe);
            --brand-accent-emerald: #10b981;
            --brand-accent-cyan: #06b6d4;
            --text-headline: #111827;
            --text-body: #6b7280;
            --background-main: #f9fafb;
            --background-content: #ffffff;
            color-scheme: light dark;
            supported-color-schemes: light dark;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --text-headline: #ffffff;
                --text-body: #9ca3af;
                --background-main: #111827;
                --background-content: #1f2937;
                --brand-subtle-gradient: linear-gradient(to right, #1a2e2a, #1c2f3b);
            }
        }

        html,
        body {
            margin: 0 auto !important;
            padding: 0 !important;
            height: 100% !important;
            width: 100% !important;
            background: var(--background-main);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
        }

        * {
            -ms-text-size-adjust: 100%;
            -webkit-text-size-adjust: 100%;
        }

        table,
        td {
            mso-table-lspace: 0pt !important;
            mso-table-rspace: 0pt !important;
        }

        table {
            border-spacing: 0 !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            margin: 0 auto !important;
        }

        a {
            text-decoration: none;
        }

        img {
            -ms-interpolation-mode:bicubic;
        }

        .container {
            background-color: var(--background-content);
            border-radius: 1rem;
            padding: 2rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            max-width: 600px;
            margin: 0 auto;
        }

        .logo {
            font-size: 2rem;
            font-weight: 800;
            background: var(--brand-primary-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            color: transparent;
            margin-bottom: 1rem;
        }

        .headline {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-headline);
            margin: 0;
        }

        .body-text {
            font-size: 0.875rem;
            color: var(--text-body);
            line-height: 1.5;
            margin-bottom: 1rem;
        }

        .button {
            background: var(--brand-primary-gradient);
            border-radius: 0.5rem;
            padding: 0.75rem 1.5rem;
            color: #ffffff;
            font-weight: 600;
            display: inline-block;
            min-height: 44px;
            line-height: 1.5;
            box-sizing: border-box;
        }

        .quick-start-card {
            background: var(--brand-subtle-gradient);
            border-radius: 0.5rem;
            padding: 1.5rem;
            margin-top: 1.5rem;
        }

        .quick-start-title {
            font-size: 1.125rem;
            font-weight: 700;
            color: var(--text-headline);
            margin-bottom: 1rem;
        }

        .quick-start-item {
            color: var(--text-body);
            font-size: 0.875rem;
            margin-bottom: 0.5rem;
        }

        .footer {
            font-size: 0.75rem;
            color: var(--text-body);
            text-align: center;
            padding-top: 1.5rem;
        }

        @media screen and (max-width: 600px) {
            .container {
                padding: 1.5rem !important;
            }
        }

    </style>
</head>
<body width="100%" style="margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: var(--background-main);">
    <center style="width: 100%; background-color: var(--background-main);">
    <!--[if mso | IE]>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb;">
    <tr>
    <td>
    <![endif]-->

        <div style="max-width: 600px; margin: 0 auto; padding: 20px 0;" class="email-container">
            <!--[if mso]>
            <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: auto;">
            <tr>
            <td align="center">
            <![endif]-->
            <div class="container">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <!-- Header -->
                    <tr>
                        <td style="text-align: center; margin-bottom: 1.5rem;">
                            <div class="logo" style="font-size: 2rem; font-weight: 800; background: linear-gradient(135deg, #10b981, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; color: transparent; margin-bottom: 1rem;">EvolutionHub</div>
                            <h1 class="headline" style="font-size: 1.5rem; font-weight: 700; color: var(--text-headline); margin: 0;">&#127881; Willkommen an Bord!</h1>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 1.5rem 0;">
                            <p class="body-text" style="font-size: 0.875rem; color: var(--text-body); line-height: 1.5; margin-bottom: 1rem;">
                                Hallo ${userName},
                            </p>
                            <p class="body-text" style="font-size: 0.875rem; color: var(--text-body); line-height: 1.5; margin-bottom: 1rem;">
                                fantastisch, dass du dabei bist! Dein EvolutionHub-Konto wurde erfolgreich aktiviert. Du bist jetzt Teil einer Community, die die Zukunft der Arbeit gestaltet.
                            </p>
                        </td>
                    </tr>

                    <!-- CTA Button -->
                    <tr>
                        <td style="text-align: center; margin: 1.5rem 0;">
                             <!--[if mso]>
                              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${dashboardUrl}" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="10%" strokecolor="#10b981" fillcolor="#10b981">
                                <w:anchorlock/>
                                <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">&#128640; Zum Dashboard</center>
                              </v:roundrect>
                            <![endif]-->
                            <a href="${dashboardUrl}" class="button" style="background: linear-gradient(135deg, #10b981, #06b6d4); border-radius: 0.5rem; padding: 0.75rem 1.5rem; color: #ffffff; font-weight: 600; display: inline-block; min-height: 44px; line-height: 1.5; box-sizing: border-box; text-decoration: none; mso-hide:all;">
                                &#128640; Zum Dashboard
                            </a>
                        </td>
                    </tr>

                    <!-- Quick Start -->
                    <tr>
                        <td style="padding-top: 1.5rem;">
                            <div class="quick-start-card" style="background: var(--brand-subtle-gradient); border-radius: 0.5rem; padding: 1.5rem; margin-top: 1.5rem;">
                                <h2 class="quick-start-title" style="font-size: 1.125rem; font-weight: 700; color: var(--text-headline); margin-bottom: 1rem;">Deine nächsten Schritte:</h2>
                                <ul style="list-style: none; padding: 0; margin: 0;">
                                    <li class="quick-start-item" style="color: var(--text-body); font-size: 0.875rem; margin-bottom: 0.5rem;">&#128200; Dashboard erkunden</li>
                                    <li class="quick-start-item" style="color: var(--text-body); font-size: 0.875rem; margin-bottom: 0.5rem;">&#127919; Erstes Projekt erstellen</li>
                                    <li class="quick-start-item" style="color: var(--text-body); font-size: 0.875rem; margin-bottom: 0.5rem;">&#128161; New Work-Ressourcen entdecken</li>
                                    <li class="quick-start-item" style="color: var(--text-body); font-size: 0.875rem; margin-bottom: 0.5rem;">&#129309; Community kennenlernen</li>
                                </ul>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td class="footer" style="font-size: 0.75rem; color: var(--text-body); text-align: center; padding-top: 1.5rem;">
                             &copy; ${new Date().getFullYear()} EvolutionHub. Alle Rechte vorbehalten.<br>
                             Bei Fragen, antworte einfach auf diese E-Mail.
                        </td>
                    </tr>
                </table>
            </div>
            <!--[if mso]>
            </td>
            </tr>
            </table>
            <![endif]-->
        </div>

    <!--[if mso | IE]>
    </td>
    </tr>
    </table>
    <![endif]-->
    </center>
</body>
</html>
`;
  }
}

/**
 * Factory-Funktion zur Erstellung einer EmailService-Instanz
 *
 * @param deps Abhängigkeiten für den Service
 * @returns Eine neue EmailService-Instanz
 */
export function createEmailService(deps: EmailServiceDependencies): EmailService {
  return new ResendEmailService(deps);
}
