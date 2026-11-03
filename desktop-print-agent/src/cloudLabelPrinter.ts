import { createHash } from 'crypto';
import { loadMachineConfig } from './config';
import { renderHtmlToPdfBuffer } from './renderer';
import { sendPdfToWindowsSpooler } from './spooler';
import type { PrintPreset } from './presets';

export interface CloudLabelJob {
  id: string;
  category: 'identificacao' | 'precos';
  html: string;
  assetOrigin: string;
  paperWidthMm: number;
  paperHeightMm: number;
  claimToken: string;
}

const isAllowedOrigin = (value: string) => {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' && (url.hostname === 'morantehub.vercel.app' || url.hostname === 'morantehub.com' || url.hostname.endsWith('.morantehub.com'))) ||
      (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname) && url.port === '5173');
  } catch { return false; }
};

const sanitizeHtml = (html: string) => html
  .replace(/<base\b[^>]*>/gi, '')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
  .replace(/<(iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
  .replace(/<(iframe|object|embed)\b[^>]*\/?>/gi, '')
  .replace(/\s+on[a-z0-9:_-]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  .replace(/\s+(href|src|xlink:href)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '');

export const printCloudLabelJob = async (job: CloudLabelJob): Promise<void> => {
  if (!job || !/^[0-9a-f-]{36}$/i.test(job.id) || !['identificacao', 'precos'].includes(job.category) ||
      typeof job.html !== 'string' || Buffer.byteLength(job.html, 'utf8') > 3_000_000 ||
      !isAllowedOrigin(job.assetOrigin) || !Number.isFinite(job.paperWidthMm) || !Number.isFinite(job.paperHeightMm) ||
      job.paperWidthMm < 20 || job.paperWidthMm > 500 || job.paperHeightMm < 30 || job.paperHeightMm > 1200) {
    throw new Error('O trabalho de impressão é inválido.');
  }

  const machine = loadMachineConfig();
  const printer = machine.defaultPrinter || 'EPSON L3250 Series';
  const preset: PrintPreset = {
    printerName: printer,
    paperWidthMm: job.paperWidthMm,
    paperHeightMm: job.paperHeightMm,
    assetOrigin: new URL(job.assetOrigin).origin,
    orientation: 'portrait',
    copies: 1,
    scale: 1,
    quality: 'normal',
    margins: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
  };
  const html = sanitizeHtml(job.html);
  const pdf = await renderHtmlToPdfBuffer(html, preset);
  const printId = createHash('sha256').update(`${job.id}:${job.claimToken}`).digest('hex').slice(0, 32);
  await sendPdfToWindowsSpooler(pdf, printer, preset, printId);
}
