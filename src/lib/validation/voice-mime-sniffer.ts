export type SniffedMime = 'audio/webm' | 'audio/ogg' | 'audio/mp4' | 'unknown';

export interface SniffResult {
  ok: boolean;
  mime: SniffedMime;
  reason?: string;
}

function toUint8(input: ArrayBuffer | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

export function sniffAudioMime(input: ArrayBuffer | Uint8Array): SniffResult {
  const buf = toUint8(input);
  if (buf.length < 4) {
    return { ok: false, mime: 'unknown', reason: 'buffer_too_small' };
  }

  // Ogg container (e.g. Ogg/Opus): "OggS" at start
  if (buf[0] === 0x4f && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53) {
    return { ok: true, mime: 'audio/ogg' };
  }

  // WebM / Matroska: EBML header 0x1A45DFA3 at start
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return { ok: true, mime: 'audio/webm' };
  }

  // MP4 / ISOBMFF families: 4-byte size then 'ftyp' box
  if (buf.length >= 12) {
    if (
      buf[4] === 0x66 && // 'f'
      buf[5] === 0x74 && // 't'
      buf[6] === 0x79 && // 'y'
      buf[7] === 0x70 // 'p'
    ) {
      return { ok: true, mime: 'audio/mp4' };
    }
  }

  return { ok: false, mime: 'unknown', reason: 'unrecognized_signature' };
}
