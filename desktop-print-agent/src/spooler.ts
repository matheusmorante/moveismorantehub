import fs from 'fs';
import path from 'path';
import os from 'os';
import { print } from 'pdf-to-printer';
import { PrintPreset } from './presets';

const TEMP_DIR = path.join(os.tmpdir(), 'morantehub-print');

const ensureTempDir = () => {
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
};

export const sendPdfToWindowsSpooler = async (
    pdfBuffer: Buffer,
    printerName: string,
    preset: PrintPreset,
    jobId: string
): Promise<void> => {
    ensureTempDir();
    const tempPdfPath = path.join(TEMP_DIR, `job-${jobId}.pdf`);

    try {
        fs.writeFileSync(tempPdfPath, pdfBuffer);

        await print(tempPdfPath, {
            printer: printerName,
            copies: preset.copies || 1,
            paperSize: preset.paperSize || 'A4',
            scale: 'noscale', // A escala exata já foi aplicada milimetricamente pelo Chromium na geração do PDF
            silent: true,
        });
    } finally {
        // Exclusão imediata do arquivo temporário para não ocupar disco
        try {
            if (fs.existsSync(tempPdfPath)) {
                fs.unlinkSync(tempPdfPath);
            }
        } catch (unlinkErr) {
            console.warn('[Spooler] Aviso ao excluir PDF temporário:', unlinkErr);
        }
    }
};
