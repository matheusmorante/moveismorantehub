import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchImageAsPngBlob } from './imageClipboardUtils';

describe('imageClipboardUtils — fetchImageAsPngBlob', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('deve retornar diretamente o blob se a URL for data:image/png', async () => {
    const pngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const blob = await fetchImageAsPngBlob(pngDataUrl);
    expect(blob).toBeDefined();
    expect(blob.type).toBe('image/png');
  });

  it('deve tentar múltiplos candidatos via fetch se for URL remota', async () => {
    const attemptedUrls: string[] = [];

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      attemptedUrls.push(url);
      if (url.includes('weserv.nl')) {
        return Promise.resolve({
          ok: true,
          blob: async () => new Blob(['fake-png-data'], { type: 'image/png' }),
        });
      }
      return Promise.reject(new Error('CORS error'));
    });

    const testUrl = 'https://example.com/foto-secundaria.jpg';
    const blob = await fetchImageAsPngBlob(testUrl);

    expect(blob).toBeDefined();
    expect(blob.type).toBe('image/png');
    expect(attemptedUrls.length).toBeGreaterThan(1);
    expect(attemptedUrls.some(u => u.includes('weserv.nl'))).toBe(true);
  });

  it('não deve lançar erro contendo a palavra "canvas" em caso de falha completa', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    // Mock Image onerror
    const originalImage = globalThis.Image;
    // @ts-expect-error Mock simples de Image
    globalThis.Image = class {
      set src(_val: string) {
        setTimeout(() => {
          if (typeof this.onerror === 'function') {
            this.onerror(new Event('error'));
          }
        }, 0);
      }
      onerror: ((event: Event) => void) | null = null;
      onload: (() => void) | null = null;
    };

    try {
      await expect(
        fetchImageAsPngBlob('https://example.com/inexistente.jpg')
      ).rejects.toThrowError(/Não foi possível carregar a imagem para cópia direta/);
    } finally {
      globalThis.Image = originalImage;
    }
  });
});
