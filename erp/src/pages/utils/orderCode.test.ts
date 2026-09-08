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
});
