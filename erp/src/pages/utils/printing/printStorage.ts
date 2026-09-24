/**
 * Gerenciador de preferências locais de impressão (por máquina/computador)
 * Permite que cada estação de trabalho ou caixa tenha sua impressora principal
 * salva de forma persistente no navegador sem interferir nos outros PCs.
 */

const LOCAL_PRINTER_KEY = 'morantehub_local_printer';
const LOCAL_QUALITY_PREFIX = 'morantehub_local_quality_';

export const getLocalSelectedPrinter = (): string => {
    try {
        return localStorage.getItem(LOCAL_PRINTER_KEY) || '';
    } catch {
        return '';
    }
};

export const setLocalSelectedPrinter = (printerName: string): void => {
    try {
        if (printerName) {
            localStorage.setItem(LOCAL_PRINTER_KEY, printerName);
        } else {
            localStorage.removeItem(LOCAL_PRINTER_KEY);
        }
    } catch (err) {
        console.warn('[PrintStorage] Falha ao salvar impressora local no navegador:', err);
    }
};

export const getLocalDocumentQuality = (type: string): 'draft' | 'normal' | 'high' | null => {
    try {
        const val = localStorage.getItem(`${LOCAL_QUALITY_PREFIX}${type}`);
        if (val === 'draft' || val === 'normal' || val === 'high') {
            return val;
        }
        return null;
    } catch {
        return null;
    }
};

export const setLocalDocumentQuality = (type: string, quality: 'draft' | 'normal' | 'high'): void => {
    try {
        localStorage.setItem(`${LOCAL_QUALITY_PREFIX}${type}`, quality);
    } catch (err) {
        console.warn('[PrintStorage] Falha ao salvar qualidade local no navegador:', err);
    }
};
