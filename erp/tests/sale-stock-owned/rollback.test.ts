import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { supabase } from '@/pages/utils/supabaseConfig';
import { buildOrderPersistencePayload } from '@/pages/utils/orderPersistencePayload';
import { bindTestArtifactContext } from '../../../shared-utils/testArtifactContext';
import { orderFormSchema } from '../../../shared-utils/orderDomainValidation';

describe.skipIf(process.env.SALE_STOCK_OWNED_PHASE !== 'rollback')('integridade da venda sintética', () => {
  it('rejeita quantidade inválida sem gravar nada e estorna as saídas ao cancelar', async () => {
    const manifestPath = resolve(process.cwd(), '../tmp/sale-stock-owned-fixture.json');
    const fixture = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (fixture.phase !== 'created' || fixture.scenarioKey !== 'sale-stock-adjustment') throw new Error('Fixture não concluída.');
    const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL;
    const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
    if (!email || !password) throw new Error('Credenciais do operador indisponíveis.');
    const login = await supabase.auth.signInWithPassword({ email, password });
    if (login.error || login.data.user?.id !== fixture.ownerId) throw new Error('Operador diferente do dono da execução.');
    const admin = await supabase.rpc('is_administrator');
    if (admin.error || admin.data !== true) throw new Error('Operador não é administrador.');
    bindTestArtifactContext({ runId: fixture.runId, ownerId: fixture.ownerId, scenarioKey: fixture.scenarioKey });

    const owned = async (table: string, id: string) => {
      const row = await supabase.from(table).select('*').eq('id', id).single();
      if (row.error || !row.data) throw new Error(`Artefato ${table} ausente.`);
      const data = await supabase.rpc('test_artifact_row_data', { p_table: table, p_row: row.data });
      if (data.error || data.data?.is_test !== true || data.data?.runId !== fixture.runId || data.data?.ownerId !== fixture.ownerId)
        throw new Error(`Propriedade de ${table} não comprovada.`);
      return row.data;
    };
    const state = async () => {
      await owned('people', fixture.customerId);
      const products = await Promise.all(fixture.products.map(async (p: any) => {
        await owned('products', p.id);
        const v = await owned('product_variations', p.variationId);
        expect(v.product_id).toBe(p.id);
        return Number(v.stock);
      }));
      const order = await owned('orders', fixture.orderId);
      expect(order.customer_id).toBe(fixture.customerId);
      expect(order.items.every((item: any) => fixture.products.some((p: any) =>
        p.id === item.productId && p.variationId === item.variationId))).toBe(true);
      const result = await supabase.from('inventory_moves').select('*').eq('order_id', fixture.orderId);
      if (result.error) throw result.error;
      for (const move of result.data || []) {
        expect(fixture.products.some((p: any) => p.id === move.product_id && p.variationId === move.variation_id)).toBe(true);
        await owned('inventory_moves', move.id);
      }
      return { products, order, moves: (result.data || []).sort((a: any, b: any) => a.id.localeCompare(b.id)) };
    };
    const before = await state();
    expect(before.order.status).toBe('scheduled');
    expect(before.products).toEqual([20, 17]);
    const invalidItems = structuredClone(before.order.items);
    invalidItems[0].quantity = 1.5;
    const invalidOrder = { ...before.order.order_data, items: invalidItems };
    const invalidPayload = buildOrderPersistencePayload(invalidOrder);
    const rejected = await supabase.rpc('update_order_with_inventory_transaction_if_version', {
      p_order_id: fixture.orderId, p_expected_updated_at: before.order.updated_at,
      p_order_payload: invalidPayload, p_items: invalidItems, p_payments: invalidOrder.payments,
    });
    expect(rejected.error?.message).toContain('Quantidade inválida');
    const afterRejection = await state();
    expect(afterRejection.products).toEqual(before.products);
    expect(afterRejection.order.updated_at).toBe(before.order.updated_at);
    expect(afterRejection.order.items).toEqual(before.order.items);
    expect(afterRejection.moves).toEqual(before.moves);

    const cancelled = orderFormSchema.parse({ ...afterRejection.order.order_data, status: 'cancelled' });
    const result = await supabase.rpc('update_order_with_inventory_transaction_if_version', {
      p_order_id: fixture.orderId, p_expected_updated_at: afterRejection.order.updated_at,
      p_order_payload: buildOrderPersistencePayload(cancelled as any), p_items: cancelled.items, p_payments: cancelled.payments,
    });
    if (result.error) throw result.error;
    const afterCancellation = await state();
    expect(afterCancellation.order.status).toBe('cancelled');
    expect(afterCancellation.products).toEqual([20, 20]);
    expect(afterCancellation.moves.every((m: any) => m.status === 'reversed')).toBe(true);
    const notifications = await supabase.from('app_notifications').select('id').eq('order_id', fixture.orderId);
    if (notifications.error) throw notifications.error;
    expect(notifications.data).toEqual([]);
    writeFileSync(manifestPath, JSON.stringify({ ...fixture, phase: 'cancelled' }, null, 2));
    await supabase.auth.signOut();
  });
});
