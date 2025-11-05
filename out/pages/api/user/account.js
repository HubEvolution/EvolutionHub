"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELETE = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const security_logger_1 = require("@/lib/security-logger");
const stripe_1 = require("stripe");
/**
 * DELETE /api/user/account
 * Löscht das Benutzerkonto und alle zugehörigen Daten
 *
 * Führt folgende Aktionen aus:
 * - Löscht alle Benutzer-Sessions für eine sichere Abmeldung
 * - Löscht alle Aktivitäten, Kommentare und Projekte des Benutzers
 * - Entfernt persönliche Daten aus dem Benutzerkonto
 * - Markiert das Konto als gelöscht, anstatt es vollständig zu entfernen
 *
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 */
exports.DELETE = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
    const { locals, clientAddress, request } = context;
    const { env } = locals.runtime;
    const user = locals.user;
    const db = env.DB;
    // Ensure authenticated user before proceeding
    if (!user) {
        return (0, api_middleware_1.createApiError)('auth_error', 'Unauthorized');
    }
    // Optional: Bestätigung einfordern und validieren
    let confirmDelete = false;
    let cancelSubscription = false;
    try {
        const body = (await request.json().catch(() => null));
        if (body && typeof body === 'object') {
            const requestObj = body;
            confirmDelete = Boolean(requestObj.confirm);
            cancelSubscription = Boolean(requestObj.cancelSubscription);
        }
    }
    catch (_error) {
        // JSON parsing error ignorieren, confirmDelete bleibt false
    }
    if (!confirmDelete) {
        (0, security_logger_1.logUserEvent)(user.id, 'account_deletion_aborted', {
            reason: 'confirmation_missing',
            ipAddress: clientAddress,
        });
        return (0, api_middleware_1.createApiError)('validation_error', 'Confirmation required to delete account');
    }
    const activeSubscriptions = await db
        .prepare(`SELECT id, plan, status, current_period_end, cancel_at_period_end
         FROM subscriptions
         WHERE user_id = ?1
           AND status IN ('active', 'trialing', 'past_due')
           AND (cancel_at_period_end IS NULL OR cancel_at_period_end = 0)
         ORDER BY datetime(updated_at) DESC`)
        .bind(user.id)
        .all();
    if (activeSubscriptions.length > 0) {
        const activeSubscriptionIds = activeSubscriptions.map((subscription) => subscription.id);
        if (!cancelSubscription) {
            (0, security_logger_1.logUserEvent)(user.id, 'account_deletion_blocked_subscription', {
                subscriptionIds: activeSubscriptionIds,
                plans: activeSubscriptions.map((subscription) => subscription.plan),
                statuses: activeSubscriptions.map((subscription) => subscription.status),
                ipAddress: clientAddress,
            });
            return (0, api_middleware_1.createApiError)('subscription_active', 'Active subscription must be cancelled before deleting the account.', {
                subscriptions: activeSubscriptions.map((subscription) => ({
                    id: subscription.id,
                    plan: subscription.plan,
                    status: subscription.status,
                    currentPeriodEnd: subscription.current_period_end,
                })),
            });
        }
        if (!env.STRIPE_SECRET) {
            return (0, api_middleware_1.createApiError)('server_error', 'Stripe not configured');
        }
        const stripe = new stripe_1.default(env.STRIPE_SECRET);
        for (const subscription of activeSubscriptions) {
            try {
                await stripe.subscriptions.update(subscription.id, {
                    cancel_at_period_end: true,
                });
                await db
                    .prepare(`UPDATE subscriptions
               SET cancel_at_period_end = 1,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = ?1`)
                    .bind(subscription.id)
                    .run();
                (0, security_logger_1.logUserEvent)(user.id, 'subscription_cancelled_via_account_delete', {
                    subscriptionId: subscription.id,
                    plan: subscription.plan,
                    ipAddress: clientAddress,
                });
            }
            catch (error) {
                (0, security_logger_1.logUserEvent)(user.id, 'subscription_cancel_error_account_delete', {
                    subscriptionId: subscription.id,
                    error: error instanceof Error ? error.message : String(error),
                    ipAddress: clientAddress,
                });
                return (0, api_middleware_1.createApiError)('server_error', 'Unable to cancel active subscription');
            }
        }
    }
    try {
        // Transaktion starten für atomare Operationen
        // Hinweis: D1 unterstützt derzeit keine echten Transaktionen, wir verwenden batch als Alternative
        const statements = [];
        // 1. Alle Sessions des Benutzers löschen (Abmeldung auf allen Geräten)
        statements.push(db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id));
        // 2. Alle Aktivitäten des Benutzers löschen
        statements.push(db.prepare('DELETE FROM activities WHERE user_id = ?').bind(user.id));
        // 3. Alle Kommentare des Benutzers anonymisieren
        statements.push(db
            .prepare('UPDATE comments SET content = ?, author_name = ? WHERE user_id = ?')
            .bind('[Deleted comment]', '[Deleted user]', user.id));
        // 4. Alle Projekte des Benutzers markieren oder löschen
        statements.push(db
            .prepare('UPDATE projects SET title = ?, description = "" WHERE user_id = ?')
            .bind('[Deleted project]', user.id));
        // 5. Benutzer anonymisieren statt löschen (DSGVO-konform, ermöglicht Datenanalyse)
        const anonymizedEmail = `deleted-${user.id.slice(0, 8)}@example.com`;
        statements.push(db
            .prepare(`UPDATE users SET 
        email = ?, 
        name = "[Deleted User]", 
        username = "deleted_user_${user.id.slice(0, 8)}", 
        password_hash = "", 
        avatar = "", 
        is_deleted = 1, 
        deleted_at = ?
        WHERE id = ?`)
            .bind(anonymizedEmail, new Date().toISOString(), user.id));
        // Alle Operationen als Batch ausführen
        await db.batch(statements);
        // Erfolgreiche Kontolöschung protokollieren
        (0, security_logger_1.logUserEvent)(user.id, 'account_deletion_successful', {
            ipAddress: clientAddress,
            timestamp: new Date().toISOString(),
        });
        // 204 No Content zurückgeben
        return new Response(null, { status: 204 });
    }
    catch (error) {
        // Error wird von der Middleware geloggt und behandelt
        console.error(`Error deleting account for user ${user.id}:`, error);
        throw error; // Error weitergeben, damit die Middleware ihn behandeln kann
    }
}, {
    // Zusätzliche Logging-Metadaten
    logMetadata: { action: 'account_deletion_requested' },
    // Spezielle Fehlerbehandlung für diesen Endpunkt
    onError: (context, error) => {
        const { locals, clientAddress } = context;
        const user = locals?.user; // Optional chaining for safety
        if (user) {
            (0, security_logger_1.logUserEvent)(user.id, 'account_deletion_error', {
                error: error instanceof Error ? error.message : String(error),
                ipAddress: clientAddress,
            });
        }
        return (0, api_middleware_1.createApiError)('server_error', 'An error occurred during account deletion');
    },
});
