import { describe, expect, it } from 'vitest';
import { classifyWhatsAppSupportFile } from '../../../../../../api/whatsapp-support-send';

function webpChunk(type: string, bytes: Buffer) {
  const header = Buffer.alloc(8);
  header.write(type, 0, 4, 'ascii');
  header.writeUInt32LE(bytes.length, 4);
  return Buffer.concat([header, bytes, bytes.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
}

function webpFile(size: number, animated: boolean) {
  const vp8x = Buffer.alloc(10);
  if (animated) vp8x[0] = 0x02;
  vp8x.writeUIntLE(511, 4, 3);
  vp8x.writeUIntLE(511, 7, 3);
  const chunks = animated
    ? [
        webpChunk('VP8X', vp8x),
        webpChunk('ANIM', Buffer.alloc(6)),
        webpChunk('ANMF', Buffer.alloc(size - 52)),
      ]
    : (() => {
        const vp8l = Buffer.alloc(size - 20);
        vp8l[0] = 0x2f;
        vp8l[1] = 0xff;
        vp8l[2] = 0xc1;
        vp8l[3] = 0x7f;
        vp8l[4] = 0x00;
        return [webpChunk('VP8L', vp8l)];
      })();
  const content = Buffer.concat([Buffer.from('WEBP'), ...chunks]);
  const riff = Buffer.alloc(8);
  riff.write('RIFF', 0, 4, 'ascii');
  riff.writeUInt32LE(content.length, 4);
  return Buffer.concat([riff, content]);
}

describe('encaminhamento de figurinhas WhatsApp', () => {
  it('classifica figurinha WebP estática de até 100 KB', () => {
    expect(classifyWhatsAppSupportFile({
      bytes: webpFile(100 * 1024, false), name: 'figurinha.webp', mimeType: 'application/octet-stream',
    })).toEqual({ type: 'sticker', mimeType: 'image/webp' });
  });

  it('recusa figurinha estática acima de 100 KB', () => {
    expect(() => classifyWhatsAppSupportFile({
      bytes: webpFile(100 * 1024 + 1, false), name: 'figurinha.webp', mimeType: 'image/webp',
    })).toThrow('Figurinhas estáticas devem ter até 100 KB.');
  });

  it('classifica figurinha WebP animada de até 500 KB', () => {
    expect(classifyWhatsAppSupportFile({
      bytes: webpFile(500 * 1024, true), name: 'figurinha.webp', mimeType: 'image/webp',
    })).toEqual({ type: 'sticker', mimeType: 'image/webp' });
  });

  it('recusa figurinha animada acima de 500 KB', () => {
    expect(() => classifyWhatsAppSupportFile({
      bytes: webpFile(500 * 1024 + 1, true), name: 'figurinha.webp', mimeType: 'image/webp',
    })).toThrow('Figurinhas animadas devem ter até 500 KB.');
  });

  it('recusa conteúdo que não tenha um contêiner WebP válido', () => {
    expect(() => classifyWhatsAppSupportFile({
      bytes: Buffer.from('not a WebP'), name: 'figurinha.webp', mimeType: 'image/webp',
    })).toThrow('Figurinha inválida: o WebP precisa ser válido e ter 512 × 512 pixels.');
  });

  it('recusa WebP com dimensões diferentes de 512 × 512', () => {
    const invalidDimensions = webpFile(100 * 1024, false);
    invalidDimensions[24] = 0xfe;
    expect(() => classifyWhatsAppSupportFile({
      bytes: invalidDimensions, name: 'figurinha.webp', mimeType: 'image/webp',
    })).toThrow('Figurinha inválida: o WebP precisa ser válido e ter 512 × 512 pixels.');
  });
});
