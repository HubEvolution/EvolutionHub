import {
  ALLOWED_TYPES,
  MAX_FILES,
  MAX_FILE_BYTES,
  type AttachmentContext,
  type TextSnippet,
  type ImageInput,
  type PdfFileRef,
} from '@/config/prompt-enhancer';

function toBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa is available in Workers/Browser
  return btoa(binary);
}

export interface PreparedAttachments extends AttachmentContext {}

export interface PrepareOptions {
  maxTextCharsPerFile?: number; // default 6000
}

export function isAllowedType(mime: string): boolean {
  return ALLOWED_TYPES.includes(mime);
}

export function validateFiles(files: File[]): { ok: boolean; reason?: string } {
  if (files.length > MAX_FILES) {
    return { ok: false, reason: `Too many files (max ${MAX_FILES})` };
  }
  for (const f of files) {
    if (!isAllowedType(f.type)) {
      return { ok: false, reason: `Unsupported type: ${f.type}` };
    }
    if (f.size > MAX_FILE_BYTES) {
      return { ok: false, reason: `File too large: ${f.name} (> ${MAX_FILE_BYTES} bytes)` };
    }
  }
  return { ok: true };
}

export async function buildAttachmentContext(files: File[], options: PrepareOptions = {}): Promise<PreparedAttachments> {
  const maxChars = options.maxTextCharsPerFile ?? 6000;
  const texts: TextSnippet[] = [];
  const images: ImageInput[] = [];
  const pdfs: PdfFileRef[] = [];

  for (const f of files) {
    const meta = { filename: f.name, mimeType: f.type, size: f.size };
    if (f.type.startsWith('image/')) {
      const buf = await f.arrayBuffer();
      const b64 = toBase64(buf);
      const dataUrl = `data:${f.type};base64,${b64}`;
      images.push({ ...meta, dataUrl });
      continue;
    }
    if (f.type === 'application/pdf') {
      pdfs.push({ ...meta, file: f });
      continue;
    }
    if (f.type === 'text/plain' || f.type === 'text/markdown') {
      const raw = await f.text();
      const clamped = raw.slice(0, maxChars);
      texts.push({ ...meta, text: clamped });
      continue;
    }
    // ignore unknown types (should not happen due to validation)
  }

  return { texts, images, pdfs };
}

// Upload PDFs to OpenAI Files API for use with Responses API (file_search)
// Mutates the given context.pdfs to include fileId.
export async function uploadPdfFilesToProvider(openai: import('openai').default, ctx: PreparedAttachments, log?: { info?: Function; warn?: Function; error?: Function; }): Promise<void> {
  if (!ctx.pdfs.length) return;
  for (const pdf of ctx.pdfs) {
    if (pdf.fileId || !pdf.file) continue;
    try {
      const created = await openai.files.create({ file: pdf.file as any, purpose: 'assistants' });
      pdf.fileId = created.id;
      if (log?.info) log.info('pdf_uploaded', { filename: pdf.filename, bytes: pdf.size });
    } catch (err) {
      if (log?.warn) log.warn('pdf_upload_failed', { filename: pdf.filename, error: (err as Error).message });
      // Do not throw: keep flow resilient; caller can decide to fallback
    }
  }
}
