import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabaseConfig', () => ({ supabase: {} }));

import { formatOrderCode, resolveOrderIndexForUpdate } from './orderCode';

describe('imutabilidade do código do pedido', () => {
    it('mantém o código já persistido mesmo que uma atualização traga outro valor', () => {
        expect(resolveOrderIndexForUpdate(
            { orderIndex: 2530 },
            { orderIndex: 1, deleted: true },
        )).toBe(2530);
    });

    it('preserva a apresentação do código após exclusão lógica', () => {
        const deletedOrder = { orderIndex: 2530, orderNumber: 2530, deleted: true };
        expect(formatOrderCode(deletedOrder)).toBe('002530');
        expect(resolveOrderIndexForUpdate(deletedOrder, { deleted: true })).toBe(2530);
    });

    it('ignora estritamente pedidos na faixa de teste (>= 800000) no cálculo da sequência legítima', async () => {
        const { getNextOrderIndex } = await import('./orderCode');
        const { supabase } = await import('./supabaseConfig');

        // Mock de pedidos no banco contendo pedidos reais e pedidos de teste residuais
        (supabase as any).from = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                        data: [
                            { order_number: '990012', order_data: { orderIndex: 990012 } }, // Teste
                            { order_number: '880008', order_data: { orderIndex: 880008 } }, // Teste
                            { order_number: '2456', order_data: { orderIndex: 2456 } },     // Último Real
                            { order_number: '2455', order_data: { orderIndex: 2455 } }      // Real Anterior
                        ],
                        error: null
                    })
                })
            })
        });

        const nextIndex = await getNextOrderIndex();
        // A sequência real DEVE ser 2457, completamente imune aos códigos 880008 e 990012
        expect(nextIndex).toBe(2457);
    });
});
