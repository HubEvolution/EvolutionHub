"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapAuditRow = mapAuditRow;
function mapAuditRow(row) {
    let parsed = null;
    if (row.details) {
        try {
            const obj = JSON.parse(row.details);
            if (obj && typeof obj === 'object')
                parsed = obj;
        }
        catch {
            parsed = null;
        }
    }
    return {
        id: row.id,
        eventType: row.event_type,
        actorUserId: row.actor_user_id || undefined,
        actorIp: row.actor_ip || undefined,
        resource: row.resource || undefined,
        action: row.action || undefined,
        details: parsed,
        createdAt: row.created_at,
    };
}
