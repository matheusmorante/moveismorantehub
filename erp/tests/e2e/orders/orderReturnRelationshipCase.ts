import { expect, test } from '@playwright/test';
import type { Client } from 'pg';

type OrderReturnRelationshipCaseDependencies = {
    getPgClient: () => Client;
    testRunId: string;
    createdOrderIds: string[];
};

export function registerOrderReturnRelationshipCase({
    getPgClient,
    testRunId,
    createdOrderIds,
}: OrderReturnRelationshipCaseDependencies): void {
    // ── CENÁRIO 6: Devolução Vinculada ──
    test('Cenário 6: Devolução Vinculada Mantendo Integridade Relacional', async () => {
        const pgClient = getPgClient();
        const saleOrderId = `test_order_sale_${testRunId}`;
        const returnOrderId = `test_order_ret_${testRunId}`;
        createdOrderIds.push(saleOrderId, returnOrderId);

        const salePayload = {
            id: saleOrderId,
            order_data: { id: saleOrderId, orderNumber: '880006', status: 'fulfilled' },
            items: [{ productId: 'p-ret', description: 'Item Original', quantity: 1, unitPrice: 700.00 }],
            order_number: '880006',
            status: 'fulfilled',
            total_amount: 700.00,
            deleted: false
        };
        await pgClient.query(`
            SELECT public.save_order_transaction(
                $1,
                $2::jsonb,
                $3::jsonb,
                $4::jsonb,
                false
            );
        `, [saleOrderId, JSON.stringify(salePayload), JSON.stringify(salePayload.items), JSON.stringify([{ method: 'Pix', amount: 700.00 }])]);

        const returnPayload = {
            id: returnOrderId,
            order_data: { id: returnOrderId, orderNumber: '880007', status: 'scheduled', orderType: 'return', linkedOrderId: saleOrderId },
            items: [{ productId: 'p-ret', description: 'Item Devolvido', quantity: 1, unitPrice: 700.00 }],
            order_number: '880007',
            status: 'scheduled',
            order_type: 'return',
            linked_order_id: saleOrderId,
            total_amount: 700.00,
            deleted: false
        };
        await pgClient.query(`
            SELECT public.save_order_transaction(
                $1,
                $2::jsonb,
                $3::jsonb,
                $4::jsonb,
                false
            );
        `, [returnOrderId, JSON.stringify(returnPayload), JSON.stringify(returnPayload.items), JSON.stringify([])]);

        await pgClient.query('UPDATE public.orders SET return_order_id = $1 WHERE id = $2', [returnOrderId, saleOrderId]);

        const returnRow = (await pgClient.query('SELECT id, order_type, linked_order_id FROM public.orders WHERE id = $1', [returnOrderId])).rows[0];
        expect(returnRow.order_type).toBe('return');
        expect(returnRow.linked_order_id).toBe(saleOrderId);

        const saleRow = (await pgClient.query('SELECT id, return_order_id FROM public.orders WHERE id = $1', [saleOrderId])).rows[0];
        expect(saleRow.return_order_id).toBe(returnOrderId);
        console.log('✅ [Cenário 6] PASS - Devoluções e vendas vinculadas mantêm integridade relacional.');
    });
}
