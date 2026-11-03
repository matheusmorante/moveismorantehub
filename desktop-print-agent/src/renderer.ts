import { chromium, Browser } from 'playwright';
import { PrintPreset } from './presets';

let browserInstance: Browser | null = null;

const getBrowser = async (): Promise<Browser> => {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-extensions',
        '--disable-component-update',
        '--mute-audio',
      ],
    });
  }
  return browserInstance;
};

/**
 * Pré-aquece o processo Chromium na inicialização para eliminar o cold start no primeiro job
 */
export const warmupRenderer = async (): Promise<void> => {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent('<html><body>warmup</body></html>', { waitUntil: 'domcontentloaded' });
    await page.close().catch(() => {});
    console.log('[Renderer] Chromium pré-aquecido e pronto em standby na memória RAM.');
  } catch (err) {
    console.warn('[Renderer] Aviso no warmup do Chromium:', err);
  }
};

export const renderHtmlToPdfBuffer = async (html: string, preset: PrintPreset): Promise<Buffer> => {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Bloqueia requisições externas desnecessárias para não travar a geração
    const allowedOrigins = new Set([
      preset.assetOrigin,
      'https://hkoxhourxwlddgsfdgws.supabase.co',
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
    ].filter(Boolean));
    await page.route('**/*', (route) => {
      const url = route.request().url();
      let allowed = url.startsWith('data:') || url.startsWith('blob:');
      if (!preset.paperWidthMm || !preset.paperHeightMm) {
        allowed ||= url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
      }
      try {
        allowed ||= allowedOrigins.has(new URL(url).origin);
      } catch { /* Bloqueia URLs sem origem HTTP válida. */ }
      if (allowed) {
        route.continue();
      } else {
        route.abort();
      }
    });

    let documentHtml = html;
    if (preset.paperWidthMm && preset.paperHeightMm) {
      const origin = preset.assetOrigin || 'https://morantehub.vercel.app';
      const csp = `default-src 'none'; img-src data: ${origin} https://hkoxhourxwlddgsfdgws.supabase.co; style-src 'unsafe-inline' ${origin} https://fonts.googleapis.com; font-src data: ${origin} https://hkoxhourxwlddgsfdgws.supabase.co https://fonts.gstatic.com; connect-src 'none'; frame-src 'none'; object-src 'none'; script-src 'none'`;
      documentHtml = documentHtml
        .replace(/<base\b[^>]*>/gi, '')
        .replace(/<meta\b[^>]*http-equiv\s*=\s*(["'])?refresh\1?[^>]*>/gi, '')
        .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
        .replace(/<(iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
        .replace(/<(iframe|object|embed)\b[^>]*\/?>/gi, '')
        .replace(/\s+on[a-z0-9:_-]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/\s+(href|src|xlink:href)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '')
        .replace(/<head\b([^>]*)>/i, `<head$1><meta http-equiv="Content-Security-Policy" content="${csp}"><base href="${origin}/">`);
    }
    await page.setContent(documentHtml, { waitUntil: 'domcontentloaded', timeout: 8000 });
    await page.emulateMedia({ media: 'print' });

    const pdfBuffer = await page.pdf({
      ...(preset.paperWidthMm && preset.paperHeightMm
        ? {
            width: `${preset.paperWidthMm}mm`,
            height: `${preset.paperHeightMm}mm`,
            preferCSSPageSize: true,
          }
        : { format: preset.paperSize || 'A4' }),
      ...(!preset.paperWidthMm || !preset.paperHeightMm ? { landscape: preset.orientation === 'landscape' } : {}),
      scale: preset.scale || 1.0,
      margin: preset.paperWidthMm && preset.paperHeightMm
        ? { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
        : preset.margins || { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' },
      printBackground: true,
    });

    return pdfBuffer;
  } finally {
    await page.close().catch(() => {});
  }
};

export const closeBrowserInstance = async (): Promise<void> => {
  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
};
