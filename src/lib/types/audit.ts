export type AuditEventType = 'API_ACCESS' | 'ADMIN_ACTION' | 'SECURITY_EVENT';

export interface AuditLogRow {
  id: string;
  event_type: AuditEventType;
  actor_user_id?: string | null;
  actor_ip?: string | null;
  resource?: string | null;
  action?: string | null;
  details?: string | null;
  created_at: number;
}

export interface AuditLog {
  id: string;
  eventType: AuditEventType;
  actorUserId?: string;
  actorIp?: string;
  resource?: string;
  action?: string;
  details?: Record<string, unknown> | null;
  createdAt: number;
}

export function mapAuditRow(row: AuditLogRow): AuditLog {
  let parsed: Record<string, unknown> | null = null;
  if (row.details) {
    try {
      const obj = JSON.parse(row.details);
      if (obj && typeof obj === 'object') parsed = obj as Record<string, unknown>;
    } catch {
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
