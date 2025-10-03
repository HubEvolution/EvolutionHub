/**
 * Email Service Interface
 *
 * Definiert die Schnittstelle für E-Mail-Services in der Evolution Hub Anwendung.
 * Unterstützt verschiedene E-Mail-Provider und Template-Systeme.
 */

import type { BaseService } from './types';

/**
 * Datenstruktur für E-Mail-Verifikations-Anfragen
 */
export interface EmailVerificationRequest {
  email: string;
  verificationUrl: string;
  userName?: string;
}

/**
 * Datenstruktur für allgemeine E-Mail-Anfragen
 */
export interface EmailRequest {
  to: string[];
  subject: string;
  html: string;
  from?: string;
}

/**
 * Ergebnis einer E-Mail-Versendung
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Interface für E-Mail-Service-Implementierungen
 */
export interface EmailService extends BaseService {
  /**
   * Sendet eine E-Mail-Verifikations-E-Mail an einen neuen Benutzer
   *
   * @param request Verifikations-E-Mail-Anfrage mit allen notwendigen Daten
   * @returns Promise mit dem Ergebnis der E-Mail-Versendung
   */
  sendVerificationEmail(request: EmailVerificationRequest): Promise<EmailResult>;

  /**
   * Sendet eine Willkommens-E-Mail an einen verifizierten Benutzer
   *
   * @param email E-Mail-Adresse des Benutzers
   * @param userName Name des Benutzers
   * @returns Promise mit dem Ergebnis der E-Mail-Versendung
   */
  sendWelcomeEmail(email: string, userName: string): Promise<EmailResult>;

  /**
   * Sendet eine allgemeine E-Mail
   *
   * @param request E-Mail-Anfrage mit allen notwendigen Parametern
   * @returns Promise mit dem Ergebnis der E-Mail-Versendung
   */
  sendEmail(request: EmailRequest): Promise<EmailResult>;

  /**
   * Validiert eine E-Mail-Adresse auf Korrektheit
   *
   * @param email Zu validierende E-Mail-Adresse
   * @returns true wenn die E-Mail-Adresse gültig ist, false andernfalls
   */
  validateEmail(email: string): boolean;
}

/**
 * Template-IDs für verschiedene E-Mail-Typen
 */
export enum EmailTemplateType {
  VERIFICATION = 'email_verification',
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  NEWSLETTER_CONFIRMATION = 'newsletter_confirmation',
}

/**
 * Konfiguration für E-Mail-Templates
 */
export interface EmailTemplateConfig {
  type: EmailTemplateType;
  subject: string;
  generateHtml: (data: any) => string;
}
