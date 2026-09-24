import { describe, it, expect, beforeEach } from 'vitest';
import { 
    getLocalSelectedPrinter, 
    setLocalSelectedPrinter, 
    getLocalDocumentQuality, 
    setLocalDocumentQuality 
} from '../printStorage';

const mockStorage: Record<string, string> = {};
const localStorageMock = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
});

describe('printStorage (Local Machine Preferences)', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('deve retornar string vazia quando nenhuma impressora estiver salva', () => {
        expect(getLocalSelectedPrinter()).toBe('');
    });

    it('deve salvar e recuperar a impressora principal localmente neste computador', () => {
        setLocalSelectedPrinter('EPSON L3250 Series');
        expect(getLocalSelectedPrinter()).toBe('EPSON L3250 Series');
    });

    it('deve remover a impressora quando valor for vazio', () => {
        setLocalSelectedPrinter('EPSON L3250 Series');
        setLocalSelectedPrinter('');
        expect(getLocalSelectedPrinter()).toBe('');
    });

    it('deve salvar e recuperar preferências locais de qualidade por documento', () => {
        expect(getLocalDocumentQuality('receipt')).toBeNull();

        setLocalDocumentQuality('receipt', 'draft');
        expect(getLocalDocumentQuality('receipt')).toBe('draft');

        setLocalDocumentQuality('sales_order', 'normal');
        expect(getLocalDocumentQuality('sales_order')).toBe('normal');

        setLocalDocumentQuality('danfe', 'high');
        expect(getLocalDocumentQuality('danfe')).toBe('high');
    });
});
