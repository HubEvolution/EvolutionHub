"use strict";
// Prompt Enhancer configuration (LLM rewrite + attachments)
// Keep aligned with environment variables; provide sane defaults for dev.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_TYPES = exports.PDF_FILE_SEARCH_ENABLED = exports.TOP_P = exports.TEMPERATURE = exports.OUTPUT_TOKENS_MAX = exports.TEXT_LENGTH_MAX = exports.MAX_FILE_BYTES = exports.MAX_FILES = exports.DEFAULT_VISION_MODEL = exports.DEFAULT_TEXT_MODEL = void 0;
exports.DEFAULT_TEXT_MODEL = (import.meta.env.PROMPT_TEXT_MODEL || 'gpt-4o-mini');
exports.DEFAULT_VISION_MODEL = (import.meta.env.PROMPT_VISION_MODEL ||
    'gpt-4o-mini');
exports.MAX_FILES = Number(import.meta.env.PROMPT_MAX_FILES || 3);
exports.MAX_FILE_BYTES = Number(import.meta.env.PROMPT_MAX_FILE_BYTES || 5 * 1024 * 1024);
exports.TEXT_LENGTH_MAX = 1000; // UI also enforces
exports.OUTPUT_TOKENS_MAX = Number(import.meta.env.PROMPT_OUTPUT_TOKENS_MAX || 400);
exports.TEMPERATURE = Number(import.meta.env.PROMPT_TEMPERATURE || 0.2);
exports.TOP_P = Number(import.meta.env.PROMPT_TOP_P || 0.9);
exports.PDF_FILE_SEARCH_ENABLED = (import.meta.env.PROMPT_PDF_FILE_SEARCH || 'true') !== 'false';
exports.ALLOWED_TYPES = (import.meta.env.PROMPT_ALLOWED_TYPES
    ?.split(',')
    .map((t) => t.trim())
    .filter(Boolean) || [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/markdown',
]);
