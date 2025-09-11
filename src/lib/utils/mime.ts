/*
 * Image MIME sniffing utilities (magic bytes)
 * Supports JPEG, PNG, WebP. Falls back to null for unknown formats.
 */

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

export function detectImageMimeFromBytes(bytes: ArrayBuffer | Uint8Array): ImageMime | null {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

  // JPEG: need at least 3 bytes: FF D8 FF
  if (view.length >= 3) {
    if (view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff) {
      return 'image/jpeg';
    }
  }

  // PNG: need at least 8 bytes: 89 50 4E 47 0D 0A 1A 0A
  if (view.length >= 8) {
    if (
      view[0] === 0x89 &&
      view[1] === 0x50 &&
      view[2] === 0x4e &&
      view[3] === 0x47 &&
      view[4] === 0x0d &&
      view[5] === 0x0a &&
      view[6] === 0x1a &&
      view[7] === 0x0a
    ) {
      return 'image/png';
    }
  }

  // WebP: need at least 12 bytes: 'RIFF'....'WEBP'
  if (view.length >= 12) {
    if (
      view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46 &&
      view[8] === 0x57 && view[9] === 0x45 && view[10] === 0x42 && view[11] === 0x50
    ) {
      return 'image/webp';
    }
  }

  return null;
}

export function isAllowedImageBuffer(bytes: ArrayBuffer | Uint8Array, allowed: readonly string[]): boolean {
  const detected = detectImageMimeFromBytes(bytes);
  if (!detected) return false;
  return allowed.includes(detected);
}
