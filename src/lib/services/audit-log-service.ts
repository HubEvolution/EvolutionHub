import type { D1Database } from '@cloudflare/workers-types';
import type { AuditEventType, AuditLog, AuditLogRow } from '@/lib/types/audit';
import { mapAuditRow } from '@/lib/types/audit';

export interface AuditListOptions {
  userId?: string;
  eventType?: AuditEventType;
  from?: number; // inclusive (epoch ms)
  to?: number; // inclusive (epoch ms)
  limit?: number; // default 50, max 200
  cursor?: string; // base64 JSON { createdAt: number, id: string }
}

export interface AuditListResult {
  items: AuditLog[];
  nextCursor?: string;
}

export class AuditLogService {
  constructor(private readonly db: D1Database) {}

  async getById(id: string): Promise<AuditLog | null> {
    const row = await this.db
      .prepare(
        `SELECT id, event_type, actor_user_id, actor_ip, resource, action, details, created_at
         FROM audit_logs WHERE id = ?1 LIMIT 1`
      )
      .bind(id)
      .first<AuditLogRow>();
    return row ? mapAuditRow(row) : null;
  }

  async list(opts: AuditListOptions): Promise<AuditListResult> {
    const limit = Math.min(200, Math.max(1, Math.floor(opts.limit || 50)));
    const where: string[] = [];
    const params: unknown[] = [];

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

    let cursorCreatedAt: number | null = null;
    let cursorId: string | null = null;
    if (opts.cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(opts.cursor, 'base64').toString('utf8')) as {
          createdAt: number;
          id: string;
        };
        if (decoded && typeof decoded.createdAt === 'number' && typeof decoded.id === 'string') {
          cursorCreatedAt = decoded.createdAt;
          cursorId = decoded.id;
        }
      } catch {
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
      .all<AuditLogRow>();
    const rows = res.results || [];
    const hasMore = rows.length > limit;
    const slice = rows.slice(0, limit).map(mapAuditRow);

    let nextCursor: string | undefined;
    if (hasMore && slice.length) {
      const last = slice[slice.length - 1];
      nextCursor = Buffer.from(
        JSON.stringify({ createdAt: last.createdAt, id: last.id }),
        'utf8'
      ).toString('base64');
    }

    return { items: slice, nextCursor };
  }
}
