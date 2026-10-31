import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { supabase } from '@/pages/utils/supabaseConfig';
import { buildOrderPersistencePayload } from '@/pages/utils/orderPersistencePayload';
import { bindTestArtifactContext } from '../../../shared-utils/testArtifactContext';
import { NON_TEST_ORDER_FILTER } from '../../../shared-utils/testArtifactQueries';
import { orderFormSchema } from '../../../shared-utils/orderDomainValidation';

const phase = process.env.SALE_STOCK_OWNED_PHASE || '';
const enabled = ['baseline', 'adjustment'].includes(phase);
const manifestPath = resolve(process.cwd(), '../tmp/sale-stock-owned-fixture.json');

describe.skipIf(!enabled)('movimentações em uma venda sintética isolada', () => {
  it('confere preço, acréscimo, novo item, redução e troca usando a RPC normal', async () => {
    const fixture = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (fixture.phase !== 'created' || fixture.scenarioKey !== 'sale-stock-adjustment') throw new Error('Fixture não concluída.');
    const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL;
    const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
    if (!email || !password) throw new Error('Credenciais do operador indisponíveis.');
    const login = await supabase.auth.signInWithPassword({ email, password });
    if (login.error || login.data.user?.id !== fixture.ownerId) throw new Error('O operador não é o dono da execução.');
    const admin = await supabase.rpc('is_administrator');
    if (admin.error || admin.data !== true) throw new Error('Operador não é administrador.');
    bindTestArtifactContext({ runId: fixture.runId, ownerId: fixture.ownerId, scenarioKey: fixture.scenarioKey });

    const owned = async (table: string, id: string) => {
      const result = await supabase.from(table).select('*').eq('id', id).single();
      if (result.error || !result.data) throw new Error(`Artefato ${table} ausente.`);
      const data = await supabase.rpc('test_artifact_row_data', { p_table: table, p_row: result.data });
      if (data.error || data.data?.is_test !== true || data.data?.runId !== fixture.runId || data.data?.ownerId !== fixture.ownerId) {
        throw new Error(`Propriedade de ${table} não comprovada.`);
      }
      return result.data;
    };
    const validateLinks = async () => {
      await owned('people', fixture.customerId);
      for (const product of fixture.products) {
        await owned('products', product.id);
        const variation = await owned('product_variations', product.variationId);
        expect(variation.product_id).toBe(product.id);
      }
      const order = await owned('orders', fixture.orderId);
      expect(order.customer_id).toBe(fixture.customerId);
      for (const item of order.items) {
        expect(fixture.products.some((p: any) => p.id === item.productId && p.variationId === item.variationId)).toBe(true);
      }
      return order;
    };
    const getMoves = async () => {
      const result = await supabase.from('inventory_moves').select('*').eq('order_id', fixture.orderId);
      if (result.error) throw result.error;
      for (const move of result.data || []) {
        expect(fixture.products.some((p: any) => p.id === move.product_id && p.variationId === move.variation_id)).toBe(true);
        await owned('inventory_moves', move.id);
      }
      return result.data || [];
    };
    const active = (moves: any[]) => moves.filter((move) =>
      !['reversed', 'cancelled'].includes(move.status) &&
      !['reversed', 'cancelled'].includes((() => { try { return JSON.parse(move.observation || '{}').status; } catch { return null; } })())
    );
    const stock = async () => Promise.all(fixture.products.map(async (p: any) => Number((await owned('product_variations', p.variationId)).stock)));

    const initialOrder = await validateLinks();
    const initialMoves = await getMoves();
    expect(initialOrder.status).toBe('scheduled');
    expect(active(initialMoves)).toHaveLength(1);
    expect(Number(active(initialMoves)[0].quantity)).toBe(2);
    expect(await stock()).toEqual([18, 20]);
    const excluded = await supabase.from('orders').select('id').eq('id', fixture.orderId).or(NON_TEST_ORDER_FILTER);
    if (excluded.error) throw excluded.error;
    expect(excluded.data).toEqual([]);
    const notifications = await supabase.from('app_notifications').select('id').eq('order_id', fixture.orderId);
    if (notifications.error) throw notifications.error;
    expect(notifications.data).toEqual([]);
    if (phase === 'baseline') { await supabase.auth.signOut(); return; }

    const save = async (change: (items: any[]) => any[]) => {
      const order = await validateLinks();
      await getMoves();
      const items = change(structuredClone(order.items));
      const amount = items.reduce((total: number, item: any) => total + item.quantity * item.unitPrice, 0);
      const current = { ...order.order_data, items, payments: [{ method: 'PIX', amount, fee: 0,
        feeType: 'fixed', status: 'PENDENTE' }], paymentsSummary: { totalOrderValue: amount } };
      const valid = orderFormSchema.parse(current);
      const payload = buildOrderPersistencePayload(valid as any);
      const args = { p_order_id: fixture.orderId, p_expected_updated_at: order.updated_at,
        p_order_payload: payload, p_items: valid.items, p_payments: valid.payments };
      const response = await supabase.rpc('update_order_with_inventory_transaction_if_version', args);
      if (response.error) throw response.error;
      return args;
    };

    const initialMoveId = active(initialMoves)[0].id;
    await save((items) => { items[0].unitPrice = 25; return items; });
    let moves = await getMoves();
    expect(moves.map((m: any) => [m.id, m.status])).toEqual(initialMoves.map((m: any) => [m.id, m.status]));
    expect(await stock()).toEqual([18, 20]);

    const increaseArgs = await save((items) => { items[0].quantity = 5; return items; });
    moves = await getMoves();
    let effective = active(moves);
    expect(effective).toHaveLength(2);
    expect(effective.some((m: any) => m.id === initialMoveId)).toBe(true);
    const addition = effective.find((m: any) => m.id !== initialMoveId);
    expect(Number(addition.quantity)).toBe(3);
    expect(JSON.parse(addition.observation).note).toContain('Ajuste do pedido de venda #');
    expect(await stock()).toEqual([15, 20]);
    const replay = await supabase.rpc('update_order_with_inventory_transaction_if_version', increaseArgs);
    expect(replay.error?.message).toContain('ORDER_VERSION_CONFLICT');
    expect((await getMoves()).length).toBe(moves.length);

    const secondItemId = crypto.randomUUID();
    await save((items) => [...items, { ...items[0], orderItemId: secondItemId,
      productId: fixture.products[1].id, variationId: fixture.products[1].variationId,
      description: 'Produto de teste 2', quantity: 2, unitPrice: 20 }]);
    moves = await getMoves(); effective = active(moves);
    const secondMoveId = effective.find((m: any) => m.product_id === fixture.products[1].id).id;
    expect(await stock()).toEqual([15, 18]);

    await save((items) => { items[0].quantity = 1; return items; });
    moves = await getMoves(); effective = active(moves);
    expect(moves.find((m: any) => m.id === initialMoveId).status).toBe('reversed');
    expect(moves.find((m: any) => m.id === addition.id).status).toBe('reversed');
    expect(effective.some((m: any) => m.id === secondMoveId)).toBe(true);
    expect(effective.filter((m: any) => m.product_id === fixture.products[0].id).map((m: any) => Number(m.quantity))).toEqual([1]);
    expect(await stock()).toEqual([19, 18]);

    const oldMoveId = effective.find((m: any) => m.product_id === fixture.products[0].id).id;
    await save((items) => { items[0].productId = fixture.products[1].id;
      items[0].variationId = fixture.products[1].variationId; items[0].description = 'Produto de teste 2'; return items; });
    moves = await getMoves(); effective = active(moves);
    expect(moves.find((m: any) => m.id === oldMoveId).status).toBe('reversed');
    expect(effective.some((m: any) => m.id === secondMoveId)).toBe(true);
    expect(effective.filter((m: any) => m.product_id === fixture.products[1].id)).toHaveLength(2);
    expect(await stock()).toEqual([20, 17]);

    await save((items) => { items[0].quantity = 3; return items; });
    moves = await getMoves(); effective = active(moves);
    expect(effective.some((m: any) => m.id === secondMoveId)).toBe(true);
    expect(await stock()).toEqual([20, 15]);
    await save((items) => { items[0].quantity = 1; return items; });
    moves = await getMoves(); effective = active(moves);
    expect(effective.some((m: any) => m.id === secondMoveId)).toBe(true);
    expect(effective.map((m: any) => Number(m.quantity)).sort()).toEqual([1, 2]);
    expect(await stock()).toEqual([20, 17]);

    const afterNotifications = await supabase.from('app_notifications').select('id').eq('order_id', fixture.orderId);
    if (afterNotifications.error) throw afterNotifications.error;
    expect(afterNotifications.data).toEqual([]);
    await supabase.auth.signOut();
  });
});
