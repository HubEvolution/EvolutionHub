'use strict';
/**
 * Auth Service Interface und Implementierung
 *
 * Verantwortlich für alle Authentifizierungsoperationen wie Login, Registrierung,
 * Passwort-Reset und Session-Management. Kapselt Datenbankzugriffe und Sicherheitslogik.
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.createAuthService = void 0;
// Hinweis: Die tatsächliche Factory wird aus der Implementierung re-exportiert.
// Dies vermeidet doppelte Implementierungen und stellt sicher, dass immer die
// produktive Service-Logik verwendet wird.
var auth_service_impl_1 = require('./auth-service-impl');
Object.defineProperty(exports, 'createAuthService', {
  enumerable: true,
  get: function () {
    return auth_service_impl_1.createAuthService;
  },
});
