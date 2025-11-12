'use strict';
/**
 * Daten-Export-Service für GDPR-konforme Datenportabilität
 * Unterstützt verschiedene Export-Formate und Datenkategorien
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.DataExportService = void 0;
const drizzle_orm_1 = require('drizzle-orm');
const schema_1 = require('../db/schema');
const logger_1 = require('@/server/utils/logger');
class DataExportService {
  constructor(db) {
    this.db = db;
  }
  /**
   * Erstellt einen neuen Datenexport-Job
   */
  async createExportJob(userId, options) {
    const jobId = crypto.randomUUID();
    await this.db.insert(schema_1.dataExportJobs).values({
      id: jobId,
      userId,
      type: options.type,
      status: 'pending',
      format: options.format,
      requestedAt: new Date(),
      downloadCount: 0,
    });
    // Starte asynchrone Verarbeitung
    this.processExportJob(jobId).catch((err) =>
      (0, logger_1.log)('error', 'processExportJob unhandled error', {
        jobId,
        errorMessage: err instanceof Error ? err.message : String(err),
      })
    );
    return jobId;
  }
  /**
   * Verarbeitet einen Export-Job asynchron
   */
  async processExportJob(jobId) {
    try {
      // Update job status zu processing
      await this.db
        .update(schema_1.dataExportJobs)
        .set({
          status: 'processing',
        })
        .where((0, drizzle_orm_1.eq)(schema_1.dataExportJobs.id, jobId));
      // Hole Job-Details
      const job = await this.db
        .select()
        .from(schema_1.dataExportJobs)
        .where((0, drizzle_orm_1.eq)(schema_1.dataExportJobs.id, jobId))
        .limit(1);
      if (!job[0]) {
        throw new Error('Export job not found');
      }
      // Sammle Daten basierend auf Export-Typ
      const exportData = await this.collectExportData(job[0].userId, {
        type: job[0].type,
        format: job[0].format,
      });
      // Konvertiere zu gewünschtem Format
      const fileContent = this.formatExportData(exportData, job[0].format);
      // Speichere Datei in R2 (simuliert hier)
      const filePath = await this.saveToStorage(jobId, fileContent);
      // Erstelle temporäre Download-URL
      const downloadUrl = await this.generateDownloadUrl(jobId, filePath);
      // Update job mit Ergebnis
      await this.db
        .update(schema_1.dataExportJobs)
        .set({
          status: 'completed',
          filePath,
          fileSize: fileContent.length,
          downloadUrl,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 Tage gültig
          completedAt: new Date(),
        })
        .where((0, drizzle_orm_1.eq)(schema_1.dataExportJobs.id, jobId));
    } catch (error) {
      (0, logger_1.log)('error', 'Export job failed', {
        jobId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      // Update job mit Fehler
      await this.db
        .update(schema_1.dataExportJobs)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        })
        .where((0, drizzle_orm_1.eq)(schema_1.dataExportJobs.id, jobId));
    }
  }
  /**
   * Sammelt Daten für Export basierend auf Typ und Optionen
   */
  async collectExportData(userId, options) {
    const exportData = {
      metadata: {
        exportId: crypto.randomUUID(),
        userId,
        exportType: options.type,
        format: options.format,
        generatedAt: Date.now(),
        version: '1.0',
      },
      user: undefined,
      comments: undefined,
      notifications: undefined,
      activity: undefined,
    };
    // Hole Benutzerdaten
    if (options.type === 'user_data' || options.type === 'full_export') {
      const userData = await this.db
        .select({
          id: schema_1.users.id,
          email: schema_1.users.email,
          name: schema_1.users.name,
          createdAt: schema_1.users.createdAt,
        })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
        .limit(1);
      if (userData[0]) {
        exportData.user = {
          id: userData[0].id,
          email: userData[0].email,
          name: userData[0].name || undefined,
          createdAt: userData[0].createdAt.getTime?.() ?? Number(userData[0].createdAt),
        };
      }
    }
    // Hole Kommentare
    if (options.type === 'comments' || options.type === 'full_export') {
      const commentsData = await this.db
        .select({
          id: schema_1.comments.id,
          content: schema_1.comments.content,
          postId: schema_1.comments.entityId,
          status: schema_1.comments.status,
          createdAt: schema_1.comments.createdAt,
          updatedAt: schema_1.comments.updatedAt,
          parentId: schema_1.comments.parentId,
        })
        .from(schema_1.comments)
        .where((0, drizzle_orm_1.eq)(schema_1.comments.authorId, userId));
      exportData.comments = commentsData.map((c) => ({
        id: c.id,
        content: c.content,
        postId: c.postId || undefined,
        status: String(c.status),
        createdAt: c.createdAt.getTime?.() ?? Number(c.createdAt),
        updatedAt:
          c.updatedAt != null ? (c.updatedAt.getTime?.() ?? Number(c.updatedAt)) : undefined,
        parentId: c.parentId || undefined,
        author: { id: userId, name: exportData.user?.name },
      }));
    }
    // Hole Benachrichtigungen
    if (options.type === 'notifications' || options.type === 'full_export') {
      const notificationsData = await this.db
        .select()
        .from(schema_1.notifications)
        .where((0, drizzle_orm_1.eq)(schema_1.notifications.userId, userId));
      exportData.notifications = notificationsData.map((n) => ({
        id: n.id,
        type: String(n.type),
        title: n.title,
        message: n.message,
        isRead: Boolean(n.isRead),
        createdAt: n.createdAt.getTime?.() ?? Number(n.createdAt),
        readAt: n.readAt != null ? (n.readAt.getTime?.() ?? Number(n.readAt)) : undefined,
      }));
    }
    return exportData;
  }
  /**
   * Formatiert Export-Daten in gewünschtes Format
   */
  formatExportData(data, format) {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.convertToCSV(data);
      case 'xml':
        return this.convertToXML(data);
      default:
        return JSON.stringify(data, null, 2);
    }
  }
  /**
   * Konvertiert Daten zu CSV-Format
   */
  convertToCSV(data) {
    const lines = [];
    // Metadata
    lines.push('Metadata');
    lines.push('exportId,userId,exportType,format,generatedAt,version');
    lines.push(
      `${data.metadata.exportId},${data.metadata.userId},${data.metadata.exportType},${data.metadata.format},${data.metadata.generatedAt},${data.metadata.version}`
    );
    // User data
    if (data.user) {
      lines.push('');
      lines.push('User Data');
      lines.push('id,email,name,createdAt');
      lines.push(
        `${data.user.id},${data.user.email},${data.user.name || ''},${data.user.createdAt}`
      );
    }
    // Comments
    if (data.comments && data.comments.length > 0) {
      lines.push('');
      lines.push('Comments');
      lines.push('id,content,postId,status,createdAt,updatedAt,parentId,authorName');
      data.comments.forEach((comment) => {
        lines.push(
          `${comment.id},"${comment.content}",${comment.postId || ''},${comment.status},${comment.createdAt},${comment.updatedAt || ''},${comment.parentId || ''},"${comment.author.name || ''}"`
        );
      });
    }
    // Notifications
    if (data.notifications && data.notifications.length > 0) {
      lines.push('');
      lines.push('Notifications');
      lines.push('id,type,title,message,isRead,createdAt,readAt');
      data.notifications.forEach((notification) => {
        lines.push(
          `${notification.id},${notification.type},"${notification.title}","${notification.message}",${notification.isRead},${notification.createdAt},${notification.readAt || ''}`
        );
      });
    }
    return lines.join('\n');
  }
  /**
   * Konvertiert Daten zu XML-Format
   */
  convertToXML(data) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<data_export>\n';
    // Metadata
    xml += '  <metadata>\n';
    xml += `    <export_id>${data.metadata.exportId}</export_id>\n`;
    xml += `    <user_id>${data.metadata.userId}</user_id>\n`;
    xml += `    <export_type>${data.metadata.exportType}</export_type>\n`;
    xml += `    <format>${data.metadata.format}</format>\n`;
    xml += `    <generated_at>${data.metadata.generatedAt}</generated_at>\n`;
    xml += `    <version>${data.metadata.version}</version>\n`;
    xml += '  </metadata>\n';
    // User data
    if (data.user) {
      xml += '  <user>\n';
      xml += `    <id>${data.user.id}</id>\n`;
      xml += `    <email>${data.user.email}</email>\n`;
      xml += `    <name>${data.user.name || ''}</name>\n`;
      xml += `    <created_at>${data.user.createdAt}</created_at>\n`;
      xml += '  </user>\n';
    }
    // Comments
    if (data.comments && data.comments.length > 0) {
      xml += '  <comments>\n';
      data.comments.forEach((comment) => {
        xml += '    <comment>\n';
        xml += `      <id>${comment.id}</id>\n`;
        xml += `      <content><![CDATA[${comment.content}]]></content>\n`;
        xml += `      <post_id>${comment.postId || ''}</post_id>\n`;
        xml += `      <status>${comment.status}</status>\n`;
        xml += `      <created_at>${comment.createdAt}</created_at>\n`;
        xml += `      <updated_at>${comment.updatedAt || ''}</updated_at>\n`;
        xml += `      <parent_id>${comment.parentId || ''}</parent_id>\n`;
        xml += `      <author_name>${comment.author.name || ''}</author_name>\n`;
        xml += '    </comment>\n';
      });
      xml += '  </comments>\n';
    }
    // Notifications
    if (data.notifications && data.notifications.length > 0) {
      xml += '  <notifications>\n';
      data.notifications.forEach((notification) => {
        xml += '    <notification>\n';
        xml += `      <id>${notification.id}</id>\n`;
        xml += `      <type>${notification.type}</type>\n`;
        xml += `      <title><![CDATA[${notification.title}]]></title>\n`;
        xml += `      <message><![CDATA[${notification.message}]]></message>\n`;
        xml += `      <is_read>${notification.isRead}</is_read>\n`;
        xml += `      <created_at>${notification.createdAt}</created_at>\n`;
        xml += `      <read_at>${notification.readAt || ''}</read_at>\n`;
        xml += '    </notification>\n';
      });
      xml += '  </notifications>\n';
    }
    xml += '</data_export>';
    return xml;
  }
  /**
   * Speichert Export-Datei in R2 Storage (simuliert)
   */
  async saveToStorage(jobId, content) {
    // In einer echten Implementierung würde hier R2 verwendet
    const filePath = `exports/${jobId}.json`;
    // Simuliere Storage-Operation
    (0, logger_1.log)('info', 'Saving export', { jobId, filePath, size: content.length });
    return filePath;
  }
  /**
   * Erstellt temporäre Download-URL
   */
  async generateDownloadUrl(jobId, _filePath) {
    // In einer echten Implementierung würde hier eine signierte URL erstellt
    const baseUrl = process.env.BASE_URL || 'http://localhost:8787';
    const expires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 Tage
    return `${baseUrl}/api/data-export/download/${jobId}?expires=${expires}`;
  }
  /**
   * Holt Export-Job-Details
   */
  async getExportJob(jobId) {
    const jobs = await this.db
      .select()
      .from(schema_1.dataExportJobs)
      .where((0, drizzle_orm_1.eq)(schema_1.dataExportJobs.id, jobId))
      .limit(1);
    const row = jobs[0];
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      type: row.type,
      status: row.status ?? 'pending',
      format: row.format ?? 'json',
      filePath: row.filePath ?? undefined,
      fileSize: row.fileSize ?? undefined,
      downloadUrl: row.downloadUrl ?? undefined,
      expiresAt: row.expiresAt ? (row.expiresAt.getTime?.() ?? Number(row.expiresAt)) : undefined,
      errorMessage: row.errorMessage ?? undefined,
      requestedAt: row.requestedAt.getTime?.() ?? Number(row.requestedAt),
      completedAt:
        row.completedAt != null
          ? (row.completedAt.getTime?.() ?? Number(row.completedAt))
          : undefined,
      downloadCount: row.downloadCount ?? 0,
    };
  }
  /**
   * Holt alle Export-Jobs für einen Benutzer
   */
  async getUserExportJobs(userId) {
    const rows = await this.db
      .select()
      .from(schema_1.dataExportJobs)
      .where((0, drizzle_orm_1.eq)(schema_1.dataExportJobs.userId, userId))
      .orderBy((0, drizzle_orm_1.desc)(schema_1.dataExportJobs.requestedAt));
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      type: row.type,
      status: row.status ?? 'pending',
      format: row.format ?? 'json',
      filePath: row.filePath ?? undefined,
      fileSize: row.fileSize ?? undefined,
      downloadUrl: row.downloadUrl ?? undefined,
      expiresAt: row.expiresAt ? (row.expiresAt.getTime?.() ?? Number(row.expiresAt)) : undefined,
      errorMessage: row.errorMessage ?? undefined,
      requestedAt: row.requestedAt.getTime?.() ?? Number(row.requestedAt),
      completedAt:
        row.completedAt != null
          ? (row.completedAt.getTime?.() ?? Number(row.completedAt))
          : undefined,
      downloadCount: row.downloadCount ?? 0,
    }));
  }
  /**
   * Holt Export-Fortschritt
   */
  async getExportProgress(jobId) {
    const job = await this.getExportJob(jobId);
    if (!job) return null;
    return {
      jobId: job.id,
      status: job.status,
      progress: job.status === 'completed' ? 100 : job.status === 'failed' ? 0 : 50,
      currentStep: job.status === 'processing' ? 'Exporting data...' : undefined,
      recordsProcessed: job.status === 'completed' ? 1 : 0,
      totalRecords: 1,
    };
  }
  /**
   * Löscht abgelaufene Export-Jobs
   */
  async cleanupExpiredExports() {
    const expiredJobs = await this.db
      .select()
      .from(schema_1.dataExportJobs)
      .where(
        (0, drizzle_orm_1.and)(
          (0, drizzle_orm_1.eq)(schema_1.dataExportJobs.status, 'completed'),
          (0, drizzle_orm_1.lte)(schema_1.dataExportJobs.expiresAt, new Date())
        )
      );
    if (expiredJobs.length === 0) return 0;
    // Lösche abgelaufene Jobs
    await this.db
      .delete(schema_1.dataExportJobs)
      .where(
        (0, drizzle_orm_1.and)(
          (0, drizzle_orm_1.eq)(schema_1.dataExportJobs.status, 'completed'),
          (0, drizzle_orm_1.lte)(schema_1.dataExportJobs.expiresAt, new Date())
        )
      );
    return expiredJobs.length;
  }
  /**
   * Erstellt Datenlösch-Anfrage (GDPR Right to Erasure)
   */
  async createDeletionRequest(userId, reason) {
    const requestId = crypto.randomUUID();
    const verificationToken = crypto.randomUUID();
    await this.db.insert(schema_1.dataDeletionRequests).values({
      id: requestId,
      userId,
      requestType: 'right_to_erasure',
      status: 'pending',
      reason,
      verificationToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Tage gültig
      createdAt: new Date(),
    });
    return requestId;
  }
  /**
   * Verifiziert und verarbeitet Datenlösch-Anfrage
   */
  async processDeletionRequest(requestId, verificationToken) {
    const requests = await this.db
      .select()
      .from(schema_1.dataDeletionRequests)
      .where(
        (0, drizzle_orm_1.and)(
          (0, drizzle_orm_1.eq)(schema_1.dataDeletionRequests.id, requestId),
          (0, drizzle_orm_1.eq)(schema_1.dataDeletionRequests.verificationToken, verificationToken),
          (0, drizzle_orm_1.eq)(schema_1.dataDeletionRequests.status, 'pending'),
          (0, drizzle_orm_1.gte)(schema_1.dataDeletionRequests.expiresAt, new Date())
        )
      )
      .limit(1);
    if (requests.length === 0) {
      return false;
    }
    const request = requests[0];
    // Starte asynchrone Löschung
    this.performDataDeletion(request.userId, requestId).catch((err) =>
      (0, logger_1.log)('error', 'performDataDeletion unhandled error', {
        requestId,
        userId: request.userId,
        errorMessage: err instanceof Error ? err.message : String(err),
      })
    );
    return true;
  }
  /**
   * Führt tatsächliche Datenlöschung durch
   */
  async performDataDeletion(userId, requestId) {
    try {
      // Update request status
      await this.db
        .update(schema_1.dataDeletionRequests)
        .set({
          status: 'processing',
        })
        .where((0, drizzle_orm_1.eq)(schema_1.dataDeletionRequests.id, requestId));
      // Lösche Benutzerdaten (außer kritische Logs)
      await this.db
        .delete(schema_1.comments)
        .where((0, drizzle_orm_1.eq)(schema_1.comments.authorId, userId));
      await this.db
        .delete(schema_1.notifications)
        .where((0, drizzle_orm_1.eq)(schema_1.notifications.userId, userId));
      // Anonymisiere Benutzer (behalte Account für rechtliche Zwecke)
      await this.db
        .update(schema_1.users)
        .set({
          email: `deleted-${userId}@deleted.local`,
          name: 'Deleted User',
        })
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
      // Markiere request als abgeschlossen
      await this.db
        .update(schema_1.dataDeletionRequests)
        .set({
          status: 'completed',
          processedAt: new Date(),
        })
        .where((0, drizzle_orm_1.eq)(schema_1.dataDeletionRequests.id, requestId));
    } catch (error) {
      (0, logger_1.log)('error', 'Data deletion failed', {
        requestId,
        userId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      // Markiere request als fehlgeschlagen
      await this.db
        .update(schema_1.dataDeletionRequests)
        .set({
          status: 'failed',
          processedAt: new Date(),
        })
        .where((0, drizzle_orm_1.eq)(schema_1.dataDeletionRequests.id, requestId));
    }
  }
}
exports.DataExportService = DataExportService;
