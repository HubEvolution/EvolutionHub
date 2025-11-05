"use strict";
/**
 * Sichere Helper-Funktionen für Cloudflare D1 Datenbankzugriffe
 *
 * Diese Helper bieten typisierte, sichere und wiederverwendbare Methoden
 * für häufige Datenbankoperationen mit eingebauter Fehlerbehandlung.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseError = void 0;
exports.safeDbOperation = safeDbOperation;
exports.findUserById = findUserById;
exports.findUserByEmail = findUserByEmail;
exports.findUserByUsername = findUserByUsername;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.toSafeUser = toSafeUser;
exports.findSessionById = findSessionById;
exports.createSession = createSession;
exports.deleteSession = deleteSession;
exports.cleanupExpiredSessions = cleanupExpiredSessions;
exports.findProjectsByUserId = findProjectsByUserId;
exports.findProjectById = findProjectById;
exports.createProject = createProject;
exports.updateProject = updateProject;
exports.createActivity = createActivity;
exports.findActivitiesByUserId = findActivitiesByUserId;
exports.findTasksByUserId = findTasksByUserId;
exports.createTask = createTask;
exports.findNotificationsByUserId = findNotificationsByUserId;
exports.createNotification = createNotification;
exports.findCommentsByPostId = findCommentsByPostId;
exports.createComment = createComment;
exports.countUserRecords = countUserRecords;
exports.executeBatch = executeBatch;
// =============================================================================
// ERROR HANDLING
// =============================================================================
class DatabaseError extends Error {
    constructor(message, operation, table, originalError) {
        super(message);
        this.operation = operation;
        this.table = table;
        this.originalError = originalError;
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
/**
 * Wrapper für sichere Datenbankoperationen mit einheitlicher Fehlerbehandlung
 */
async function safeDbOperation(operation, operationName, tableName) {
    try {
        return await operation();
    }
    catch (error) {
        console.error(`Database operation '${operationName}' failed:`, error);
        throw new DatabaseError(`Failed to ${operationName}`, operationName, tableName, error instanceof Error ? error : undefined);
    }
}
// =============================================================================
// USER OPERATIONS
// =============================================================================
/**
 * Findet einen Benutzer anhand der ID
 */
async function findUserById(db, id) {
    return safeDbOperation(async () => {
        return await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
    }, 'find user by id', 'users');
}
/**
 * Findet einen Benutzer anhand der E-Mail-Adresse
 */
async function findUserByEmail(db, email) {
    return safeDbOperation(async () => {
        return await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    }, 'find user by email', 'users');
}
/**
 * Findet einen Benutzer anhand des Benutzernamens
 */
async function findUserByUsername(db, username) {
    return safeDbOperation(async () => {
        return await db
            .prepare('SELECT * FROM users WHERE username = ?')
            .bind(username)
            .first();
    }, 'find user by username', 'users');
}
/**
 * Erstellt einen neuen Benutzer
 */
async function createUser(db, userData) {
    return safeDbOperation(async () => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const newUser = {
            ...userData,
            id,
            created_at: now,
        };
        await db
            .prepare(`
      INSERT INTO users (id, name, username, full_name, email, image, password_hash, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
    `)
            .bind(newUser.id, newUser.name, newUser.username, newUser.full_name || null, newUser.email, newUser.image || null, newUser.password_hash || null, newUser.created_at)
            .run();
        return newUser;
    }, 'create user', 'users');
}
/**
 * Aktualisiert einen Benutzer
 */
async function updateUser(db, id, updates) {
    return safeDbOperation(async () => {
        const setClause = Object.keys(updates)
            .map((key) => `${key} = ?`)
            .join(', ');
        const values = Object.values(updates);
        return await db
            .prepare(`UPDATE users SET ${setClause} WHERE id = ?`)
            .bind(...values, id)
            .run();
    }, 'update user', 'users');
}
/**
 * Konvertiert User zu SafeUser (ohne sensible Daten)
 */
function toSafeUser(user) {
    const { password_hash: _password_hash, ...safeUser } = user;
    return safeUser;
}
// =============================================================================
// SESSION OPERATIONS
// =============================================================================
/**
 * Findet eine aktive Session anhand der ID
 */
async function findSessionById(db, sessionId) {
    return safeDbOperation(async () => {
        return await db
            .prepare(`
      SELECT s.*, u.id as user_id, u.name, u.username, u.full_name, u.email, u.image, u.created_at as user_created_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > datetime('now')
    `)
            .bind(sessionId)
            .first();
    }, 'find session by id', 'sessions');
}
/**
 * Erstellt eine neue Session
 */
async function createSession(db, userId, expiresAt) {
    return safeDbOperation(async () => {
        const sessionId = crypto.randomUUID();
        const newSession = {
            id: sessionId,
            user_id: userId,
            expires_at: expiresAt,
        };
        await db
            .prepare(`
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES (?1, ?2, ?3)
    `)
            .bind(newSession.id, newSession.user_id, newSession.expires_at)
            .run();
        return newSession;
    }, 'create session', 'sessions');
}
/**
 * Löscht eine Session (Logout)
 */
async function deleteSession(db, sessionId) {
    return safeDbOperation(async () => {
        return await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
    }, 'delete session', 'sessions');
}
/**
 * Löscht alle abgelaufenen Sessions
 */
