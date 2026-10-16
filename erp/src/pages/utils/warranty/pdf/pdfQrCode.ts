import bwipjs from 'bwip-js';

/**
 * Gera Data URL em formato PNG Base64 a partir de uma URL ou string via bwip-js.
 */
export async function generateQrCodeDataUrl(text: string): Promise<string> {
  try {
    if (typeof bwipjs?.toBuffer === 'function') {
      const buf = await bwipjs.toBuffer({
        bcid: 'qrcode',
        text,
        scale: 3,
        includetext: false,
        backgroundcolor: 'ffffff',
      });
      return `data:image/png;base64,${buf.toString('base64')}`;
    }
  } catch {
    // Fallback gracioso
  }
  return '';
}
