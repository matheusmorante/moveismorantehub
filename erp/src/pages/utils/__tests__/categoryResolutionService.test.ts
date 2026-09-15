import { describe, expect, it, vi } from 'vitest';
import { matchCategoryByRules, resolveAutoCategory } from '../categoryResolutionService';
import { aiService } from '../aiService';

vi.mock('./aiService', () => ({
    aiService: {
        suggestCategory: vi.fn(),
    },
}));

const mockCategories = [
    { id: 'cat-balcao-pia', name: 'Balcões para Pia' },
    { id: 'cat-balcao-cooktop', name: 'Balcões para Cooktop' },
    { id: 'cat-paneleiros', name: 'Paneleiros' },
    { id: 'cat-aereos', name: 'Armários Aéreos' },
    { id: 'cat-cristaleiras', name: 'Cristaleiras' },
    { id: 'cat-mesa-jantar', name: 'Conjunto para Sala de Jantar' },
    { id: 'cat-mesa-escritorio', name: 'Mesas para Escritório' },
    { id: 'cat-guarda-roupas', name: 'Guarda-Roupas' },
    { id: 'cat-comodas', name: 'Cômodas' },
    { id: 'cat-camas', name: 'Camas/Bases Box' },
];

describe('categoryResolutionService', () => {
    it('seleciona categoria Balcões para Pia quando o produto contiver balcão para pia', () => {
        const result = matchCategoryByRules('BALCAO PARA PIA 1.20M RUBIM', mockCategories);
        expect(result?.id).toBe('cat-balcao-pia');
        expect(result?.name).toBe('Balcões para Pia');
    });

    it('seleciona categoria Paneleiros quando o produto contiver paneleiro', () => {
        const result = matchCategoryByRules('PANELEIRO DUPLO 4 PORTAS PLUS', mockCategories);
        expect(result?.id).toBe('cat-paneleiros');
        expect(result?.name).toBe('Paneleiros');
    });

    it('seleciona categoria Armários Aéreos quando o produto contiver armário aéreo', () => {
        const result = matchCategoryByRules('ARMARIO AEREO 3 PORTAS BASCULANTE', mockCategories);
        expect(result?.id).toBe('cat-aereos');
        expect(result?.name).toBe('Armários Aéreos');
    });

    it('seleciona categoria Cristaleiras quando o produto contiver cristaleira', () => {
        const result = matchCategoryByRules('CRISTALEIRA 2 PORTAS DE VIDRO ILUMINAÇÃO LED', mockCategories);
        expect(result?.id).toBe('cat-cristaleiras');
        expect(result?.name).toBe('Cristaleiras');
    });

    it('seleciona categoria Conjunto para Sala de Jantar para mesa de jantar', () => {
        const result = matchCategoryByRules('MESA PARA JANTAR 6 CADEIRAS MADALENA', mockCategories);
        expect(result?.id).toBe('cat-mesa-jantar');
        expect(result?.name).toBe('Conjunto para Sala de Jantar');
    });

    it('seleciona categoria Mesas para Escritório para mesa para escritório', () => {
        const result = matchCategoryByRules('MESA PARA ESCRITORIO DIRETOR EM L', mockCategories);
        expect(result?.id).toBe('cat-mesa-escritorio');
        expect(result?.name).toBe('Mesas para Escritório');
    });

    it('recorre à IA quando o produto não atende a uma regra direta e retorna a categoria correspondente', async () => {
        vi.mocked(aiService.suggestCategory).mockResolvedValueOnce({ category: 'Camas/Bases Box' } as any);
        const result = await resolveAutoCategory('SOMMIER CASAL CONFORT PREMIUM', mockCategories);
        expect(result?.id).toBe('cat-camas');
        expect(result?.name).toBe('Camas/Bases Box');
    });
});
