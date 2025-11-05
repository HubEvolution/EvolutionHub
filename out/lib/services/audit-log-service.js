"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = void 0;
const audit_1 = require("@/lib/types/audit");
class AuditLogService {
    constructor(db) {
        this.db = db;
    }
    async getById(id) {
        const row = await this.db
            .prepare(`SELECT id, event_type, actor_user_id, actor_ip, resource, action, details, created_at
         FROM audit_logs WHERE id = ?1 LIMIT 1`)
            .bind(id)
            .first();
        return row ? (0, audit_1.mapAuditRow)(row) : null;
    }
    async list(opts) {
        const limit = Math.min(200, Math.max(1, Math.floor(opts.limit || 50)));
        const where = [];
        const params = [];
        if (opts.userId) {
            where.push('actor_user_id = ?');
            params.push(opts.userId);
        }
        if (opts.eventType) {
            where.push('event_type = ?');
            params.push(opts.eventType);
        }
        if (typeof opts.from === 'number') {
            where.push('created_at >= ?');
            params.push(Math.floor(opts.from));
        }
        if (typeof opts.to === 'number') {
            where.push('created_at <= ?');
            params.push(Math.floor(opts.to));
        }
        let cursorCreatedAt = null;
        let cursorId = null;
        if (opts.cursor) {
            try {
                const decoded = JSON.parse(Buffer.from(opts.cursor, 'base64').toString('utf8'));
                if (decoded && typeof decoded.createdAt === 'number' && typeof decoded.id === 'string') {
                    cursorCreatedAt = decoded.createdAt;
                    cursorId = decoded.id;
                }
            }
            catch {
                // ignore invalid cursor
            }
        }
        if (cursorCreatedAt && cursorId) {
            where.push('(created_at < ? OR (created_at = ? AND id < ?))');
            params.push(cursorCreatedAt, cursorCreatedAt, cursorId);
        }
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const sql = `
      SELECT id, event_type, actor_user_id, actor_ip, resource, action, details, created_at
      FROM audit_logs
      ${whereSql}
      ORDER BY created_at DESC, id DESC
      LIMIT ${limit + 1}
    `;
        const res = await this.db
            .prepare(sql)
            .bind(...params)
            .all();
        const rows = res.results || [];
        const hasMore = rows.length > limit;
        const slice = rows.slice(0, limit).map(audit_1.mapAuditRow);
        let nextCursor;
        if (hasMore && slice.length) {
            const last = slice[slice.length - 1];
            nextCursor = Buffer.from(JSON.stringify({ createdAt: last.createdAt, id: last.id }), 'utf8').toString('base64');
        }
        return { items: slice, nextCursor };
    }
}
exports.AuditLogService = AuditLogService;
