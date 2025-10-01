// Prompt Enhancer configuration (LLM rewrite + attachments)
// Keep aligned with environment variables; provide sane defaults for dev.

export type PromptMode = 'creative' | 'professional' | 'concise';

export const DEFAULT_TEXT_MODEL = (import.meta.env.PROMPT_TEXT_MODEL || 'gpt-4o-mini') as string;
export const DEFAULT_VISION_MODEL = (import.meta.env.PROMPT_VISION_MODEL || 'gpt-4o-mini') as string;

export const MAX_FILES = Number(import.meta.env.PROMPT_MAX_FILES || 3);
export const MAX_FILE_BYTES = Number(import.meta.env.PROMPT_MAX_FILE_BYTES || 5 * 1024 * 1024);
export const TEXT_LENGTH_MAX = 1000; // UI also enforces
export const OUTPUT_TOKENS_MAX = Number(import.meta.env.PROMPT_OUTPUT_TOKENS_MAX || 400);
export const TEMPERATURE = Number(import.meta.env.PROMPT_TEMPERATURE || 0.2);
export const TOP_P = Number(import.meta.env.PROMPT_TOP_P || 0.9);

export const PDF_FILE_SEARCH_ENABLED = (import.meta.env.PROMPT_PDF_FILE_SEARCH || 'true') !== 'false';

export const ALLOWED_TYPES = (
  (import.meta.env.PROMPT_ALLOWED_TYPES as string | undefined)?.split(',').map((t) => t.trim()).filter(Boolean) || [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/markdown',
  ]
) as readonly string[];

export interface AttachmentMeta {
  filename: string;
  mimeType: string;
  size: number;
}

export interface TextSnippet extends AttachmentMeta {
  text: string; // clamped
}

export interface ImageInput extends AttachmentMeta {
  dataUrl: string; // data:image/...;base64,
}

export interface PdfFileRef extends AttachmentMeta {
  // Will be uploaded to OpenAI for file_search
  file?: File; // available at request time only
  fileId?: string; // set after upload
}

export interface AttachmentContext {
  texts: TextSnippet[];
  images: ImageInput[];
  pdfs: PdfFileRef[]; // with fileIds when uploaded
}
