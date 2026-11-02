import { RequestBodyError } from './whatsappSupportRequestError.js';

export type WhatsAppSupportContentType = 'image' | 'video' | 'audio' | 'document' | 'sticker';

export type WhatsAppSupportFile = {
  bytes: Buffer;
  name: string;
  mimeType: string;
};

function inspectWebP(bytes: Buffer): { animated: boolean } | null {
  if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP'
    || bytes.readUInt32LE(4) + 8 !== bytes.length) return null;

  let cursor = 12;
  let hasImageChunk = false;
  let hasAnimationFlag = false;
  let hasAnimationChunk = false;
  let hasAnimationFrame = false;
  let dimensions: { width: number; height: number } | null = null;
  const readUInt24LE = (offset: number) => bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
  while (cursor + 8 <= bytes.length) {
    const type = bytes.toString('ascii', cursor, cursor + 4);
    const size = bytes.readUInt32LE(cursor + 4);
    const dataOffset = cursor + 8;
    const chunkEnd = cursor + 8 + size;
    const paddedChunkEnd = chunkEnd + (size % 2);
    if (paddedChunkEnd > bytes.length) return null;
    if (type === 'VP8X') {
      if (size !== 10) return null;
      hasAnimationFlag = (bytes[dataOffset] & 0x02) !== 0;
      dimensions = { width: 1 + readUInt24LE(dataOffset + 4), height: 1 + readUInt24LE(dataOffset + 7) };
    } else if (type === 'VP8 ') {
      if (size < 10 || bytes[dataOffset + 3] !== 0x9d || bytes[dataOffset + 4] !== 0x01 || bytes[dataOffset + 5] !== 0x2a) return null;
      hasImageChunk = true;
      dimensions ||= {
        width: bytes.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: bytes.readUInt16LE(dataOffset + 8) & 0x3fff,
      };
    } else if (type === 'VP8L') {
      if (size < 5 || bytes[dataOffset] !== 0x2f) return null;
      hasImageChunk = true;
      dimensions ||= {
        width: 1 + bytes[dataOffset + 1] + ((bytes[dataOffset + 2] & 0x3f) << 8),
        height: 1 + (bytes[dataOffset + 2] >> 6) + (bytes[dataOffset + 3] << 2) + ((bytes[dataOffset + 4] & 0x0f) << 10),
      };
    } else if (type === 'ANIM') {
      hasAnimationChunk = true;
    } else if (type === 'ANMF') {
      if (size < 16) return null;
      hasAnimationFrame = true;
    }
    cursor = paddedChunkEnd;
  }
  if (cursor !== bytes.length || !dimensions || dimensions.width !== 512 || dimensions.height !== 512) return null;
  if (hasAnimationFlag || hasAnimationChunk || hasAnimationFrame) {
    return hasAnimationFlag && hasAnimationChunk && hasAnimationFrame ? { animated: true } : null;
  }
  return hasImageChunk ? { animated: false } : null;
}

export function classifyWhatsAppSupportFile(file: WhatsAppSupportFile): { type: WhatsAppSupportContentType; mimeType: string } {
  const normalizedMime = file.mimeType.split(';')[0].trim();
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const imageTypes = new Set(['image/jpeg', 'image/png']);
  const videoTypes = new Set(['video/mp4', 'video/3gpp']);
  const audioTypes = new Set(['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg']);
  const documentTypes = new Set([
    'text/plain',
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]);

  const mimeByExtension: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    mp4: 'video/mp4', '3gp': 'video/3gpp',
    aac: 'audio/aac', m4a: 'audio/mp4', mp3: 'audio/mpeg', amr: 'audio/amr', ogg: 'audio/ogg',
    txt: 'text/plain', pdf: 'application/pdf', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    webp: 'image/webp',
  };
  const mimeType = normalizedMime === 'application/octet-stream' || !normalizedMime
    ? mimeByExtension[extension] || ''
    : normalizedMime;

  if (imageTypes.has(mimeType)) return { type: 'image', mimeType };
  if (mimeType === 'image/webp') {
    const webp = inspectWebP(file.bytes);
    if (!webp) throw new RequestBodyError('Figurinha inválida: o WebP precisa ser válido e ter 512 × 512 pixels.', 415);
    const maxBytes = webp.animated ? 500 * 1024 : 100 * 1024;
    if (file.bytes.byteLength > maxBytes) {
      throw new RequestBodyError(webp.animated
        ? 'Figurinhas animadas devem ter até 500 KB.'
        : 'Figurinhas estáticas devem ter até 100 KB.', 413);
    }
    return { type: 'sticker', mimeType };
  }
  if (videoTypes.has(mimeType)) return { type: 'video', mimeType };
  if (audioTypes.has(mimeType)) return { type: 'audio', mimeType };
  if (documentTypes.has(mimeType)) return { type: 'document', mimeType };
  throw new RequestBodyError('Formato não aceito pelo WhatsApp. Use JPG, PNG, WebP de figurinha, MP4, áudio OGG/MP3/M4A, PDF, DOCX, XLSX ou TXT.', 415);
}
