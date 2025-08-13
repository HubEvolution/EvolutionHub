// API Route für Lead-Magnet-Downloads mit Email-Gate und Analytics-Tracking
import type { APIRoute } from 'astro';

interface DownloadRequest {
  leadMagnetId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  source?: string; // Für Tracking woher der Download kommt
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

interface LeadMagnetConfig {
  id: string;
  title: string;
  fileName: string;
  filePath: string;
  description: string;
  requiresEmail: boolean;
  trackingEnabled: boolean;
  autoEmailSequence?: string;
  r2Key?: string; // optionaler R2-Schlüssel (für Variante B)
}

// Verfügbare Lead-Magneten
const LEAD_MAGNETS: Record<string, LeadMagnetConfig> = {
  'new-work-guide': {
    id: 'new-work-guide',
    title: 'New Work Transformation Guide',
    fileName: 'new-work-transformation-guide.pdf',
    filePath: '/lead-magnets/new-work-transformation-guide.pdf',
    r2Key: 'lead-magnets/new-work-transformation-guide.pdf',
    description: 'Umfassender Guide zur erfolgreichen Einführung von New Work',
    requiresEmail: true,
    trackingEnabled: true,
    autoEmailSequence: 'new-work-series'
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
    autoEmailSequence: 'ki-tools-series'
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
    autoEmailSequence: 'productivity-series'
  }
};

// Validierungsfunktionen
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateLeadMagnetId = (id: string): LeadMagnetConfig | null => {
  return LEAD_MAGNETS[id] || null;
};

// Hilfsfunktionen für R2 + Audit
const getClientIP = (request: Request): string => {
  const h = request.headers;
  return (
    h.get('CF-Connecting-IP') ||
    h.get('X-Forwarded-For') ||
    ''
  );
};

const getMimeTypeByExtension = (fileName: string): string => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.zip')) return 'application/zip';
  return 'application/octet-stream';
};

const getLeadMagnetSource = (locals: any): 'public' | 'r2' => {
  try {
    const val = locals?.runtime?.env?.LEADMAGNET_SOURCE as string | undefined;
    if (!val) return 'public';
    return val.toLowerCase() === 'r2' ? 'r2' : 'public';
  } catch {
    return 'public';
  }
};

