import { describe, it, expect, vi } from 'vitest';

vi.mock('@/pages/utils/supabaseConfig', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null })
        }))
    }
}));

import { aiService } from '../aiService';

describe('aiService Facade & Modularization', () => {
    it('deve expor todos os métodos de catálogo e precificação', () => {
        expect(typeof aiService.improveProductDescription).toBe('function');
        expect(typeof aiService.generateDescription).toBe('function');
        expect(typeof aiService.generateMarketplaceTitle).toBe('function');
        expect(typeof aiService.generateProductDescription).toBe('function');
        expect(typeof aiService.suggestPrices).toBe('function');
        expect(typeof aiService.suggestCategory).toBe('function');
        expect(typeof aiService.generateComboName).toBe('function');
        expect(typeof aiService.extractProductColor).toBe('function');
    });

    it('deve expor os métodos fiscais e tributários', () => {
        expect(typeof aiService.findNCM).toBe('function');
        expect(typeof aiService.generateNCM).toBe('function');
        expect(typeof aiService.generateFiscalData).toBe('function');
    });

    it('deve expor os métodos de extração de pedidos e chat', () => {
        expect(typeof aiService.detectIntent).toBe('function');
        expect(typeof aiService.chat).toBe('function');
        expect(typeof aiService.parseOrderFreeText).toBe('function');
    });

    it('deve expor os métodos de NF de entrada', () => {
        expect(typeof aiService.classifyInboundItemWithSupplierContext).toBe('function');
    });
});
