import { describe, expect, it } from 'vitest';
import { createSalesOrderDuplicate } from './duplicateOrder';

describe('createSalesOrderDuplicate', () => {
    it('remove todos os identificadores e estados que não podem ser copiados', () => {
        const duplicate = createSalesOrderDuplicate({
            id: 'pedido-original',
            orderIndex: 2530,
            orderNumber: 2530,
            orderType: 'sale',
            status: 'fulfilled',
            deleted: true,
            linkedOrderId: 'vinculo',
            returnOrderId: 'devolucao',
            returnKind: 'complete',
            stockProcessed: true,
            stockReversed: true,
            returnStockProcessed: true,
            returnStockReversed: true,
            movedProductIds: ['produto-1'],
            nfeData: { nfeNumber: 123 },
            items: [],
            payments: [],
            customerData: {} as any,
            shipping: {} as any,
            itemsSummary: {} as any,
            paymentsSummary: {} as any,
            seller: 'Teste',
            observation: '',
            date: '2026-09-08',
        });

        expect(duplicate).toMatchObject({ status: 'draft', orderType: 'sale' });
        expect(duplicate).not.toHaveProperty('id');
        expect(duplicate).not.toHaveProperty('orderIndex');
        expect(duplicate).not.toHaveProperty('orderNumber');
        expect(duplicate).not.toHaveProperty('stockProcessed');
        expect(duplicate).not.toHaveProperty('returnOrderId');
        expect(duplicate).not.toHaveProperty('nfeData');
    });
});
