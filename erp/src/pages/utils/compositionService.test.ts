import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveComposition } from './compositionService';

const mockDb = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('./supabaseConfig', () => ({ supabase: mockDb }));

describe('compositionService.saveComposition', () => {
    beforeEach(() => {
        mockDb.rpc.mockReset();
    });

    it('persiste composição e componentes em uma operação transacional', async () => {
        mockDb.rpc.mockResolvedValue({ data: 'composition-1', error: null });

        const composition = {
            id: 'composition-1',
            name: 'Kit [TESTE_AUT]',
            sku: 'KIT-TESTE-AUT',
            active: true,
            catalog_published: false,
            pricing_mode: 'sum' as const,
        };
        const variations = [{
            id: 'variation-1',
            name: 'Padrão',
            active: true,
            items: [{ product_id: 'product-1', variation_id: 'variation-product-1', quantity: 2 }],
        }];

        await expect(saveComposition(composition, variations)).resolves.toBe('composition-1');

        expect(mockDb.rpc).toHaveBeenCalledWith('save_composition_transaction', {
            p_composition_id: 'composition-1',
            p_composition: {
                name: 'Kit [TESTE_AUT]',
                sku: 'KIT-TESTE-AUT',
                description: undefined,
                active: true,
                catalog_published: false,
                pricing_mode: 'sum',
                manual_price: undefined,
            },
            p_variations: variations,
        });
    });

    it('não transforma erro transacional em sucesso', async () => {
        mockDb.rpc.mockResolvedValue({ data: null, error: new Error('rollback') });

        await expect(saveComposition({ name: 'Kit [TESTE_AUT]' }, [])).rejects.toThrow('rollback');
    });
});
