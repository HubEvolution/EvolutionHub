"use strict";
/**
 * Email Service Interface
 *
 * Definiert die Schnittstelle für E-Mail-Services in der Evolution Hub Anwendung.
 * Unterstützt verschiedene E-Mail-Provider und Template-Systeme.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTemplateType = void 0;
/**
 * Template-IDs für verschiedene E-Mail-Typen
 */
var EmailTemplateType;
(function (EmailTemplateType) {
    EmailTemplateType["VERIFICATION"] = "email_verification";
    EmailTemplateType["WELCOME"] = "welcome";
    EmailTemplateType["PASSWORD_RESET"] = "password_reset";
    EmailTemplateType["NEWSLETTER_CONFIRMATION"] = "newsletter_confirmation";
})(EmailTemplateType || (exports.EmailTemplateType = EmailTemplateType = {}));
