'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.isAllowedType = isAllowedType;
exports.validateFiles = validateFiles;
exports.buildAttachmentContext = buildAttachmentContext;
exports.uploadPdfFilesToProvider = uploadPdfFilesToProvider;
const prompt_enhancer_1 = require('@/config/prompt-enhancer');
function toBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa is available in Workers/Browser
  return btoa(binary);
}
function isAllowedType(mime) {
  return prompt_enhancer_1.ALLOWED_TYPES.includes(mime);
}
function validateFiles(files) {
  if (files.length > prompt_enhancer_1.MAX_FILES) {
    return { ok: false, reason: `Too many files (max ${prompt_enhancer_1.MAX_FILES})` };
  }
  for (const f of files) {
    if (!isAllowedType(f.type)) {
      return { ok: false, reason: `Unsupported type: ${f.type}` };
    }
    if (f.size > prompt_enhancer_1.MAX_FILE_BYTES) {
      return {
        ok: false,
        reason: `File too large: ${f.name} (> ${prompt_enhancer_1.MAX_FILE_BYTES} bytes)`,
      };
    }
  }
  return { ok: true };
}
async function buildAttachmentContext(files, options = {}) {
  const maxChars = options.maxTextCharsPerFile ?? 6000;
  const texts = [];
  const images = [];
  const pdfs = [];
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
async function uploadPdfFilesToProvider(openai, ctx, log) {
  if (!ctx.pdfs.length) return;
  for (const pdf of ctx.pdfs) {
    if (pdf.fileId || !pdf.file) continue;
    try {
      const created = await openai.files.create({ file: pdf.file, purpose: 'assistants' });
      pdf.fileId = created.id;
      if (log?.info) log.info('pdf_uploaded', { filename: pdf.filename, bytes: pdf.size });
    } catch (err) {
      if (log?.warn) log.warn('pdf_upload_failed', { filename: pdf.filename, error: err.message });
      // Do not throw: keep flow resilient; caller can decide to fallback
    }
  }
}
