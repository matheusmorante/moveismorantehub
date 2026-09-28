import { describe, expect, it } from 'vitest';
import type Product from '@/pages/types/product.type';
import { validateErpActivationRequirements } from './useProductsActivationValidation';

const validComposition = (productKind?: Product['productKind']): Product => ({
    id: 'composition-1',
    name: 'Composição teste',
    description: '',
    categoryIds: ['category-1'],
    unitPrice: 100,
    unit: 'UN',
    active: false,
    isDraft: false,
    itemType: 'composition',
    mainSupplierId: 'supplier-1',
    comboItems: [
        { productId: 'part-1', quantity: 1, description: 'Parte 1', unitPrice: 50, stock: 1 },
        { productId: 'part-2', quantity: 1, description: 'Parte 2', unitPrice: 50, stock: 1 },
    ],
    ...(productKind ? { productKind } : {}),
});

describe('validação da ativação ERP por tipo do produto', () => {
    it('bloqueia a ativação de uma composição Salvado', () => {
        const salvado = validComposition('salvado');

        expect(validateErpActivationRequirements(salvado.id!, [salvado], [salvado])).toMatchObject({
            isValid: false,
            errorMessage: 'Produtos do tipo Salvado permanecem desativados no ERP.',
        });
    });

    it('bloqueia uma variação quando o produto pai é Salvado', () => {
        const salvado = {
            ...validComposition('salvado'),
            variations: [{
                id: 'variation-1',
                sku: 'COMP-01',
                name: 'Variação',
                stock: 1,
                unitPrice: 100,
                active: false,
                attributes: [],
            }],
        };

        expect(validateErpActivationRequirements('variation-1', [salvado], [salvado])).toMatchObject({
            isValid: false,
            errorMessage: 'Produtos do tipo Salvado permanecem desativados no ERP.',
        });
    });

    it('trata composição antiga sem productKind como Normal e permite validar ativação', () => {
        const legacyComposition = validComposition();

        expect(validateErpActivationRequirements(legacyComposition.id!, [legacyComposition], [legacyComposition]))
            .toEqual({ isValid: true });
    });
});
