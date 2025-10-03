/**
 * TypeScript-Typdefinitionen für Datenmanagement & Export-System
 * GDPR-konforme Datenportabilität und Backup-Funktionalität
 */

export type ExportJobType = 'user_data' | 'comments' | 'notifications' | 'full_export';
export type ExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type ExportFormat = 'json' | 'csv' | 'xml';

export type DeletionRequestType = 'account_deletion' | 'data_export' | 'right_to_erasure';
export type DeletionRequestStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type BackupJobType = 'full' | 'comments' | 'users' | 'incremental';
export type BackupJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type MaintenanceType = 'cleanup' | 'optimization' | 'migration' | 'repair';
export type MaintenanceStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface DataExportJob {
  id: string;
  userId: number;
  type: ExportJobType;
  status: ExportJobStatus;
  format: ExportFormat;
  filePath?: string;
  fileSize?: number;
  downloadUrl?: string;
  expiresAt?: number;
  errorMessage?: string;
  requestedAt: number;
  completedAt?: number;
  downloadCount: number;
}

export interface DataDeletionRequest {
  id: string;
  userId: number;
  requestType: DeletionRequestType;
  status: DeletionRequestStatus;
  reason?: string;
  adminNotes?: string;
  verificationToken: string;
  expiresAt: number;
  processedAt?: number;
  processedBy?: number;
  createdAt: number;
}

export interface BackupJob {
  id: string;
  type: BackupJobType;
  status: BackupJobStatus;
  filePath?: string;
  fileSize?: number;
  checksum?: string;
  tablesIncluded?: string[];
  recordCount?: number;
  errorMessage?: string;
  startedAt?: number;
  completedAt?: number;
  triggeredBy?: number;
  isAutomated: boolean;
}

export interface SystemMaintenance {
  id: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  description: string;
  affectedTables?: string[];
  parameters?: Record<string, unknown>;
  logOutput?: string;
  startedAt?: number;
  completedAt?: number;
  triggeredBy?: number;
  isAutomated: boolean;
}

export interface ExportData {
  metadata: {
    exportId: string;
    userId: number;
    exportType: ExportJobType;
    format: ExportFormat;
    generatedAt: number;
    version: string;
  };
  user?: {
    id: number;
    email: string;
    name?: string;
    createdAt: number;
    profile?: Record<string, unknown>;
  };
  comments?: Array<{
    id: string;
    content: string;
    postId?: string;
    postTitle?: string;
    status: string;
    createdAt: number;
    updatedAt?: number;
    parentId?: string;
    author: {
      id: number;
      name?: string;
    };
  }>;
  notifications?: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: number;
    readAt?: number;
  }>;
  activity?: Array<{
    action: string;
    timestamp: number;
    details?: Record<string, unknown>;
  }>;
}

export interface ExportOptions {
  type: ExportJobType;
  format: ExportFormat;
  includeComments?: boolean;
  includeNotifications?: boolean;
  includeProfile?: boolean;
  dateFrom?: number;
  dateTo?: number;
}

export interface BackupOptions {
  type: BackupJobType;
  tables?: string[];
  incremental?: boolean;
  compression?: boolean;
  encryption?: boolean;
}

export interface GDPRComplianceData {
  dataCategories: string[];
  retentionPeriods: Record<string, number>;
  thirdPartyTransfers: string[];
  securityMeasures: string[];
  dataProcessingPurposes: string[];
  userRights: string[];
}

export interface DataRetentionPolicy {
  tableName: string;
  retentionDays: number;
  description: string;
  legalBasis?: string;
  autoDelete: boolean;
}

export interface ExportProgress {
  jobId: string;
  status: ExportJobStatus;
  progress: number; // 0-100
  currentStep?: string;
  estimatedTimeRemaining?: number;
  recordsProcessed?: number;
  totalRecords?: number;
}

export interface BackupProgress {
  jobId: string;
  status: BackupJobStatus;
  progress: number; // 0-100
  currentTable?: string;
  tablesProcessed?: string[];
  recordsProcessed?: number;
  totalRecords?: number;
  bytesProcessed?: number;
  totalBytes?: number;
}