async function cleanupExpiredSessions(db) {
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
async function findProjectsByUserId(db, userId) {
    return safeDbOperation(async () => {
        const result = await db
            .prepare(`
      SELECT * FROM projects 
      WHERE user_id = ? 
      ORDER BY updated_at DESC
    `)
            .bind(userId)
            .all();
        return result.results;
    }, 'find projects by user id', 'projects');
}
/**
 * Findet ein Projekt anhand der ID
 */
async function findProjectById(db, id) {
    return safeDbOperation(async () => {
        return await db.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
    }, 'find project by id', 'projects');
}
/**
 * Erstellt ein neues Projekt
 */
async function createProject(db, projectData) {
    return safeDbOperation(async () => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const newProject = {
            ...projectData,
            id,
            created_at: now,
            updated_at: now,
        };
        await db
            .prepare(`
      INSERT INTO projects (id, user_id, title, description, progress, status, created_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
    `)
            .bind(newProject.id, newProject.user_id, newProject.title, newProject.description || null, newProject.progress, newProject.status, newProject.created_at, newProject.updated_at)
            .run();
        return newProject;
    }, 'create project', 'projects');
}
/**
 * Aktualisiert ein Projekt
 */
async function updateProject(db, id, updates) {
    return safeDbOperation(async () => {
        const now = new Date().toISOString();
        const setClause = Object.keys(updates)
            .map((key) => `${key} = ?`)
            .join(', ');
        const values = Object.values(updates);
        return await db
            .prepare(`UPDATE projects SET ${setClause}, updated_at = ? WHERE id = ?`)
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
async function createActivity(db, activityData) {
    return safeDbOperation(async () => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const newActivity = {
            ...activityData,
            id,
            created_at: now,
        };
        await db
            .prepare(`
      INSERT INTO activities (id, user_id, action, target_id, target_type, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6)
    `)
            .bind(newActivity.id, newActivity.user_id, newActivity.action, newActivity.target_id || null, newActivity.target_type || null, newActivity.created_at)
            .run();
        return newActivity;
    }, 'create activity', 'activities');
}
/**
 * Findet Aktivitäten eines Benutzers
 */
async function findActivitiesByUserId(db, userId, limit = 10) {
    return safeDbOperation(async () => {
        const result = await db
            .prepare(`
      SELECT a.*, u.name as user_name, u.image as user_image
      FROM activities a
      JOIN users u ON a.user_id = u.id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
      LIMIT ?
    `)
            .bind(userId, limit)
            .all();
        return result.results;
    }, 'find activities by user id', 'activities');
}
// =============================================================================
// TASK OPERATIONS
// =============================================================================
/**
 * Findet alle Tasks eines Benutzers
 */
async function findTasksByUserId(db, userId) {
    return safeDbOperation(async () => {
        const result = await db
            .prepare(`
      SELECT * FROM tasks 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `)
            .bind(userId)
            .all();
        return result.results;
    }, 'find tasks by user id', 'tasks');
}
/**
 * Erstellt eine neue Task
 */
async function createTask(db, taskData) {
    return safeDbOperation(async () => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const newTask = {
            ...taskData,
            id,
            created_at: now,
        };
        await db
            .prepare(`
      INSERT INTO tasks (id, user_id, project_id, title, description, status, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
    `)
            .bind(newTask.id, newTask.user_id, newTask.project_id || null, newTask.title, newTask.description || null, newTask.status, newTask.created_at)
            .run();
        return newTask;
    }, 'create task', 'tasks');
}
// =============================================================================
// NOTIFICATION OPERATIONS
// =============================================================================
/**
 * Findet Benachrichtigungen eines Benutzers
 */
async function findNotificationsByUserId(db, userId, limit = 10) {
    return safeDbOperation(async () => {
        const result = await db
            .prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `)
            .bind(userId, limit)
            .all();
        return result.results;
    }, 'find notifications by user id', 'notifications');
}
/**
 * Erstellt eine neue Benachrichtigung
 */
async function createNotification(db, notificationData) {
    return safeDbOperation(async () => {
        const id = crypto.randomUUID();
        const now = Math.floor(Date.now() / 1000); // Unix timestamp
        const newNotification = {
            ...notificationData,
            id,
            created_at: now,
        };
        await db
            .prepare(`
      INSERT INTO notifications (id, user_id, message, type, read, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6)
    `)
            .bind(newNotification.id, newNotification.user_id, newNotification.message, newNotification.type, newNotification.read, newNotification.created_at)
            .run();
        return newNotification;
    }, 'create notification', 'notifications');
}
// =============================================================================
// COMMENT OPERATIONS
// =============================================================================
/**
 * Findet Kommentare für einen Post
 */
async function findCommentsByPostId(db, postId) {
    return safeDbOperation(async () => {
        const result = await db
            .prepare(`
      SELECT * FROM comments 
      WHERE postId = ? AND approved = 1 
      ORDER BY createdAt DESC
    `)
            .bind(postId)
            .all();
        return result.results;
    }, 'find comments by post id', 'comments');
}
/**
 * Erstellt einen neuen Kommentar
 */
async function createComment(db, commentData) {
    return safeDbOperation(async () => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const newComment = {
            ...commentData,
            id,
            createdAt: now,
            approved: 0, // Default: nicht genehmigt
        };
        await db
            .prepare(`
      INSERT INTO comments (id, postId, author, content, createdAt, approved)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6)
    `)
            .bind(newComment.id, newComment.postId, newComment.author, newComment.content, newComment.createdAt, newComment.approved)
            .run();
        return newComment;
    }, 'create comment', 'comments');
}
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
/**
 * Zählt Datensätze in einer Tabelle für einen Benutzer
 */
async function countUserRecords(db, table, userId) {
    return safeDbOperation(async () => {
        const result = await db
            .prepare(`SELECT count(*) as count FROM ${table} WHERE user_id = ?`)
            .bind(userId)
            .first();
        return result?.count || 0;
    }, `count user records in ${table}`, table);
}
/**
 * Batch-Operation für mehrere Statements
 */
async function executeBatch(db, statements) {
    return safeDbOperation(async () => {
        return await db.batch(statements);
    }, 'execute batch operation');
}
