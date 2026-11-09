import { extractNfeAccessKeyFromOcrText } from '../../../../../../shared-utils/fiscalIdentifiers';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

function findValidatedAccessKey(text: string): string | null {
  return extractNfeAccessKeyFromOcrText(text);
}

async function renderFirstPdfPage(file: File): Promise<HTMLCanvasElement> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  try {
    const page = await document.getPage(1);
    const viewport = page.getViewport({ scale: 2.4 });
    const canvas = window.document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a página para OCR.');
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas;
  } finally {
    await document.destroy();
  }
}

export async function extractNfeAccessKeyWithOcr(file: File): Promise<string | null> {
  const source = file.type === 'application/pdf' ? await renderFirstPdfPage(file) : file;
  const { createWorker, PSM } = await import('tesseract.js');
  const worker = await createWorker('eng');
  try {
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    });
    const { data } = await worker.recognize(source);
    return findValidatedAccessKey(data.text || '');
  } finally {
    await worker.terminate();
  }
}
