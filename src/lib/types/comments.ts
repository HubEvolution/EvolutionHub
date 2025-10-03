// Comment system types and interfaces
export type CommentStatus = 'pending' | 'approved' | 'rejected' | 'flagged' | 'hidden';
export type CommentEntityType = 'blog_post' | 'project' | 'general';
export type ModerationAction = 'approve' | 'reject' | 'flag' | 'hide' | 'unhide';
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'off_topic' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';
export type AuditAction = 'create' | 'update' | 'delete' | 'moderate' | 'report' | 'view';

export interface Comment {
  id: string;
  content: string;
  authorId: number;
  authorName: string;
  authorEmail: string;
  parentId?: string;
  entityType: CommentEntityType;
  entityId: string;
  status: CommentStatus;
  isEdited: boolean;
  editedAt?: number;
  createdAt: number;
  updatedAt: number;
  // Populated fields
  replies?: Comment[];
  moderationHistory?: CommentModeration[];
  reportCount?: number;
}

export interface CreateCommentRequest {
  content: string;
  parentId?: string;
  entityType: CommentEntityType;
  entityId: string;
  authorName?: string; // For guest users
  authorEmail?: string; // For guest users
}

export interface UpdateCommentRequest {
  content: string;
}

export interface CommentModeration {
  id: number;
  commentId: string;
  moderatorId?: number;
  action: ModerationAction;
  reason?: string;
  createdAt: number;
}

export interface CommentReport {
  id: number;
  commentId: string;
  reporterId?: number;
  reporterEmail?: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: number;
}

export interface CommentListResponse {
  comments: Comment[];
  total: number;
  hasMore: boolean;
}

export interface CommentStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  flagged: number;
  hidden: number;
}

export interface ModerateCommentRequest {
  action: ModerationAction;
  reason?: string;
}

export interface ReportCommentRequest {
  reason: ReportReason;
  description?: string;
  reporterEmail?: string; // For guest users
}

export interface CommentFilters {
  status?: CommentStatus;
  entityType?: CommentEntityType;
  entityId?: string;
  authorId?: number;
  limit?: number;
  offset?: number;
  includeReplies?: boolean;
}

export interface ModerationQueueItem {
  comment: Comment;
  reports: CommentReport[];
  latestModeration?: CommentModeration;
  priority: 'high' | 'medium' | 'low';
}

export interface CommentAuditLog {
  id: number;
  commentId: string;
  userId?: number;
  action: AuditAction;
  oldValues?: string; // JSON string of previous state (for updates)
  newValues?: string; // JSON string of new state (for updates)
  reason?: string; // Reason for the action (especially for moderation)
  ipAddress?: string; // Anonymized IP address
  userAgent?: string; // User agent string (truncated)
  metadata?: string; // Additional context data as JSON
  createdAt: number;
}

export interface AuditLogFilters {
  commentId?: string;
  userId?: number;
  action?: AuditAction;
  limit?: number;
  offset?: number;
  startDate?: number;
  endDate?: number;
}

export interface AuditLogListResponse {
  logs: CommentAuditLog[];
  total: number;
  hasMore: boolean;
}