// Lead-Daten speichern (hier würde normalerweise eine Datenbank verwendet)
const saveLead = async (leadData: DownloadRequest, leadMagnet: LeadMagnetConfig) => {
  // Hier würde die Lead-Speicherung in einer Datenbank erfolgen
  // Für Development: Console-Log
  console.log('🎯 New Lead captured:', {
    leadMagnetId: leadData.leadMagnetId,
    email: leadData.email,
    timestamp: new Date().toISOString(),
    source: leadData.source,
    utm: {
      source: leadData.utmSource,
      medium: leadData.utmMedium,
      campaign: leadData.utmCampaign
    }
  });
  
  // TODO: Implementierung
  // - Lead in Datenbank speichern
  // - Email-Automation triggern
  // - CRM-Integration
  // - Analytics-Event senden
  
  return {
    success: true,
    leadId: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
};

// Email-Automation triggern
const triggerEmailSequence = async (email: string, sequence: string, leadMagnet: LeadMagnetConfig) => {
  // Hier würde die Email-Automation getriggert
  console.log('📧 Email sequence triggered:', {
    email,
    sequence,
    leadMagnet: leadMagnet.title
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

export const POST: APIRoute = async ({ request, locals, url }) => {
  try {
    // CORS Headers für Frontend-Integration
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Request-Body parsen
    const requestData: DownloadRequest = await request.json();
    
    // Validierung
    if (!requestData.leadMagnetId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Lead-Magnet-ID ist erforderlich'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (!requestData.email || !validateEmail(requestData.email)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Gültige E-Mail-Adresse ist erforderlich'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Lead-Magnet validieren
    const leadMagnet = validateLeadMagnetId(requestData.leadMagnetId);
    if (!leadMagnet) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Ungültige Lead-Magnet-ID'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Lead speichern
    const leadResult = await saveLead(requestData, leadMagnet);
    if (!leadResult.success) {
      throw new Error('Fehler beim Speichern der Lead-Daten');
    }

    // Email-Sequence triggern (falls konfiguriert)
    if (leadMagnet.autoEmailSequence) {
      await triggerEmailSequence(
        requestData.email, 
        leadMagnet.autoEmailSequence, 
        leadMagnet
      );
    }

    // Analytics-Event für Server-side Tracking
    if (leadMagnet.trackingEnabled) {
      console.log('📊 Analytics Event:', {
        event: 'lead_magnet_download',
        leadMagnetId: leadMagnet.id,
        email: requestData.email,
        source: requestData.source,
        timestamp: new Date().toISOString()
      });
    }

    // Download-URL abhängig von Quelle (public vs. r2)
    const source = getLeadMagnetSource(locals);
    const downloadUrl = source === 'r2'
      ? `/api/lead-magnets/download?id=${encodeURIComponent(leadMagnet.id)}&download=1`
      : leadMagnet.filePath;

    // Erfolgreiche Response
    return new Response(JSON.stringify({
      success: true,
      leadId: leadResult.leadId,
      downloadUrl,
      fileName: leadMagnet.fileName,
      title: leadMagnet.title,
      message: 'Lead-Magnet erfolgreich angefordert. Sie erhalten eine E-Mail mit dem Download-Link.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('❌ Lead-Magnet Download Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// OPTIONS für CORS Preflight
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
};

// GET für Lead-Magnet-Informationen (ohne Email-Gate)
export const GET: APIRoute = async ({ url, locals, request }) => {
  const leadMagnetId = url.searchParams.get('id');
  const shouldDownload = url.searchParams.get('download') === '1';
  
  if (!leadMagnetId) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Lead-Magnet-ID erforderlich'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const leadMagnet = validateLeadMagnetId(leadMagnetId);
  if (!leadMagnet) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Lead-Magnet nicht gefunden'
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Download ausführen, wenn angefordert
  if (shouldDownload) {
    const source = getLeadMagnetSource(locals);

    if (source === 'r2') {
      const key = leadMagnet.r2Key || `lead-magnets/${leadMagnet.fileName}`;
      // R2 lesen
      const r2 = locals.runtime.env.R2_LEADMAGNETS as R2Bucket;
      const obj = await r2.get(key);

      if (!obj) {
        // Audit: not_found
        try {
          await locals.runtime.env.DB.prepare(
            'INSERT INTO download_audit (id, created_at, ip, user_id, asset_key, status, bytes) VALUES (?, datetime("now"), ?, ?, ?, ?, ?)'
          ).bind(
            `dl_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            getClientIP(request),
            null,
            key,
            'not_found',
            0
          ).run();
        } catch (e) {
          // Audit-Insert fehlgeschlagen – bewusst ignoriert, um Download-Flow nicht zu stören
          console.warn('download_audit insert failed (not_found)', e);
        }

        return new Response('Datei nicht gefunden', { status: 404 });
      }

      const contentType = obj.httpMetadata?.contentType || getMimeTypeByExtension(leadMagnet.fileName);
      const size = obj.size || undefined;

      // Audit: ok
      try {
        await locals.runtime.env.DB.prepare(
          'INSERT INTO download_audit (id, created_at, ip, user_id, asset_key, status, bytes) VALUES (?, datetime("now"), ?, ?, ?, ?, ?)'
        ).bind(
          `dl_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          getClientIP(request),
          null,
          key,
          'ok',
          size ?? 0
        ).run();
      } catch (e) {
        // Audit-Insert fehlgeschlagen – bewusst ignoriert, um Download-Flow nicht zu stören
        console.warn('download_audit insert failed (ok)', e);
      }

      const headers = new Headers();
      headers.set('Content-Type', contentType);
      if (size) headers.set('Content-Length', String(size));
      headers.set('Content-Disposition', `attachment; filename="${leadMagnet.fileName}"`);
      headers.set('X-Download-Id', `dl_${Date.now()}`);
      return new Response(obj.body, { status: 200, headers });
    }

    // public: einfach auf Asset-Pfad umleiten
    return new Response(null, {
      status: 302,
      headers: { Location: leadMagnet.filePath }
    });
  }

  // Standard: Metadaten (ohne Dateipfad)
  return new Response(JSON.stringify({
    success: true,
    leadMagnet: {
      id: leadMagnet.id,
      title: leadMagnet.title,
      description: leadMagnet.description,
      fileName: leadMagnet.fileName,
      requiresEmail: leadMagnet.requiresEmail
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
