export type SupportedImageExtension = 'png' | 'jpg' | 'webp' | 'gif' | 'svg' | 'avif';

export interface ValidatedImageAsset {
  buffer: ArrayBuffer;
  extension: SupportedImageExtension;
  mimeType: string;
}

const MIME_BY_EXTENSION: Record<SupportedImageExtension, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  avif: 'image/avif',
};

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0): boolean =>
  signature.every((value, index) => bytes[offset + index] === value);

const ascii = (bytes: Uint8Array, start: number, length: number): string =>
  String.fromCharCode(...bytes.slice(start, start + length));

function hasPngStructure(bytes: Uint8Array): boolean {
  if (bytes.length < 45 || !startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return false;
  if (ascii(bytes, 12, 4) !== 'IHDR') return false;
  return ascii(bytes, bytes.length - 8, 4) === 'IEND';
}

function hasJpegStructure(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && startsWith(bytes, [0xff, 0xd8, 0xff]) && startsWith(bytes, [0xff, 0xd9], bytes.length - 2);
}

function hasWebpStructure(bytes: Uint8Array): boolean {
  if (bytes.length < 16 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') return false;
  const declaredSize = new DataView(bytes.buffer, bytes.byteOffset + 4, 4).getUint32(0, true) + 8;
  return declaredSize <= bytes.length;
}

function hasGifStructure(bytes: Uint8Array): boolean {
  const header = ascii(bytes, 0, 6);
  return bytes.length >= 14 && (header === 'GIF87a' || header === 'GIF89a') && bytes[bytes.length - 1] === 0x3b;
}

function hasSvgStructure(bytes: Uint8Array, contentType: string): boolean {
  if (!contentType.toLowerCase().includes('svg') && bytes.length > 2_000_000) return false;
  const sample = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 4096))).replace(/^\uFEFF/, '').trimStart();
  return /^(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(sample);
}

function hasAvifStructure(bytes: Uint8Array): boolean {
  if (bytes.length < 16 || ascii(bytes, 4, 4) !== 'ftyp') return false;
  const brands = ascii(bytes, 8, Math.min(bytes.length - 8, 32));
  return /avif|avis/.test(brands);
}

export function validateImageBytes(buffer: ArrayBuffer, contentType = ''): ValidatedImageAsset | null {
  const bytes = new Uint8Array(buffer);
  let extension: SupportedImageExtension | null = null;

  if (hasPngStructure(bytes)) extension = 'png';
  else if (hasJpegStructure(bytes)) extension = 'jpg';
  else if (hasWebpStructure(bytes)) extension = 'webp';
  else if (hasGifStructure(bytes)) extension = 'gif';
  else if (hasAvifStructure(bytes)) extension = 'avif';
  else if (hasSvgStructure(bytes, contentType)) extension = 'svg';

  return extension ? { buffer, extension, mimeType: MIME_BY_EXTENSION[extension] } : null;
}

function decodeBase64(value: string): ArrayBuffer | null {
  const normalized = value.replace(/\s+/g, '');
  if (normalized.length < 16 || normalized.length % 4 === 1 || !/^[a-z0-9+/]*={0,2}$/i.test(normalized)) return null;
  try {
    const decoded = atob(normalized);
    return Uint8Array.from(decoded, character => character.charCodeAt(0)).buffer;
  } catch {
    return null;
  }
}

function decodePercentEncoded(value: string): ArrayBuffer | null {
  const bytes: number[] = [];
  let plainText = '';
  const flushPlainText = () => {
    if (!plainText) return;
    bytes.push(...new TextEncoder().encode(plainText));
    plainText = '';
  };

  for (let index = 0; index < value.length; index++) {
    if (value[index] !== '%') {
      plainText += value[index];
      continue;
    }
    const hex = value.slice(index + 1, index + 3);
    if (!/^[0-9a-f]{2}$/i.test(hex)) return null;
    flushPlainText();
    bytes.push(Number.parseInt(hex, 16));
    index += 2;
  }
  flushPlainText();
  return Uint8Array.from(bytes).buffer;
}

export function decodeInlineImageSource(source: string): { buffer: ArrayBuffer; contentType: string } | null {
  const dataMatch = source.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/i);
  if (dataMatch) {
    const contentType = dataMatch[1] || '';
    const buffer = dataMatch[2]
      ? decodeBase64(dataMatch[3])
      : decodePercentEncoded(dataMatch[3]);
    return buffer ? { buffer, contentType } : null;
  }

  const buffer = decodeBase64(source);
  return buffer ? { buffer, contentType: '' } : null;
}
