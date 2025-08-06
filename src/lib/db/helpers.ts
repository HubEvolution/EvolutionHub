/**
 * Sichere Helper-Funktionen für Cloudflare D1 Datenbankzugriffe
 * 
 * Diese Helper bieten typisierte, sichere und wiederverwendbare Methoden
 * für häufige Datenbankoperationen mit eingebauter Fehlerbehandlung.
 */

import type {
  User,
  SafeUser,
  Project,
  Activity,
  Comment,
  Task,
  Notification,
  Session,
  PasswordResetToken,
  CreateUser,
  CreateProject,
  CreateActivity,
  CreateComment,
  CreateTask,
  CreateNotification,
  UpdateUser,
  UpdateProject,
  UpdateTask,
  D1FirstResult,
  D1QueryResult,
  D1ExecuteResult
} from './types';

// =============================================================================
// ERROR HANDLING
// =============================================================================

export class DatabaseError extends Error {
  constructor(
    message: string,
    public operation: string,
    public table?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Wrapper für sichere Datenbankoperationen mit einheitlicher Fehlerbehandlung
 */
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  tableName?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Database operation '${operationName}' failed:`, error);
    throw new DatabaseError(
      `Failed to ${operationName}`,
      operationName,
      tableName,
      error instanceof Error ? error : undefined
    );
  }
}

// =============================================================================
// USER OPERATIONS
// =============================================================================

/**
 * Findet einen Benutzer anhand der ID
 */
export async function findUserById(db: D1Database, id: string): Promise<D1FirstResult<User>> {
  return safeDbOperation(async () => {
    return await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
  }, 'find user by id', 'users');
}

/**
 * Findet einen Benutzer anhand der E-Mail-Adresse
 */
export async function findUserByEmail(db: D1Database, email: string): Promise<D1FirstResult<User>> {
  return safeDbOperation(async () => {
    return await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<User>();
  }, 'find user by email', 'users');
}

/**
 * Findet einen Benutzer anhand des Benutzernamens
 */
export async function findUserByUsername(db: D1Database, username: string): Promise<D1FirstResult<User>> {
  return safeDbOperation(async () => {
    return await db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<User>();
  }, 'find user by username', 'users');
}

/**
 * Erstellt einen neuen Benutzer
 */
export async function createUser(db: D1Database, userData: CreateUser): Promise<User> {
  return safeDbOperation(async () => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const newUser: User = {
      ...userData,
      id,
      created_at: now
    };

    await db.prepare(`
      INSERT INTO users (id, name, username, full_name, email, image, password_hash, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
    `).bind(
      newUser.id,
      newUser.name,
      newUser.username,
      newUser.full_name || null,
      newUser.email,
      newUser.image || null,
      newUser.password_hash || null,
      newUser.created_at
    ).run();

    return newUser;
  }, 'create user', 'users');
}

/**
 * Aktualisiert einen Benutzer
 */
export async function updateUser(db: D1Database, id: string, updates: UpdateUser): Promise<D1ExecuteResult> {
  return safeDbOperation(async () => {
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    return await db.prepare(`UPDATE users SET ${setClause} WHERE id = ?`)
      .bind(...values, id)
      .run();
  }, 'update user', 'users');
}

/**
 * Konvertiert User zu SafeUser (ohne sensible Daten)
 */
export function toSafeUser(user: User): SafeUser {
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

// =============================================================================
// SESSION OPERATIONS
// =============================================================================

/**
 * Findet eine aktive Session anhand der ID
 */
export async function findSessionById(db: D1Database, sessionId: string): Promise<D1FirstResult<Session & { user: User }>> {
  return safeDbOperation(async () => {
    return await db.prepare(`
      SELECT s.*, u.id as user_id, u.name, u.username, u.full_name, u.email, u.image, u.created_at as user_created_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > datetime('now')
    `).bind(sessionId).first<Session & { user: User }>();
  }, 'find session by id', 'sessions');
}

/**
 * Erstellt eine neue Session
 */
export async function createSession(db: D1Database, userId: string, expiresAt: string): Promise<Session> {
  return safeDbOperation(async () => {
    const sessionId = crypto.randomUUID();
    
    const newSession: Session = {
      id: sessionId,
      user_id: userId,
      expires_at: expiresAt
    };

    await db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES (?1, ?2, ?3)
    `).bind(newSession.id, newSession.user_id, newSession.expires_at).run();

    return newSession;
  }, 'create session', 'sessions');
}

