'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.generateId = generateId;
/**
 * Generate a unique ID for database records
 */
function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
