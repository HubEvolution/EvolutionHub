/**
 * Daten-Export-Service für GDPR-konforme Datenportabilität
 * Unterstützt verschiedene Export-Formate und Datenkategorien
 */

import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { dataExportJobs, dataDeletionRequests, users, comments, notifications } from '../db/schema';
import type {
  DataExportJob,
  ExportOptions,
  ExportData,
  ExportJobType,
  ExportFormat,
  ExportProgress,
} from '../types/data-management';

export class DataExportService {
  private db: ReturnType<typeof drizzle>;

  constructor(db: ReturnType<typeof drizzle>) {
    this.db = db;
  }

  /**
   * Erstellt einen neuen Datenexport-Job
   */
  async createExportJob(userId: number, options: ExportOptions): Promise<string> {
    const jobId = crypto.randomUUID();

    await this.db.insert(dataExportJobs).values({
      id: jobId,
      userId,
      type: options.type,
      status: 'pending',
      format: options.format,
      requestedAt: Date.now(),
      downloadCount: 0,
    });

    // Starte asynchrone Verarbeitung
    this.processExportJob(jobId).catch(console.error);

    return jobId;
  }

  /**
   * Verarbeitet einen Export-Job asynchron
   */
  private async processExportJob(jobId: string): Promise<void> {
    try {
      // Update job status zu processing
      await this.db
        .update(dataExportJobs)
        .set({
          status: 'processing',
        })
        .where(eq(dataExportJobs.id, jobId));

      // Hole Job-Details
      const job = await this.db
        .select()
        .from(dataExportJobs)
        .where(eq(dataExportJobs.id, jobId))
        .limit(1);

      if (!job[0]) {
        throw new Error('Export job not found');
      }

      // Sammle Daten basierend auf Export-Typ
      const exportData = await this.collectExportData(job[0].userId, {
        type: job[0].type as ExportJobType,
        format: job[0].format as ExportFormat,
      });

      // Konvertiere zu gewünschtem Format
      const fileContent = this.formatExportData(exportData, job[0].format as ExportFormat);

      // Speichere Datei in R2 (simuliert hier)
      const filePath = await this.saveToStorage(jobId, fileContent);

      // Erstelle temporäre Download-URL
      const downloadUrl = await this.generateDownloadUrl(jobId, filePath);

      // Update job mit Ergebnis
      await this.db
        .update(dataExportJobs)
        .set({
          status: 'completed',
          filePath,
          fileSize: fileContent.length,
          downloadUrl,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 Tage gültig
          completedAt: Date.now(),
        })
        .where(eq(dataExportJobs.id, jobId));
    } catch (error) {
      console.error('Export job failed:', error);

      // Update job mit Fehler
      await this.db
        .update(dataExportJobs)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          completedAt: Date.now(),
        })
        .where(eq(dataExportJobs.id, jobId));
    }
  }

  /**
   * Sammelt Daten für Export basierend auf Typ und Optionen
   */
  private async collectExportData(
    userId: number,
    options: { type: ExportJobType; format: ExportFormat }
  ): Promise<ExportData> {
    const exportData: ExportData = {
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
          id: users.id,
          email: users.email,
          name: users.name,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userData[0]) {
        exportData.user = userData[0];
      }
    }

    // Hole Kommentare
    if (options.type === 'comments' || options.type === 'full_export') {
      const commentsData = await this.db
        .select({
          id: comments.id,
          content: comments.content,
          postId: comments.postId,
          status: comments.status,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
          parentId: comments.parentId,
        })
        .from(comments)
        .where(eq(comments.authorId, userId));

      exportData.comments = commentsData.map((comment) => ({
        ...comment,
        author: { id: userId, name: exportData.user?.name },
      }));
    }

    // Hole Benachrichtigungen
    if (options.type === 'notifications' || options.type === 'full_export') {
      const notificationsData = await this.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId));

      exportData.notifications = notificationsData;
    }

    return exportData;
  }

  /**
   * Formatiert Export-Daten in gewünschtes Format
   */
  private formatExportData(data: ExportData, format: ExportFormat): string {
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
  private convertToCSV(data: ExportData): string {
    const lines: string[] = [];

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
  private convertToXML(data: ExportData): string {
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
  private async saveToStorage(jobId: string, content: string): Promise<string> {
    // In einer echten Implementierung würde hier R2 verwendet
    const filePath = `exports/${jobId}.json`;
    // Simuliere Storage-Operation
    console.log(`Saving export ${jobId} to ${filePath}, size: ${content.length} bytes`);
    return filePath;
  }

  /**
   * Erstellt temporäre Download-URL
   */
  private async generateDownloadUrl(jobId: string, filePath: string): Promise<string> {
    // In einer echten Implementierung würde hier eine signierte URL erstellt
    const baseUrl = process.env.BASE_URL || 'http://localhost:8787';
    const expires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 Tage
    return `${baseUrl}/api/data-export/download/${jobId}?expires=${expires}`;
  }

  /**
   * Holt Export-Job-Details
   */
  async getExportJob(jobId: string): Promise<DataExportJob | null> {
    const jobs = await this.db
      .select()
      .from(dataExportJobs)
      .where(eq(dataExportJobs.id, jobId))
      .limit(1);

    return jobs[0] || null;
  }

  /**
   * Holt alle Export-Jobs für einen Benutzer
   */
  async getUserExportJobs(userId: number): Promise<DataExportJob[]> {
    return await this.db
      .select()
      .from(dataExportJobs)
      .where(eq(dataExportJobs.userId, userId))
      .orderBy(desc(dataExportJobs.requestedAt));
  }

  /**
   * Holt Export-Fortschritt
   */
  async getExportProgress(jobId: string): Promise<ExportProgress | null> {
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
  async cleanupExpiredExports(): Promise<number> {
    const expiredJobs = await this.db
      .select()
      .from(dataExportJobs)
      .where(
        and(eq(dataExportJobs.status, 'completed'), lte(dataExportJobs.expiresAt, Date.now()))
      );

    if (expiredJobs.length === 0) return 0;

    // Lösche abgelaufene Jobs
    await this.db
      .delete(dataExportJobs)
      .where(
        and(eq(dataExportJobs.status, 'completed'), lte(dataExportJobs.expiresAt, Date.now()))
      );

    return expiredJobs.length;
  }

  /**
   * Erstellt Datenlösch-Anfrage (GDPR Right to Erasure)
   */
  async createDeletionRequest(userId: number, reason?: string): Promise<string> {
    const requestId = crypto.randomUUID();
    const verificationToken = crypto.randomUUID();

    await this.db.insert(dataDeletionRequests).values({
      id: requestId,
      userId,
      requestType: 'right_to_erasure',
      status: 'pending',
      reason,
      verificationToken,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 Tage gültig
      createdAt: Date.now(),
    });

    return requestId;
  }

  /**
   * Verifiziert und verarbeitet Datenlösch-Anfrage
   */
  async processDeletionRequest(requestId: string, verificationToken: string): Promise<boolean> {
    const requests = await this.db
      .select()
      .from(dataDeletionRequests)
      .where(
        and(
          eq(dataDeletionRequests.id, requestId),
          eq(dataDeletionRequests.verificationToken, verificationToken),
          eq(dataDeletionRequests.status, 'pending'),
          gte(dataDeletionRequests.expiresAt, Date.now())
        )
      )
      .limit(1);

    if (requests.length === 0) {
      return false;
    }

    const request = requests[0];

    // Starte asynchrone Löschung
    this.performDataDeletion(request.userId, requestId).catch(console.error);

    return true;
  }

  /**
   * Führt tatsächliche Datenlöschung durch
   */
  private async performDataDeletion(userId: number, requestId: string): Promise<void> {
    try {
      // Update request status
      await this.db
        .update(dataDeletionRequests)
        .set({
          status: 'processing',
        })
        .where(eq(dataDeletionRequests.id, requestId));

      // Lösche Benutzerdaten (außer kritische Logs)
      await this.db.delete(comments).where(eq(comments.authorId, userId));
      await this.db.delete(notifications).where(eq(notifications.userId, userId));

      // Anonymisiere Benutzer (behalte Account für rechtliche Zwecke)
      await this.db
        .update(users)
        .set({
          email: `deleted-${userId}@deleted.local`,
          name: null,
        })
        .where(eq(users.id, userId));

      // Markiere request als abgeschlossen
      await this.db
        .update(dataDeletionRequests)
        .set({
          status: 'completed',
          processedAt: Date.now(),
        })
        .where(eq(dataDeletionRequests.id, requestId));
    } catch (error) {
      console.error('Data deletion failed:', error);

      // Markiere request als fehlgeschlagen
      await this.db
        .update(dataDeletionRequests)
        .set({
          status: 'failed',
          processedAt: Date.now(),
        })
        .where(eq(dataDeletionRequests.id, requestId));
    }
  }
}