/**
 * Löscht eine Session (Logout)
 */
export async function deleteSession(db: D1Database, sessionId: string): Promise<D1ExecuteResult> {
  return safeDbOperation(async () => {
    return await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
  }, 'delete session', 'sessions');
}

/**
 * Löscht alle abgelaufenen Sessions
 */
export async function cleanupExpiredSessions(db: D1Database): Promise<D1ExecuteResult> {
  return safeDbOperation(async () => {
    return await db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
  }, 'cleanup expired sessions', 'sessions');
}

// =============================================================================
// PROJECT OPERATIONS
// =============================================================================

/**
 * Findet alle Projekte eines Benutzers
 */
export async function findProjectsByUserId(db: D1Database, userId: string): Promise<Project[]> {
  return safeDbOperation(async () => {
    const result = await db.prepare(`
      SELECT * FROM projects 
      WHERE user_id = ? 
      ORDER BY updated_at DESC
    `).bind(userId).all<Project>();
    
    return result.results;
  }, 'find projects by user id', 'projects');
}

/**
 * Findet ein Projekt anhand der ID
 */
export async function findProjectById(db: D1Database, id: string): Promise<D1FirstResult<Project>> {
  return safeDbOperation(async () => {
    return await db.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first<Project>();
  }, 'find project by id', 'projects');
}

/**
 * Erstellt ein neues Projekt
 */
export async function createProject(db: D1Database, projectData: CreateProject): Promise<Project> {
  return safeDbOperation(async () => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const newProject: Project = {
      ...projectData,
      id,
      created_at: now,
      updated_at: now
    };

    await db.prepare(`
      INSERT INTO projects (id, user_id, title, description, progress, status, created_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
    `).bind(
      newProject.id,
      newProject.user_id,
      newProject.title,
      newProject.description || null,
      newProject.progress,
      newProject.status,
      newProject.created_at,
      newProject.updated_at
    ).run();

    return newProject;
  }, 'create project', 'projects');
}

/**
 * Aktualisiert ein Projekt
 */
export async function updateProject(db: D1Database, id: string, updates: UpdateProject): Promise<D1ExecuteResult> {
  return safeDbOperation(async () => {
    const now = new Date().toISOString();
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    return await db.prepare(`UPDATE projects SET ${setClause}, updated_at = ? WHERE id = ?`)
      .bind(...values, now, id)
      .run();
  }, 'update project', 'projects');
}

// =============================================================================
// ACTIVITY OPERATIONS
// =============================================================================

/**
 * Erstellt eine neue Aktivität
 */
export async function createActivity(db: D1Database, activityData: CreateActivity): Promise<Activity> {
  return safeDbOperation(async () => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const newActivity: Activity = {
      ...activityData,
      id,
      created_at: now
    };

    await db.prepare(`
      INSERT INTO activities (id, user_id, action, target_id, target_type, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6)
    `).bind(
      newActivity.id,
      newActivity.user_id,
      newActivity.action,
      newActivity.target_id || null,
      newActivity.target_type || null,
      newActivity.created_at
    ).run();

    return newActivity;
  }, 'create activity', 'activities');
}

/**
 * Findet Aktivitäten eines Benutzers
 */
export async function findActivitiesByUserId(db: D1Database, userId: string, limit: number = 10): Promise<Activity[]> {
  return safeDbOperation(async () => {
    const result = await db.prepare(`
      SELECT a.*, u.name as user_name, u.image as user_image
      FROM activities a
      JOIN users u ON a.user_id = u.id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
      LIMIT ?
    `).bind(userId, limit).all<Activity & { user_name: string; user_image?: string }>();
    
    return result.results;
  }, 'find activities by user id', 'activities');
}

