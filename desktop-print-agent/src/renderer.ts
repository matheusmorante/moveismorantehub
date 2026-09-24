import { chromium, Browser } from 'playwright-core';
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

export const renderHtmlToPdfBuffer = async (
    html: string,
    preset: PrintPreset
): Promise<Buffer> => {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        // Bloqueia requisições externas desnecessárias para não travar a geração
        await page.route('**/*', (route) => {
            const url = route.request().url();
            if (url.startsWith('data:') || url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
                route.continue();
            } else {
                route.abort();
            }
        });

        await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 8000 });
        await page.emulateMedia({ media: 'print' });

        const pdfBuffer = await page.pdf({
            format: preset.paperSize || 'A4',
            landscape: preset.orientation === 'landscape',
            scale: preset.scale || 1.0,
            margin: preset.margins || { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' },
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

