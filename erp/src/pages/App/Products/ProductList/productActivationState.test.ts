import { describe, expect, it } from 'vitest';
import { updateProductActivationState } from './productActivationState';

const products: any[] = [
    {
        id: 'parent',
        active: false,
        variations: [
            { id: 'variation-a', sku: 'RED', active: false },
            { id: 'variation-b', sku: 'BLUE', active: false },
        ],
    },
    { id: 'child', parentId: 'parent', active: false },
];

describe('updateProductActivationState', () => {
    it('atualiza produto-pai e suas variações filhas em cascata', () => {
        const updated = updateProductActivationState(products, 'parent', true);
        expect(updated[0].active).toBe(true);
        expect(updated[0].variations).toEqual([
            { id: 'variation-a', sku: 'RED', active: true },
            { id: 'variation-b', sku: 'BLUE', active: true },
        ]);
        expect(updated[1].active).toBe(true);
    });

    it('ao ativar uma variação por SKU composto, ativa o pai se ao menos uma variação estiver ativa', () => {
        const updated = updateProductActivationState(products, 'parent_BLUE', true);
        expect(updated[0].variations[0].active).toBe(false);
        expect(updated[0].variations[1].active).toBe(true);
        // Pai é derivado: se ao menos 1 estiver ativa, pai fica ativo
        expect(updated[0].active).toBe(true);
    });

    it('ao desativar a única variação ativa, o produto pai fica desativado', () => {
        const productWithOneActive: any[] = [
            {
                id: 'parent-1',
                active: true,
                variations: [
                    { id: 'var-1', sku: 'V1', active: true },
                    { id: 'var-2', sku: 'V2', active: false },
                ],
            }
        ];

        const updated = updateProductActivationState(productWithOneActive, 'var-1', false);
        expect(updated[0].variations[0].active).toBe(false);
        expect(updated[0].variations[1].active).toBe(false);
        // Todas as variações desativadas -> pai fica desativado
        expect(updated[0].active).toBe(false);
    });

    it('ao reativar uma variação, o produto pai volta a ficar ativo', () => {
        const productAllInactive: any[] = [
            {
                id: 'parent-2',
                active: false,
                variations: [
                    { id: 'var-1', sku: 'V1', active: false },
                    { id: 'var-2', sku: 'V2', active: false },
                ],
            }
        ];

        const updated = updateProductActivationState(productAllInactive, 'var-2', true);
        expect(updated[0].variations[0].active).toBe(false);
        expect(updated[0].variations[1].active).toBe(true);
        // Pelo menos uma ativa -> pai fica ativo
        expect(updated[0].active).toBe(true);
    });
});

