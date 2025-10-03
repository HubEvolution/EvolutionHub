import { describe, it, expect } from 'vitest';
import { detectImageMimeFromBytes } from '@/lib/utils/mime';

function hexStringToUint8Array(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '').toLowerCase();
  const arr = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    arr[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return arr;
}

describe('detectImageMimeFromBytes', () => {
  it('detects JPEG by magic bytes', () => {
    const jpeg = hexStringToUint8Array('ffd8ff e000');
    expect(detectImageMimeFromBytes(jpeg)).toBe('image/jpeg');
  });

  it('detects PNG by magic bytes', () => {
    const png = hexStringToUint8Array('89504e470d0a1a0a 0000');
    expect(detectImageMimeFromBytes(png)).toBe('image/png');
  });

  it('detects WebP by magic bytes', () => {
    // RIFF....WEBP
    const riff = new Uint8Array(12);
    riff[0] = 0x52;
    riff[1] = 0x49;
    riff[2] = 0x46;
    riff[3] = 0x46;
    riff[8] = 0x57;
    riff[9] = 0x45;
    riff[10] = 0x42;
    riff[11] = 0x50;
    expect(detectImageMimeFromBytes(riff)).toBe('image/webp');
  });

  it('returns null for unknown data', () => {
    const data = new TextEncoder().encode('not an image');
    expect(detectImageMimeFromBytes(data)).toBeNull();
  });
});
