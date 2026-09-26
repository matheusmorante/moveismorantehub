import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock } = vi.hoisted(() => ({
    fromMock: vi.fn()
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
    ecommerceSupabase: {
        from: fromMock
    }
}));

import { subscribeToVariations } from '../variationService';

describe('subscribeToVariations', () => {
    beforeEach(() => {
        fromMock.mockReset();
    });

    it('preserva a lista quando category_attributes ainda não está disponível', async () => {
        const categoryTableError = {
            code: 'PGRST205',
            message: "Could not find the table 'public.category_attributes'"
        };

        fromMock.mockImplementation((table: string) => {
            if (table === 'attributes') {
                return {
                    select: vi.fn(() => ({
                        order: vi.fn().mockResolvedValue({
                            data: [{ id: 'attr-1', name: 'Cor', active: true }],
                            error: null
                        })
                    }))
                };
            }

            if (table === 'attribute_values') {
                return {
                    select: vi.fn().mockResolvedValue({
                        data: [
                            { id: 'value-2', attribute_id: 'attr-1', value: 'Azul 10' },
                            { id: 'value-1', attribute_id: 'attr-1', value: 'Azul 2' }
                        ],
                        error: null
                    })
                };
            }

            if (table === 'category_attributes') {
                return {
                    select: vi.fn().mockResolvedValue({
                        data: null,
                        error: categoryTableError
                    })
                };
            }

            throw new Error(`Tabela inesperada no teste: ${table}`);
        });

        const warningSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        const variations = await new Promise<Parameters<typeof subscribeToVariations>[0] extends (data: infer T) => void ? T : never>((resolve) => {
            subscribeToVariations(resolve);
        });

        expect(variations).toEqual([
            {
                id: 'attr-1',
                name: 'Cor',
                active: true,
                dataType: 'list',
                unit: '',
                options: [
                    { id: 'value-1', value: 'Azul 2' },
                    { id: 'value-2', value: 'Azul 10' }
                ],
                categoryAttributes: [],
                isGloballyRequired: false,
                deleted: false
            }
        ]);
        expect(warningSpy).toHaveBeenCalledWith(
            'Aviso ao buscar vínculos de categorias dos atributos:',
            categoryTableError
        );
    });
});
