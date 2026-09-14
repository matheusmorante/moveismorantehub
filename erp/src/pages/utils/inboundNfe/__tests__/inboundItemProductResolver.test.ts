import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    resolveLinkedProductDetails,
    enrichInboundItemsWithProductDetails,
    isGenericOrEmptyProductName,
} from '../inboundItemProductResolver';
import { getFullProduct } from '@/pages/utils/productService';
import type { InboundInvoiceItem } from '../inboundNfeTypes';

vi.mock('@/pages/utils/productService', () => ({
    getFullProduct: vi.fn(),
}));

describe('inboundItemProductResolver', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('identifica nomes genéricos ou vazios corretamente', () => {
        expect(isGenericOrEmptyProductName(undefined)).toBe(true);
        expect(isGenericOrEmptyProductName('')).toBe(true);
        expect(isGenericOrEmptyProductName('—')).toBe(true);
        expect(isGenericOrEmptyProductName('Produto vinculado')).toBe(true);
        expect(isGenericOrEmptyProductName('Produto já vinculado ao código do fornecedor')).toBe(true);
        expect(isGenericOrEmptyProductName('Variação vinculada anteriormente a este código do fornecedor')).toBe(true);
        expect(isGenericOrEmptyProductName('Armário Multiuso 2 Portas')).toBe(false);
    });

    it('resolve dados de produto com variação específica', async () => {
        vi.mocked(getFullProduct).mockResolvedValue({
            id: 'prod-1',
            code: 'ARM-BASE',
            name: 'Armário Multiuso',
            variations: [
                { id: 'var-1', sku: 'ARM-BRANCO', name: 'Armário Multiuso Branco' } as any,
                { id: 'var-2', sku: 'ARM-PRETO', name: 'Armário Multiuso Preto' } as any,
            ],
        } as any);

        const details = await resolveLinkedProductDetails('prod-1', 'var-2');
        expect(details).toEqual({
            linkedProductCode: 'ARM-PRETO',
            productErpName: 'Armário Multiuso Preto',
        });
    });

    it('enriquece itens com código e nome reais sem sobrescrever itens válidos', async () => {
        vi.mocked(getFullProduct).mockResolvedValue({
            id: 'prod-1',
            code: 'ARM-001',
            name: 'Armário Multiuso 2 Portas',
            variations: [],
        } as any);

        const items: InboundInvoiceItem[] = [
            {
                itemNumber: 1,
                productCode: 'FORN-1',
                productDescription: 'ARM MULTIUSO',
                ncm: '94032000',
                cfop: '5102',
                unit: 'UN',
                quantity: 1,
                unitCost: 100,
                totalCost: 100,
                matchedProductId: 'prod-1',
                productErpName: 'Produto vinculado', // genérico
                linkedProductCode: undefined, // ausente
            },
            {
                itemNumber: 2,
                productCode: 'FORN-2',
                productDescription: 'SOFA 3 LUG',
                ncm: '94017100',
                cfop: '5102',
                unit: 'UN',
                quantity: 1,
                unitCost: 200,
                totalCost: 200,
                matchedProductId: 'prod-2',
                productErpName: 'Sofá Retrátil 3 Lugares', // válido
                linkedProductCode: 'SOF-001', // válido
            },
        ];

        const enriched = await enrichInboundItemsWithProductDetails(items);
        expect(enriched[0].linkedProductCode).toBe('ARM-001');
        expect(enriched[0].productErpName).toBe('Armário Multiuso 2 Portas');

        expect(enriched[1].linkedProductCode).toBe('SOF-001');
        expect(enriched[1].productErpName).toBe('Sofá Retrátil 3 Lugares');
    });
});