// =============================================================================
// TASK OPERATIONS
// =============================================================================

/**
 * Findet alle Tasks eines Benutzers
 */
export async function findTasksByUserId(db: D1Database, userId: string): Promise<Task[]> {
  return safeDbOperation(async () => {
    const result = await db.prepare(`
      SELECT * FROM tasks 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).bind(userId).all<Task>();
    
    return result.results;
  }, 'find tasks by user id', 'tasks');
}

/**
 * Erstellt eine neue Task
 */
export async function createTask(db: D1Database, taskData: CreateTask): Promise<Task> {
  return safeDbOperation(async () => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const newTask: Task = {
      ...taskData,
      id,
      created_at: now
    };

    await db.prepare(`
      INSERT INTO tasks (id, user_id, project_id, title, description, status, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
    `).bind(
      newTask.id,
      newTask.user_id,
      newTask.project_id || null,
      newTask.title,
      newTask.description || null,
      newTask.status,
      newTask.created_at
    ).run();

    return newTask;
  }, 'create task', 'tasks');
}

// =============================================================================
// NOTIFICATION OPERATIONS
// =============================================================================

/**
 * Findet Benachrichtigungen eines Benutzers
 */
export async function findNotificationsByUserId(db: D1Database, userId: string, limit: number = 10): Promise<Notification[]> {
  return safeDbOperation(async () => {
    const result = await db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `).bind(userId, limit).all<Notification>();
    
    return result.results;
  }, 'find notifications by user id', 'notifications');
}

/**
 * Erstellt eine neue Benachrichtigung
 */
export async function createNotification(db: D1Database, notificationData: CreateNotification): Promise<Notification> {
  return safeDbOperation(async () => {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000); // Unix timestamp
    
    const newNotification: Notification = {
      ...notificationData,
      id,
      created_at: now
    };

    await db.prepare(`
      INSERT INTO notifications (id, user_id, message, type, read, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6)
    `).bind(
      newNotification.id,
      newNotification.user_id,
      newNotification.message,
      newNotification.type,
      newNotification.read,
      newNotification.created_at
    ).run();

    return newNotification;
  }, 'create notification', 'notifications');
}

// =============================================================================
// COMMENT OPERATIONS
// =============================================================================

/**
 * Findet Kommentare für einen Post
 */
export async function findCommentsByPostId(db: D1Database, postId: string): Promise<Comment[]> {
  return safeDbOperation(async () => {
    const result = await db.prepare(`
      SELECT * FROM comments 
      WHERE postId = ? AND approved = 1 
      ORDER BY createdAt DESC
    `).bind(postId).all<Comment>();
    
    return result.results;
  }, 'find comments by post id', 'comments');
}

/**
 * Erstellt einen neuen Kommentar
 */
export async function createComment(db: D1Database, commentData: CreateComment): Promise<Comment> {
  return safeDbOperation(async () => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const newComment: Comment = {
      ...commentData,
      id,
      createdAt: now,
      approved: 0 // Default: nicht genehmigt
    };

    await db.prepare(`
      INSERT INTO comments (id, postId, author, content, createdAt, approved)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6)
    `).bind(
      newComment.id,
      newComment.postId,
      newComment.author,
      newComment.content,
      newComment.createdAt,
      newComment.approved
    ).run();

    return newComment;
  }, 'create comment', 'comments');
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Zählt Datensätze in einer Tabelle für einen Benutzer
 */
export async function countUserRecords(db: D1Database, table: string, userId: string): Promise<number> {
  return safeDbOperation(async () => {
    const result = await db.prepare(`SELECT count(*) as count FROM ${table} WHERE user_id = ?`)
      .bind(userId)
      .first<{ count: number }>();
    
    return result?.count || 0;
  }, `count user records in ${table}`, table);
}

/**
 * Batch-Operation für mehrere Statements
 */
export async function executeBatch(db: D1Database, statements: D1PreparedStatement[]): Promise<D1ExecuteResult[]> {
  return safeDbOperation(async () => {
    return await db.batch(statements);
  }, 'execute batch operation');
}
