/**
 * Typisierte Interfaces für Cloudflare D1 Datenbankzugriffe
 * 
 * Diese Interfaces spiegeln die Datenbankstruktur aus den Migrationsdateien wider
 * und sorgen für Type-Safety bei allen Datenbankoperationen.
 */

// =============================================================================
// CORE DATABASE TYPES
// =============================================================================

/**
 * User-Entity - Haupttabelle für Benutzer
 */
export interface User {
  id: string;
  name: string;
  username: string;
  full_name?: string | null;
  email: string;
  image?: string | null;
  password_hash?: string | null; // Hinzugefügt in Migration 0002
  created_at: string;
}

/**
 * User-Entity ohne sensible Daten (für API-Responses)
 */
export interface SafeUser {
  id: string;
  name: string;
  username: string;
  full_name?: string | null;
  email: string;
  image?: string | null;
  created_at: string;
}

/**
 * Session-Entity für Benutzerauthentifizierung
 */
export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
}

/**
 * Project-Entity
 */
export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  progress: number;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  updated_at: string;
}

/**
 * Activity-Entity für Benutzeraktivitäten
 */
export interface Activity {
  id: string;
  user_id: string;
  action: string;
  target_id?: string | null;
  target_type?: string | null;
  created_at: string;
}

/**
 * Comment-Entity für Blog-Kommentare
 */
export interface Comment {
  id: string;
  postId: string;
  author: string;
  content: string;
  createdAt: string;
  approved: number; // 0 = false, 1 = true (SQLite boolean)
}

/**
 * PasswordResetToken-Entity
 */
export interface PasswordResetToken {
  id: string;
  user_id: string;
  expires_at: string;
}

/**
 * Task-Entity
 */
export interface Task {
  id: string;
  user_id: string;
  project_id?: string | null;
  title: string;
  description?: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
}

/**
 * Notification-Entity
 */
export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: 'comment' | 'mention' | 'task_completed' | 'system';
  read: number; // 0 = false, 1 = true (SQLite boolean)
  created_at: number; // Unix timestamp
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Basis-Type für alle DB-Entities mit ID und Timestamps
 */
export interface BaseEntity {
  id: string;
  created_at: string;
}

/**
 * Type für Entities mit Update-Timestamp
 */
export interface UpdatableEntity extends BaseEntity {
  updated_at: string;
}

/**
 * Type für Create-Operationen (ohne ID und Timestamps)
 */
export type CreateUser = Omit<User, 'id' | 'created_at'>;
export type CreateProject = Omit<Project, 'id' | 'created_at' | 'updated_at'>;
export type CreateActivity = Omit<Activity, 'id' | 'created_at'>;
export type CreateComment = Omit<Comment, 'id' | 'createdAt'>;
export type CreateTask = Omit<Task, 'id' | 'created_at'>;
export type CreateNotification = Omit<Notification, 'id' | 'created_at'>;

/**
 * Type für Update-Operationen (nur änderbare Felder)
 */
export type UpdateUser = Partial<Pick<User, 'name' | 'username' | 'full_name' | 'email' | 'image'>>;
export type UpdateProject = Partial<Pick<Project, 'title' | 'description' | 'progress' | 'status'>>;
export type UpdateTask = Partial<Pick<Task, 'title' | 'description' | 'status'>>;

// =============================================================================
// CLOUDFLARE D1 SPECIFIC TYPES
// =============================================================================

/**
 * Standard D1 Query Result für SELECT-Operationen
 */
export interface D1QueryResult<T = any> {
  results: T[];
  success: boolean;
  meta: {
    changed_db: boolean;
    changes: number;
    duration: number;
    last_row_id?: number;
    rows_read: number;
    rows_written: number;
    size_after: number;
  };
}

/**
 * D1 Result für INSERT/UPDATE/DELETE-Operationen
 */
export interface D1ExecuteResult {
  success: boolean;
  meta: {
    changed_db: boolean;
    changes: number;
    duration: number;
    last_row_id?: number;
    rows_read: number;
    rows_written: number;
    size_after: number;
  };
}

/**
 * D1 Result für .first() Aufrufe
 */
export type D1FirstResult<T> = T | null;

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Standard API Response mit typisiertem Data-Feld
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginierte API Response
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =============================================================================
// VALIDATION SCHEMAS (für zukünftige Nutzung)
// =============================================================================

/**
 * Validation Schema Types (kann später mit Zod erweitert werden)
 */
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors?: ValidationError[];
}
