"use strict";
/**
 * AuthService Implementierung
 *
 * Diese Klasse implementiert das AuthService-Interface und kapselt
 * die Authentifizierungslogik für die Evolution Hub Anwendung.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthServiceImpl = void 0;
exports.createAuthService = createAuthService;
const bcrypt_ts_1 = require("bcrypt-ts");
const base_service_1 = require("./base-service");
const types_1 = require("./types");
const auth_v2_1 = require("@/lib/auth-v2");
const logger_factory_1 = require("@/server/utils/logger-factory");
/**
 * Konstante für die Standard-Kosten des bcrypt-Hashing
 * Höhere Werte = sicherer, aber langsamer
 */
const BCRYPT_COST = 12;
/**
 * Standard-Gültigkeitsdauer für ein Passwort-Reset-Token in Sekunden (24 Stunden)
 */
const PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24;
/**
 * Implementierung des AuthService
 */
class AuthServiceImpl extends base_service_1.AbstractBaseService {
    /**
     * Erstellt eine neue Instanz des AuthService
     *
     * @param deps Abhängigkeiten des Service
     */
    constructor(deps) {
        super(deps);
        this.securityLogger = logger_factory_1.loggerFactory.createSecurityLogger();
    }
    /**
     * Authentifiziert einen Benutzer mit E-Mail und Passwort
     *
     * @param email E-Mail-Adresse des Benutzers
     * @param password Passwort des Benutzers
     * @param ipAddress IP-Adresse für Logging-Zwecke
     * @returns Authentifizierungsergebnis bei Erfolg
     * @throws ServiceError wenn die Authentifizierung fehlschlägt
     */
    async login(email, password, ipAddress) {
        return this.withTransaction(async (db) => {
            // Benutzer anhand der E-Mail-Adresse suchen
            const existingUser = await db
                .prepare('SELECT * FROM users WHERE email = ?')
                .bind(email)
                .first();
            if (!existingUser) {
                // Fehlgeschlagene Anmeldung protokollieren
                this.securityLogger.logAuthFailure({
                    reason: 'user_not_found',
                    email,
                }, {
                    ipAddress,
                    action: 'login_attempt',
                });
                throw new types_1.ServiceError('Ungültige Anmeldedaten', types_1.ServiceErrorType.AUTHENTICATION, {
                    reason: 'invalid_credentials',
                });
            }
            if (!existingUser.password_hash) {
                // Fehlgeschlagene Anmeldung protokollieren
                this.securityLogger.logAuthFailure({
                    reason: 'missing_password_hash',
                    userId: existingUser.id,
                }, {
                    ipAddress,
                    userId: existingUser.id,
                    action: 'login_attempt',
                });
                throw new types_1.ServiceError('Konto nicht vollständig eingerichtet', types_1.ServiceErrorType.AUTHENTICATION, { reason: 'account_setup_incomplete' });
            }
            // Passwort überprüfen
            const validPassword = await (0, bcrypt_ts_1.compare)(password, existingUser.password_hash);
            if (!validPassword) {
                // Fehlgeschlagene Anmeldung protokollieren
                this.securityLogger.logAuthFailure({
                    reason: 'invalid_password',
                    userId: existingUser.id,
                }, {
                    ipAddress,
                    userId: existingUser.id,
                    action: 'login_attempt',
                });
                throw new types_1.ServiceError('Ungültige Anmeldedaten', types_1.ServiceErrorType.AUTHENTICATION, {
                    reason: 'invalid_credentials',
                });
            }
            // E-Mail-Verifikation prüfen (Double-Opt-in-Blockade)
            const emailVerified = !!existingUser.email_verified;
            if (!emailVerified) {
                this.securityLogger.logAuthFailure({
                    reason: 'email_not_verified',
                    userId: existingUser.id,
                    email: existingUser.email,
                }, {
                    ipAddress,
                    userId: existingUser.id,
                    action: 'login_attempt',
                });
                throw new types_1.ServiceError('E-Mail-Adresse nicht verifiziert', types_1.ServiceErrorType.AUTHENTICATION, { reason: 'email_not_verified', email: existingUser.email });
            }
            // Session erstellen
            const session = await (0, auth_v2_1.createSession)(db, existingUser.id);
            // Erfolgreiche Anmeldung protokollieren
            this.securityLogger.logAuthSuccess({
                action: 'login',
                sessionId: session.id,
            }, {
                userId: existingUser.id,
                ipAddress,
                sessionId: session.id,
                action: 'login_success',
            });
            // SafeUser-Objekt ohne sensible Daten erstellen
            const safeUser = {
                id: existingUser.id,
                email: existingUser.email,
                name: existingUser.name,
                username: existingUser.username,
                image: existingUser.image,
                created_at: existingUser.created_at,
            };
            return {
                user: safeUser,
                session,
                sessionId: session.id,
            };
        });
    }
    /**
     * Registriert einen neuen Benutzer
     *
     * @param data Registrierungsdaten
     * @param ipAddress IP-Adresse für Logging-Zwecke
     * @returns Authentifizierungsergebnis bei Erfolg
     * @throws ServiceError wenn die Registrierung fehlschlägt
     */
    async register(data, ipAddress) {
        return this.withTransaction(async (db) => {
            // Prüfen, ob die E-Mail-Adresse bereits verwendet wird
            const existingUser = await db
                .prepare('SELECT id FROM users WHERE email = ?')
                .bind(data.email)
                .first();
            if (existingUser) {
                this.securityLogger.logAuthFailure({
                    reason: 'duplicate_user',
                    email: data.email,
                }, {
                    ipAddress,
                    action: 'register_attempt',
                });
                throw new types_1.ServiceError('Ein Benutzer mit dieser E-Mail-Adresse existiert bereits', types_1.ServiceErrorType.CONFLICT, { reason: 'user_exists' });
            }
            // Prüfen, ob der Benutzername bereits verwendet wird
            const existingUsername = await db
                .prepare('SELECT id FROM users WHERE username = ?')
                .bind(data.username)
                .first();
            if (existingUsername) {
                this.securityLogger.logAuthFailure({
                    reason: 'duplicate_username',
                    username: data.username,
                }, {
                    ipAddress,
                    action: 'register_attempt',
                });
                throw new types_1.ServiceError('Dieser Benutzername ist bereits vergeben', types_1.ServiceErrorType.CONFLICT, { reason: 'username_exists' });
            }
            // Passwort hashen
            const passwordHash = await (0, bcrypt_ts_1.hash)(data.password, BCRYPT_COST);
            // Benutzer erstellen
            const userId = crypto.randomUUID();
            const createdAt = new Date().toISOString();
            await db
                .prepare('INSERT INTO users (id, email, name, username, password_hash, created_at, image) VALUES (?, ?, ?, ?, ?, ?, ?)')
                .bind(userId, data.email, data.name, data.username, passwordHash, createdAt, data.image || null)
                .run();
            // Erfolgreiche Registrierung protokollieren (ohne Session)
            this.securityLogger.logAuthSuccess({
                action: 'register',
            }, {
                userId,
                ipAddress,
                action: 'register_success',
            });
            // SafeUser-Objekt ohne sensible Daten erstellen
            const safeUser = {
                id: userId,
                email: data.email,
                name: data.name,
                username: data.username,
                image: data.image,
                created_at: createdAt,
            };
            return {
                user: safeUser,
            };
        });
    }
    /**
     * Beendet eine Benutzersitzung
     *
     * @param sessionId ID der zu beendenden Sitzung
     */
    async logout(sessionId) {
        return this.withTransaction(async (db) => {
            await (0, auth_v2_1.invalidateSession)(db, sessionId);
        });
    }
    /**
     * Überprüft eine Benutzersitzung auf Gültigkeit
     *
     * @param sessionId ID der zu überprüfenden Sitzung
     * @returns Sitzung und Benutzer oder null, falls ungültig
     */
    async validateSession(sessionId) {
        return this.withTransaction(async (db) => {
            const result = await (0, auth_v2_1.validateSession)(db, sessionId);
            if (!result.session || !result.user) {
                return { session: null, user: null };
            }
            // created_at für SafeUser nachladen, da auth-v2.validateSession es nicht liefert
            const createdRow = await db
                .prepare('SELECT created_at FROM users WHERE id = ?')
                .bind(result.user.id)
                .first();
            return {
                session: result.session,
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    name: result.user.name,
                    username: result.user.username,
                    image: result.user.image,
                    created_at: createdRow?.created_at ?? new Date(0).toISOString(),
                },
            };
        });
    }
    /**
     * Erstellt ein Token für das Zurücksetzen eines Passworts
     *
     * @param email E-Mail-Adresse des Benutzers
     * @param ipAddress IP-Adresse für Logging-Zwecke
     * @returns true, wenn ein Token erstellt wurde (auch wenn der Benutzer nicht existiert)
     */
    async createPasswordResetToken(email, ipAddress) {
        return this.withTransaction(async (db) => {
            // Benutzer anhand der E-Mail-Adresse suchen
            const user = await db
                .prepare('SELECT id FROM users WHERE email = ?')
                .bind(email)
                .first();
            // Wenn kein Benutzer gefunden wurde, trotzdem true zurückgeben
            // (um keine Information über die Existenz eines Kontos preiszugeben)
            if (!user) {
                return true;
            }
            // Vorhandene Tokens für diesen Benutzer löschen
            await db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').bind(user.id).run();
            // Neues Token generieren
            const token = crypto.randomUUID();
            const expiresAt = Math.floor(Date.now() / 1000) + PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS;
            // Token in der Datenbank speichern
            await db
                .prepare('INSERT INTO password_reset_tokens (id, user_id, expires_at) VALUES (?, ?, ?)')
                .bind(token, user.id, expiresAt)
                .run();
            // Passwort-Reset-Event protokollieren
            this.securityLogger.logSecurityEvent('PASSWORD_RESET', {
                action: 'create_token',
                tokenId: token.slice(0, 8),
            }, {
                userId: user.id,
                ipAddress,
                action: 'password_reset_token_created',
            });
            return true;
        });
    }
    /**
     * Überprüft ein Passwort-Reset-Token
     *
     * @param token Das zu überprüfende Token
     * @returns Die Benutzer-ID, falls das Token gültig ist, sonst null
     */
    async validatePasswordResetToken(token) {
        return this.withTransaction(async (db) => {
            const result = await db
                .prepare(`
        SELECT user_id, expires_at FROM password_reset_tokens
        WHERE id = ?
      `)
                .bind(token)
                .first();
            if (!result) {
                return null;
            }
            // Prüfen, ob das Token abgelaufen ist
            if (result.expires_at < Math.floor(Date.now() / 1000)) {
                // Abgelaufenes Token löschen
                await db.prepare('DELETE FROM password_reset_tokens WHERE id = ?').bind(token).run();
                return null;
            }
            return result.user_id;
        });
    }
    /**
     * Setzt ein Passwort mit einem gültigen Token zurück
     *
     * @param token Das Passwort-Reset-Token
     * @param newPassword Das neue Passwort
     * @param ipAddress IP-Adresse für Logging-Zwecke
     * @returns true, wenn erfolgreich
     * @throws ServiceError wenn das Passwort nicht zurückgesetzt werden konnte
     */
    async resetPassword(token, newPassword, ipAddress) {
        return this.withTransaction(async (db) => {
            // Token validieren
            const userId = await this.validatePasswordResetToken(token);
            if (!userId) {
                throw new types_1.ServiceError('Ungültiges oder abgelaufenes Token', types_1.ServiceErrorType.AUTHENTICATION, { reason: 'invalid_token' });
            }
            // Passwort hashen
            const passwordHash = await (0, bcrypt_ts_1.hash)(newPassword, BCRYPT_COST);
            // Passwort aktualisieren
            await db
                .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
                .bind(passwordHash, userId)
                .run();
            // Token nach erfolgreicher Verwendung löschen
            await db.prepare('DELETE FROM password_reset_tokens WHERE id = ?').bind(token).run();
            // Erfolgreichen Passwort-Reset protokollieren
            this.securityLogger.logSecurityEvent('PASSWORD_RESET', {
                action: 'reset_successful',
            }, {
                userId,
                ipAddress,
                action: 'password_reset_successful',
            });
            return true;
        });
    }
    /**
     * Ändert das Passwort eines eingeloggten Benutzers nach Verifizierung des aktuellen Passworts
     *
     * @param userId ID des Benutzers
     * @param currentPassword Aktuelles Passwort
     * @param newPassword Neues Passwort
     * @param ipAddress Optionale IP-Adresse für Security-Logging
     * @returns true, wenn erfolgreich
     */
    async changePassword(userId, currentPassword, newPassword, ipAddress) {
        return this.withTransaction(async (db) => {
            const user = await db
                .prepare('SELECT id, password_hash, email, username FROM users WHERE id = ?')
                .bind(userId)
                .first();
            if (!user || !user.password_hash) {
                this.securityLogger.logAuthFailure({
                    reason: 'user_not_found_or_no_password_hash',
                    userId,
                }, {
                    ipAddress,
                    userId,
                    action: 'change_password_attempt',
                });
                throw new types_1.ServiceError('Benutzer nicht gefunden oder Passwort nicht gesetzt', types_1.ServiceErrorType.AUTHENTICATION, { reason: 'user_not_found' });
            }
            // Gleiches Passwort verhindern (schneller Check ohne Hashing)
            if (currentPassword === newPassword) {
                throw new types_1.ServiceError('Das neue Passwort darf nicht mit dem aktuellen übereinstimmen', types_1.ServiceErrorType.VALIDATION, { reason: 'same_password' });
            }
            // Aktuelles Passwort verifizieren
            const valid = await (0, bcrypt_ts_1.compare)(currentPassword, user.password_hash);
            if (!valid) {
                this.securityLogger.logAuthFailure({
                    reason: 'invalid_current_password',
                    userId,
                }, {
                    ipAddress,
                    userId,
                    action: 'change_password_attempt',
                });
                throw new types_1.ServiceError('Aktuelles Passwort ist falsch', types_1.ServiceErrorType.AUTHENTICATION, {
                    reason: 'invalid_current_password',
                });
            }
            // Neues Passwort hashen und aktualisieren
            const newHash = await (0, bcrypt_ts_1.hash)(newPassword, BCRYPT_COST);
            await db
                .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
                .bind(newHash, userId)
                .run();
            // Erfolgreiche Passwortänderung protokollieren
            this.securityLogger.logAuthSuccess({
                action: 'change_password',
            }, {
                userId,
                ipAddress,
                action: 'change_password_success',
            });
            return true;
        });
    }
}
exports.AuthServiceImpl = AuthServiceImpl;
/**
 * Factory-Funktion zur Erstellung einer AuthService-Instanz
 *
 * @param deps Abhängigkeiten für den Service
 * @returns Eine neue AuthService-Instanz
 */
function createAuthService(deps) {
    return new AuthServiceImpl(deps);
}
