import fs from 'fs';
import path from 'path';

export interface PrintPreset {
    printerName: string;
    paperSize: 'A4' | 'Letter';
    orientation: 'portrait' | 'landscape';
    copies: number;
    scale: number;
    quality?: 'draft' | 'normal' | 'high';
    monochrome?: boolean;
    margins: {
        top: string;
        right: string;
        bottom: string;
        left: string;
    };
}

const PRESETS_FILE = path.join(__dirname, '..', 'presets.json');

const DEFAULT_PRESETS: Record<string, PrintPreset> = {
    sales_order: {
        printerName: 'EPSON L3250 Series',
        paperSize: 'A4',
        orientation: 'portrait',
        copies: 1,
        scale: 0.92,
        quality: 'normal',
        monochrome: false,
        margins: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' },
    },
    receipt: {
        printerName: 'EPSON L3250 Series',
        paperSize: 'A4',
        orientation: 'portrait',
        copies: 1,
        scale: 1.0,
        quality: 'draft', // Rascunho / Econômica para envio e impressão instantânea
        monochrome: true,
        margins: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' },
    },
    danfe: {
        printerName: 'EPSON L3250 Series',
        paperSize: 'A4',
        orientation: 'portrait',
        copies: 1,
        scale: 1.0,
        quality: 'normal',
        monochrome: false,
        margins: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    },
    test: {
        printerName: 'EPSON L3250 Series',
        paperSize: 'A4',
        orientation: 'portrait',
        copies: 1,
        scale: 1.0,
        margins: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    },
};

export const loadPresets = (): Record<string, PrintPreset> => {
    try {
        if (fs.existsSync(PRESETS_FILE)) {
            const content = fs.readFileSync(PRESETS_FILE, 'utf-8');
            return { ...DEFAULT_PRESETS, ...JSON.parse(content) };
        }
    } catch (err) {
        console.warn('[Presets] Falha ao ler presets.json, usando padrões:', err);
    }
    return DEFAULT_PRESETS;
};

export const savePresets = (presets: Record<string, PrintPreset>): void => {
    try {
        fs.writeFileSync(PRESETS_FILE, JSON.stringify(presets, null, 2), 'utf-8');
    } catch (err) {
        console.error('[Presets] Erro ao gravar presets.json:', err);
    }
};

export const getPresetForType = (type: string): PrintPreset => {
    const all = loadPresets();
    return all[type] || all.sales_order || DEFAULT_PRESETS.sales_order;
};
