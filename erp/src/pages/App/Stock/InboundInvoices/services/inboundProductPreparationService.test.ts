import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getNextSequentialProductCode } from '@/pages/utils/productService/productSkuService';
import { prepareNewParentWithVariation, prepareExistingParentNewVariation } from './inboundProductPreparationService';
import { ensureDefaultVariation } from '@/pages/utils/productVariationDefaults';
import type Product from '@/pages/types/product.type';

vi.mock('@/pages/utils/aiService', () => ({ aiService: { extractProductColor: vi.fn().mockResolvedValue('Azul') } }));
vi.mock('@/pages/utils/categoryService', () => ({ fetchGroupsAndCategories: vi.fn() }));
vi.mock('@/pages/utils/variationService', () => ({ ensureAttributeValue: vi.fn().mockResolvedValue({ name: 'Cor', value: 'Azul' }) }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));
vi.mock('@/pages/utils/productService/productLocalCache', () => ({ getLocalProducts: () => [] }));
vi.mock('@/pages/utils/productService/productSkuService', async (importOriginal) => ({
    ...await importOriginal<typeof import('@/pages/utils/productService/productSkuService')>(),
    getNextSequentialProductCode: vi.fn().mockResolvedValue('000123'),
}));

const item = { productDescription: 'Mesa Azul', productCode: 'FORN-987', unitCost: 100 };
beforeEach(() => { vi.mocked(getNextSequentialProductCode).mockResolvedValue('000123'); });

describe('SKU interno no cadastro rápido da nota', () => {
    it('reserva o código da nota à referência do fornecedor e usa o SKU normal do novo pai', async () => {
        const initial = await prepareNewParentWithVariation(item, 'fornecedor-teste');
        expect(initial.supplierRef).toBe('FORN-987');
        expect(initial.code).toBe('000123');
        expect(initial.variations?.[0].sku).toBe('000123-01');
        const form = ensureDefaultVariation({ ...initial, code: '000123' });
        expect(form.variations?.[0].sku).toBe('000123-01');
    });

    it('gera o próximo SKU do pai existente sem alterar suas variações anteriores', async () => {
        const parent = {
            id: 'pai-teste', code: '000123', name: 'Mesa',
            variations: [{ id: 'anterior', sku: '000123-05', name: 'Mesa Verde', attributes: [], stock: 0, unitPrice: 100 }],
        } as Product;
        const result = await prepareExistingParentNewVariation(parent, item);
        expect(result.variations?.[0]).toEqual(parent.variations?.[0]);
        expect(result.variations?.[1].sku).toBe('000123-06');
        expect(parent.variations).toHaveLength(1);
        expect(result.variations?.some(variation => variation.sku === item.productCode)).toBe(false);
    });

    it('preenche automaticamente categoryIds e categories com a categoria correspondente à descrição', async () => {
        const { fetchGroupsAndCategories } = await import('@/pages/utils/categoryService');
        vi.mocked(fetchGroupsAndCategories).mockResolvedValueOnce({
            categories: [
                { id: 'cat-balcao-pia', name: 'Balcões para Pia', active: true },
                { id: 'cat-mesas-escritorio', name: 'Mesas para Escritório', active: true }
            ],
            groups: []
        } as any);

        const balcaoItem = { productDescription: 'Balcão para pia 1.20m cinza', productCode: 'FORN-111', unitCost: 200 };
        const initial = await prepareNewParentWithVariation(balcaoItem, 'fornecedor-teste');

        expect(initial.categoryIds).toEqual(['cat-balcao-pia']);
        expect(initial.categories).toEqual(['Balcões para Pia']);
        expect(initial.category).toBe('Balcões para Pia');
    });
});
