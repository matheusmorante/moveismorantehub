import bwipjs from 'bwip-js';

/**
 * Gera Data URL em formato PNG Base64 a partir de uma URL ou string via bwip-js.
 * Suporta execução nativa em navegadores (via Canvas) e em ambiente Node/SSR (via toBuffer).
 */
export async function generateQrCodeDataUrl(text: string): Promise<string> {
  // 1. Tenta no navegador via elemento <canvas> off-screen (ambiente Vite / Web)
  try {
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const canvas = document.createElement('canvas');
      const toCanvas = (bwipjs as any)?.toCanvas || (bwipjs as any)?.default?.toCanvas;
      if (typeof toCanvas === 'function') {
        toCanvas(canvas, {
          bcid: 'qrcode',
          text,
          scale: 4,
          includetext: false,
          backgroundcolor: 'ffffff',
        });
        const dataUrl = canvas.toDataURL('image/png');
        if (dataUrl && dataUrl.startsWith('data:image/png') && dataUrl.length > 100) {
          return dataUrl;
        }
      }
    }
  } catch {
    // Fallback para toBuffer
  }

  // 2. Tenta via toBuffer (ambiente Node / Vitest / SSR)
  try {
    const toBuffer = (bwipjs as any)?.toBuffer || (bwipjs as any)?.default?.toBuffer;
    if (typeof toBuffer === 'function') {
      const buf = await toBuffer({
        bcid: 'qrcode',
        text,
        scale: 3,
        includetext: false,
        backgroundcolor: 'ffffff',
      });
      if (buf && typeof buf.toString === 'function') {
        return `data:image/png;base64,${buf.toString('base64')}`;
      }
    }
  } catch {
    // Fallback para toSVG
  }

  // 3. Fallback via toSVG
  try {
    const toSVG = (bwipjs as any)?.toSVG || (bwipjs as any)?.default?.toSVG;
    if (typeof toSVG === 'function') {
      const svg = toSVG({
        bcid: 'qrcode',
        text,
        scale: 3,
        includetext: false,
        padding: 0,
      });
      if (svg) {
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      }
    }
  } catch {
    // Falha silenciosa
  }

  return '';
}
