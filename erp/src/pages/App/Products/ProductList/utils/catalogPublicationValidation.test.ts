import { describe, expect, it, vi } from 'vitest';

vi.mock('@/pages/utils/supabaseConfig', () => ({
    supabase: {},
    isTestEnvironment: false
}));
import { validateCatalogPublication } from '../hooks/useProductsCatalogActions';
import { mapDbVariations, createDefaultVariation } from '@/pages/utils/productService/productVariationMapper';
import Product from '@/pages/types/product.type';

describe('Validação de Publicação no Catálogo Digital', () => {
    it('bloqueia publicação de produto em rascunho', () => {
        const draftProduct: Partial<Product> = {
            id: 'prod-draft',
            description: 'Produto Rascunho',
            isDraft: true,
            status: 'draft',
            unitPrice: 100,
            images: ['https://example.com/foto.jpg'],
            categoryIds: ['cat-1'],
            width: 50,
            height: 50,
            depth: 50
        };

        const result = validateCatalogPublication(draftProduct as Product);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('rascunho');
    });

    it('bloqueia publicação de produto sem conformidade de campos obrigatórios (sem fotos, sem dimensões)', () => {
        const incompleteProduct: Partial<Product> = {
            id: 'prod-incomplete',
            name: 'Produto Incompleto',
            description: 'Produto Incompleto',
            isDraft: false,
            status: 'hidden',
            unitPrice: 150,
            images: [], // Sem foto!
            categoryIds: ['cat-1'],
            width: 0, // Sem dimensões!
            height: 0,
            depth: 0
        };

        const result = validateCatalogPublication(incompleteProduct as Product);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBeDefined();
    });

    it('aprova publicação quando produto atende a todos os requisitos do catálogo', () => {
        const validProduct: Partial<Product> = {
            id: 'prod-complete',
            name: 'Mesa de Jantar 6 Lugares',
            title: 'Mesa de Jantar 6 Lugares',
            description: 'Mesa de Jantar 6 Lugares em Madeira Maciça',
            isDraft: false,
            status: 'hidden',
            unitPrice: 1200,
            images: ['https://example.com/mesa.jpg'],
            categoryIds: ['cat-mesas'],
            width: 160,
            height: 80,
            depth: 90
        };

        const result = validateCatalogPublication(validProduct as Product);
        expect(result.isValid).toBe(true);
        expect(result.errorMessage).toBeUndefined();
    });
});

describe('Mapeamento seguro de status de variações (Anti-publicação indevida)', () => {
    it('mapDbVariations define status hidden quando variação e pai não possuem status explícito', () => {
        const rawVariations = [{
            id: 'var-1',
            product_id: 'prod-1',
            sku: 'MESA-01',
            name: 'Mesa Tabaco',
            price: 500,
            stock: 2,
            status: null // Sem status
        }];

        const mapped = mapDbVariations(rawVariations, { id: 'prod-1', status: null }, 'MESA');
        expect(mapped[0].status).toBe('hidden');
    });

    it('createDefaultVariation define status hidden quando pai não possui status', () => {
        const mapped = createDefaultVariation({ id: 'prod-1', status: null }, 'MESA', 'Mesa Simples', []);
        expect(mapped[0].status).toBe('hidden');
    });
});
