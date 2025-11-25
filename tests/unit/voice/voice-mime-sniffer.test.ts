import { describe, it, expect } from 'vitest';

import { sniffAudioMime } from '@/lib/validation/voice-mime-sniffer';

function toArrayBuffer(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

describe('sniffAudioMime', () => {
  it('detects Ogg containers via "OggS" signature', () => {
    const buf = toArrayBuffer([0x4f, 0x67, 0x67, 0x53, 0x00, 0x02, 0x00, 0x00]);
    const res = sniffAudioMime(buf);
    expect(res.ok).toBe(true);
    expect(res.mime).toBe('audio/ogg');
  });

  it('detects WebM/Matroska via EBML header', () => {
    const buf = toArrayBuffer([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00, 0x00, 0x00]);
    const res = sniffAudioMime(buf);
    expect(res.ok).toBe(true);
    expect(res.mime).toBe('audio/webm');
  });

  it('detects MP4/ISOBMFF via ftyp box', () => {
    // 00 00 00 18 66 74 79 70 ...
    const buf = toArrayBuffer([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20,
    ]);
    const res = sniffAudioMime(buf);
    expect(res.ok).toBe(true);
    expect(res.mime).toBe('audio/mp4');
  });

  it('returns unknown for short buffers', () => {
    const buf = toArrayBuffer([0x00, 0x01, 0x02]);
    const res = sniffAudioMime(buf);
    expect(res.ok).toBe(false);
    expect(res.mime).toBe('unknown');
  });

  it('returns unknown for unrecognized signatures', () => {
    const buf = toArrayBuffer([0xde, 0xad, 0xbe, 0xef, 0x00, 0x01, 0x02, 0x03]);
    const res = sniffAudioMime(buf);
    expect(res.ok).toBe(false);
    expect(res.mime).toBe('unknown');
  });
});
