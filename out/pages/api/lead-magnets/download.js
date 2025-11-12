'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.OPTIONS = exports.GET = exports.POST = void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const logger_factory_1 = require('@/server/utils/logger-factory');
const rate_limiter_1 = require('@/lib/rate-limiter');
// Logger-Instanzen erstellen
const logger = logger_factory_1.loggerFactory.createLogger('lead-magnets-download');
const securityLogger = logger_factory_1.loggerFactory.createSecurityLogger();
// Rate-Limiter für Lead-Magnet-Downloads (10/Minute)
const leadMagnetLimiter = (0, rate_limiter_1.createRateLimiter)({
  maxRequests: 10,
  windowMs: 60 * 1000,
  name: 'leadMagnetDownload',
});
// Verfügbare Lead-Magneten
const LEAD_MAGNETS = {
  'new-work-guide': {
    id: 'new-work-guide',
    title: 'New Work Transformation Guide',
    fileName: 'new-work-transformation-guide.pdf',
    filePath: '/lead-magnets/new-work-transformation-guide.pdf',
    r2Key: 'lead-magnets/new-work-transformation-guide.pdf',
    description: 'Umfassender Guide zur erfolgreichen Einführung von New Work',
    requiresEmail: true,
    trackingEnabled: true,
    autoEmailSequence: 'new-work-series',
  },
  'ki-tools-checkliste': {
    id: 'ki-tools-checkliste',
    title: 'KI-Tools Checkliste 2025',
    fileName: 'ki-tools-checkliste-2025.pdf',
    filePath: '/lead-magnets/ki-tools-checkliste-2025.pdf',
    r2Key: 'lead-magnets/ki-tools-checkliste-2025.pdf',
    description: 'Komplette Liste der besten KI-Tools für Business-Anwendungen',
    requiresEmail: true,
    trackingEnabled: true,
    autoEmailSequence: 'ki-tools-series',
  },
  'produktivitaets-masterclass': {
    id: 'produktivitaets-masterclass',
    title: 'Produktivitäts-Masterclass',
    fileName: 'produktivitaets-masterclass.zip',
    filePath: '/lead-magnets/produktivitaets-masterclass.zip',
    r2Key: 'lead-magnets/produktivitaets-masterclass.zip',
    description: 'Video-Serie und Arbeitsblätter für maximale Produktivität',
    requiresEmail: true,
    trackingEnabled: true,
    autoEmailSequence: 'productivity-series',
  },
};
// Validierungsfunktionen
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
const validateLeadMagnetId = (id) => {
  return LEAD_MAGNETS[id] || null;
};
// Hilfsfunktionen für R2 + Audit
const getClientIP = (request) => {
  const h = request.headers;
  return h.get('CF-Connecting-IP') || h.get('X-Forwarded-For') || '';
};
const getMimeTypeByExtension = (fileName) => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.zip')) return 'application/zip';
  return 'application/octet-stream';
};
const getLeadMagnetSource = (locals) => {
  try {
    const val = locals?.runtime?.env?.LEADMAGNET_SOURCE;
    if (!val) return 'public';
    return val.toLowerCase() === 'r2' ? 'r2' : 'public';
  } catch {
    return 'public';
  }
};
// Lead-Daten speichern (hier würde normalerweise eine Datenbank verwendet)
const saveLead = async (leadData, _leadMagnet) => {
  // Hier würde die Lead-Speicherung in einer Datenbank erfolgen
  // Für Development: Security-Event loggen
  securityLogger.logSecurityEvent('USER_EVENT', {
    action: 'lead_captured',
    leadMagnetId: leadData.leadMagnetId,
    email: leadData.email.substring(0, 3) + '***', // PII-Redaction
    source: leadData.source,
    utm: {
      source: leadData.utmSource,
      medium: leadData.utmMedium,
      campaign: leadData.utmCampaign,
    },
  });
  // TODO: Implementierung
  // - Lead in Datenbank speichern
  // - Email-Automation triggern
  // - CRM-Integration
  // - Analytics-Event senden
  return {
    success: true,
    leadId: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
  };
};
// Email-Automation triggern
const triggerEmailSequence = async (email, sequence, leadMagnet) => {
  // Hier würde die Email-Automation getriggert
  logger.info('Email sequence triggered', {
    metadata: {
      email: email.substring(0, 3) + '***', // PII-Redaction
      sequence,
      leadMagnet: leadMagnet.title,
    },
  });
  // TODO: Integration mit Email-Provider (ConvertKit, Mailchimp, etc.)
  // Beispiel für ConvertKit:
  // await fetch('https://api.convertkit.com/v3/sequences/[SEQUENCE_ID]/subscribe', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     api_key: process.env.CONVERTKIT_API_KEY,
  //     email: email,
  //     first_name: leadData.firstName,
  //     tags: [leadMagnet.id]
  //   })
  // });
  return { success: true };
};
exports.POST = (0, api_middleware_1.withApiMiddleware)(
  async (context) => {
    const { request, locals } = context;
    const requestData = await request.json();
    // Validierung
    if (!requestData.leadMagnetId) {
      return (0, api_middleware_1.createApiError)(
        'validation_error',
        'Lead-Magnet-ID ist erforderlich'
      );
    }
    if (!requestData.email || !validateEmail(requestData.email)) {
      return (0, api_middleware_1.createApiError)(
        'validation_error',
        'Gültige E-Mail-Adresse ist erforderlich'
      );
    }
    // Lead-Magnet validieren
    const leadMagnet = validateLeadMagnetId(requestData.leadMagnetId);
    if (!leadMagnet) {
      return (0, api_middleware_1.createApiError)('validation_error', 'Ungültige Lead-Magnet-ID');
    }
    // Lead speichern
    const leadResult = await saveLead(requestData, leadMagnet);
    if (!leadResult.success) {
      return (0, api_middleware_1.createApiError)(
        'server_error',
        'Fehler beim Speichern der Lead-Daten'
      );
    }
    // Email-Sequence triggern (falls konfiguriert)
    if (leadMagnet.autoEmailSequence) {
      await triggerEmailSequence(requestData.email, leadMagnet.autoEmailSequence, leadMagnet);
    }
    // Analytics-Event für Server-side Tracking
    if (leadMagnet.trackingEnabled) {
      logger.info('Analytics Event: lead_magnet_download', {
        metadata: {
          event: 'lead_magnet_download',
          leadMagnetId: leadMagnet.id,
          email: requestData.email.substring(0, 3) + '***', // PII-Redaction
          source: requestData.source,
        },
      });
    }
    // Download-URL abhängig von Quelle (public vs. r2)
    const source = getLeadMagnetSource(locals);
    const downloadUrl =
      source === 'r2'
        ? `/api/lead-magnets/download?id=${encodeURIComponent(leadMagnet.id)}&download=1`
        : leadMagnet.filePath;
    // Erfolgreiche Response
    return (0, api_middleware_1.createApiSuccess)({
      leadId: leadResult.leadId,
      downloadUrl,
      fileName: leadMagnet.fileName,
      title: leadMagnet.title,
      message:
        'Lead-Magnet erfolgreich angefordert. Sie erhalten eine E-Mail mit dem Download-Link.',
    });
  },
  {
    rateLimiter: leadMagnetLimiter,
    enforceCsrfToken: false, // Lead-Magnet-Downloads sind öffentlich
    disableAutoLogging: false,
  }
);
// GET für Lead-Magnet-Informationen (ohne Email-Gate)
exports.GET = (0, api_middleware_1.withApiMiddleware)(
  async (context) => {
    const { url, locals, request } = context;
    const leadMagnetId = url.searchParams.get('id');
    const shouldDownload = url.searchParams.get('download') === '1';
    if (!leadMagnetId) {
      return (0, api_middleware_1.createApiError)(
        'validation_error',
        'Lead-Magnet-ID erforderlich'
      );
    }
    const leadMagnet = validateLeadMagnetId(leadMagnetId);
    if (!leadMagnet) {
      return (0, api_middleware_1.createApiError)('validation_error', 'Lead-Magnet nicht gefunden');
    }
    // Download ausführen, wenn angefordert
    if (shouldDownload) {
      const source = getLeadMagnetSource(locals);
      if (source === 'r2') {
        const key = leadMagnet.r2Key || `lead-magnets/${leadMagnet.fileName}`;
        // R2 lesen
        const r2 = locals.runtime?.env?.R2_LEADMAGNETS;
        if (!r2) {
          logger.warn('R2_LEADMAGNETS binding not available, falling back to public asset path', {
            metadata: { key, fileName: leadMagnet.fileName },
          });
          return (0, api_middleware_1.createApiError)(
            'server_error',
            'Datei-Service nicht verfügbar'
          );
        }
        const obj = await r2.get(key);
        if (!obj) {
          // Audit: not_found
          try {
            await locals.runtime.env.DB.prepare(
              'INSERT INTO download_audit (id, created_at, ip, user_id, asset_key, status, bytes) VALUES (?, datetime("now"), ?, ?, ?, ?, ?)'
            )
              .bind(
                `dl_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                getClientIP(request),
                null,
                key,
                'not_found',
                0
              )
              .run();
          } catch (e) {
            // Audit-Insert fehlgeschlagen – bewusst ignoriert, um Download-Flow nicht zu stören
            logger.warn('download_audit insert failed (not_found)', {
              metadata: { error: e instanceof Error ? e.message : String(e) },
            });
          }
          return (0, api_middleware_1.createApiError)('validation_error', 'Datei nicht gefunden');
        }
        const contentType =
          obj.httpMetadata?.contentType || getMimeTypeByExtension(leadMagnet.fileName);
        const size = obj.size || undefined;
        // Audit: ok
        try {
          await locals.runtime.env.DB.prepare(
            'INSERT INTO download_audit (id, created_at, ip, user_id, asset_key, status, bytes) VALUES (?, datetime("now"), ?, ?, ?, ?, ?)'
          )
            .bind(
              `dl_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              getClientIP(request),
              null,
              key,
              'ok',
              size ?? 0
            )
            .run();
        } catch (e) {
          // Audit-Insert fehlgeschlagen – bewusst ignoriert, um Download-Flow nicht zu stören
          logger.warn('download_audit insert failed (ok)', {
            metadata: { error: e instanceof Error ? e.message : String(e) },
          });
        }
        const headers = new Headers();
        headers.set('Content-Type', contentType);
        if (size) headers.set('Content-Length', String(size));
        headers.set('Content-Disposition', `attachment; filename="${leadMagnet.fileName}"`);
        headers.set('X-Download-Id', `dl_${Date.now()}`);
        // Für R2-Downloads direktes Streaming zurückgeben
        return new Response(obj.body, {
          status: 200,
          headers,
        });
      }
      // public: einfach auf Asset-Pfad umleiten
      return (0, api_middleware_1.createApiError)(
        'server_error',
        'Public downloads nicht über API verfügbar'
      );
    }
    // Standard: Metadaten (ohne Dateipfad)
    return (0, api_middleware_1.createApiSuccess)({
      leadMagnet: {
        id: leadMagnet.id,
        title: leadMagnet.title,
        description: leadMagnet.description,
        fileName: leadMagnet.fileName,
        requiresEmail: leadMagnet.requiresEmail,
      },
    });
  },
  {
    rateLimiter: leadMagnetLimiter,
    enforceCsrfToken: false, // Öffentliche Metadaten-API
    disableAutoLogging: false,
  }
);
// OPTIONS für CORS Preflight
exports.OPTIONS = (0, api_middleware_1.withApiMiddleware)(
  async () => {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  },
  {
    rateLimiter: leadMagnetLimiter,
    enforceCsrfToken: false,
    disableAutoLogging: true, // CORS preflight braucht kein Logging
  }
);
