import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../mobile/src/services/supabaseClient', async () => {
  const { supabase } = await import('@/pages/utils/supabaseConfig');
  return { supabase };
});
vi.mock('../../../mobile/src/services/offline/offlineSyncManager', () => ({
  offlineSyncManager: { recordEvent: vi.fn(async () => undefined) },
}));
vi.mock('../../../mobile/src/services/offline/offlineStorageService', () => ({
  offlineStorageService: { getWorkingSet: vi.fn(async () => null), cacheWorkingSet: vi.fn(async () => undefined) },
}));
vi.mock('../../../mobile/src/repositories/OrderRepository', () => ({
  OrderRepository: {
    getById: vi.fn(async () => null),
    saveLocal: vi.fn(async () => undefined),
    overlayPendingLocalOrders: vi.fn(async (orders: any[]) => orders),
  },
}));

import { supabase } from '@/pages/utils/supabaseConfig';
import { executeSaveOrder } from '@/pages/utils/orderMutation/orderCreationService';
import { buildOrderPersistencePayload } from '@/pages/utils/orderPersistencePayload';
import { bindTestArtifactContext } from '../../../shared-utils/testArtifactContext';
import { NON_TEST_ORDER_FILTER } from '../../../shared-utils/testArtifactQueries';
import { orderFormSchema } from '../../../shared-utils/orderDomainValidation';
import { deliveryFlowService } from '../../../mobile/src/features/orders/services/deliveryFlowService';

const enabled = process.env.SALE_STOCK_OWNED_PHASE === 'fresh-guard';
const sourceManifestPath = resolve(process.cwd(), '../tmp/sale-stock-owned-fixture.json');
const attempt = (process.env.SALE_STOCK_FRESH_ATTEMPT || '1').replace(/[^a-zA-Z0-9_-]/g, '');
const manifestPath = resolve(process.cwd(), `../tmp/sale-stock-fresh-order-fixture-${attempt}.json`);

describe.skipIf(!enabled)('pedido agendado novo e proteção de saídas sem origem', () => {
  it('cria saídas por linha, rejeita snapshot antigo do app e cancela a fixture', async () => {
    if (existsSync(manifestPath)) throw new Error('Já existe um manifesto; não criar outro pedido.');
    const source = JSON.parse(readFileSync(sourceManifestPath, 'utf8'));
    if (source.phase !== 'cancelled' || source.scenarioKey !== 'sale-stock-adjustment') {
      throw new Error('A execução original não está concluída.');
    }
    const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL;
    const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
    if (!email || !password) throw new Error('Credenciais do operador indisponíveis.');
    const login = await supabase.auth.signInWithPassword({ email, password });
    if (login.error || login.data.user?.id !== source.ownerId) throw new Error('Operador diferente do dono da execução.');
    const admin = await supabase.rpc('is_administrator');
    if (admin.error || admin.data !== true) throw new Error('Operador não é administrador.');
    bindTestArtifactContext({ runId: source.runId, ownerId: source.ownerId, scenarioKey: source.scenarioKey });

    const owned = async (table: string, id: string) => {
      const row = await supabase.from(table).select('*').eq('id', id).single();
      if (row.error || !row.data) throw new Error(`Artefato ${table} ausente.`);
      const identity = await supabase.rpc('test_artifact_row_data', { p_table: table, p_row: row.data });
      if (identity.error || identity.data?.is_test !== true || identity.data?.runId !== source.runId || identity.data?.ownerId !== source.ownerId) {
        throw new Error(`Propriedade de ${table} não comprovada.`);
      }
      return row.data;
    };

    const customer = await owned('people', source.customerId);
    const products = await Promise.all(source.products.map(async (product: any) => {
      const parent = await owned('products', product.id);
      const variation = await owned('product_variations', product.variationId);
      expect(variation.product_id).toBe(product.id);
      expect(Number(variation.stock)).toBe(20);
      return { ...product, name: parent.name || parent.description };
    }));
    const previousOrder = await owned('orders', source.orderId);
    expect(previousOrder.customer_id).toBe(source.customerId);
    expect(previousOrder.status).toBe('cancelled');
    const oldMoves = await supabase.from('inventory_moves').select('id').eq('order_id', source.orderId);
    if (oldMoves.error) throw oldMoves.error;
    for (const move of oldMoves.data || []) await owned('inventory_moves', move.id);

    const orderId = crypto.randomUUID();
    const itemA1 = crypto.randomUUID();
    const itemA2 = crypto.randomUUID();
    const itemB = crypto.randomUUID();
    const fixture = {
      runId: source.runId,
      ownerId: source.ownerId,
      scenarioKey: source.scenarioKey,
      customerId: source.customerId,
      orderId,
      products: source.products,
      itemIds: [itemA1, itemA2, itemB],
      phase: 'planned',
    };
    writeFileSync(manifestPath, JSON.stringify(fixture, null, 2), { flag: 'wx' });

    const makeItem = (itemId: string, product: any, quantity: number) => ({
      orderItemId: itemId,
      productId: product.id,
      variationId: product.variationId,
      description: product.name,
      itemType: 'product',
      condition: 'novo',
      handlingType: 'Na caixa',
      quantity,
      unitPrice: 20,
      unitDiscount: 0,
      discountType: 'fixed',
    });
    const initialItems = [makeItem(itemA1, products[0], 2), makeItem(itemA2, products[0], 1), makeItem(itemB, products[1], 2)];
    const initialTotal = initialItems.reduce((sum: number, item: any) => sum + item.quantity * item.unitPrice, 0);
    const parsedOrder = orderFormSchema.parse({
      orderType: 'sale',
      status: 'scheduled',
      date: new Date().toISOString(),
      seller: 'Teste de estoque',
      is_test: true,
      customerData: { id: source.customerId, fullName: customer.full_name, noPhone: true, noAddress: true },
      shipping: { deliveryMethod: 'pickup', noAddress: true, value: 0,
        scheduling: { date: '2099-12-30', type: 'fixed', time: '12:00' } },
      items: initialItems,
      payments: [{ method: 'PIX', amount: initialTotal, fee: 0, feeType: 'fixed', status: 'PENDENTE' }],
      paymentsSummary: { totalOrderValue: initialTotal },
    });

    let created = false;
    let routeStarted = false;
    let lastKnownCorrectData: Record<string, any> = parsedOrder as any;
    const readOrder = async () => owned('orders', orderId);
    const getMoves = async () => {
      const result = await supabase.from('inventory_moves').select('*').eq('order_id', orderId).order('id');
      if (result.error) throw result.error;
      for (const move of result.data || []) {
        expect(source.products.some((product: any) => product.id === move.product_id && product.variationId === move.variation_id)).toBe(true);
        await owned('inventory_moves', move.id);
      }
      return result.data || [];
    };
    const activeMoves = (moves: any[]) => moves.filter((move) => {
      let observationStatus: string | null = null;
      try { observationStatus = JSON.parse(move.observation || '{}').status || null; } catch {}
      return !['reversed', 'cancelled'].includes(move.status) && !['reversed', 'cancelled'].includes(observationStatus || '');
    });
    const stocks = async () => Promise.all(source.products.map(async (product: any) =>
      Number((await owned('product_variations', product.variationId)).stock)));
    const recalcAmount = (items: any[]) => items.reduce((sum, item) =>
      sum + item.quantity * (item.unitPrice - Number(item.unitDiscount || 0)), 0);
    const save = async (change: (items: any[]) => any[]) => {
      const order = await readOrder();
      const items = change(structuredClone(order.items));
      const amount = recalcAmount(items);
      const current = { ...order.order_data, items,
        payments: [{ method: 'PIX', amount, fee: 0, feeType: 'fixed', status: 'PENDENTE' }],
        paymentsSummary: { totalOrderValue: amount } };
      const valid = orderFormSchema.parse(current);
      const response = await supabase.rpc('update_order_with_inventory_transaction_if_version', {
        p_order_id: orderId,
        p_expected_updated_at: order.updated_at,
        p_order_payload: buildOrderPersistencePayload(valid as any),
        p_items: valid.items,
        p_payments: valid.payments,
      });
      if (response.error) throw response.error;
      const saved = await readOrder();
      lastKnownCorrectData = saved.order_data;
      return saved;
    };

    try {
      const savedId = await executeSaveOrder(parsedOrder as any, async () => {
        throw new Error('A criação não deve editar um pedido.');
      }, { idempotencyKey: orderId });
      expect(savedId).toBe(orderId);
      created = true;
      const initialOrder = await readOrder();
      expect(initialOrder.status).toBe('scheduled');
      expect(initialOrder.items.map((item: any) => item.orderItemId)).toEqual([itemA1, itemA2, itemB]);
      const initialMoves = await getMoves();
      const initialEffective = activeMoves(initialMoves);
      expect(initialEffective).toHaveLength(3);
      expect(initialEffective.map((move: any) => Number(move.quantity)).sort()).toEqual([1, 2, 2]);
      expect(await stocks()).toEqual([17, 18]);
      const initialLineage = initialOrder.order_data.stockMovementLineage;
      expect(initialLineage?.lines?.map((line: any) => line.itemId)).toEqual([itemA1, itemA2, itemB]);
      for (const itemId of [itemA1, itemA2, itemB]) {
        const line = initialLineage.lines.find((candidate: any) => candidate.itemId === itemId);
        expect(line.parents).toHaveLength(1);
        expect(initialEffective.some((move: any) => move.id === line.parents[0])).toBe(true);
      }
      writeFileSync(manifestPath, JSON.stringify({ ...fixture, phase: 'created' }, null, 2));

      await save((items) => { items[0].unitPrice = 27; return items; });
      expect(await getMoves()).toEqual(initialMoves);
      expect(await stocks()).toEqual([17, 18]);

      const snapshotBeforeIncrease = structuredClone((await readOrder()).order_data);
      const afterIncrease = await save((items) => { items[2].quantity = 5; return items; });
      const increasedMoves = await getMoves();
      const addition = activeMoves(increasedMoves).find((move: any) => move.product_id === products[1].id &&
        !initialMoves.some((old: any) => old.id === move.id));
      expect(addition).toBeDefined();
      expect(Number(addition.quantity)).toBe(3);
      expect(JSON.parse(addition.observation).note).toContain('Ajuste do pedido de venda #');
      expect(await stocks()).toEqual([17, 15]);
      expect(afterIncrease.items[2].quantity).toBe(5);
      lastKnownCorrectData = afterIncrease.order_data;

      await deliveryFlowService.startRoute({
        orderId,
        currentData: snapshotBeforeIncrease,
        checklist: [{ id: 'test-checklist', checked: true }],
        responsibles: [{ id: source.ownerId, name: 'Operador de teste' } as any],
        userProfileId: source.ownerId,
      });
      routeStarted = true;
      const staleOrder = await readOrder();
      expect(staleOrder.delivery_status).toBe('in_progress');
      expect(staleOrder.items[2].quantity).toBe(5);
      expect(staleOrder.order_data.stockMovementLineage.lines.some((line: any) => line.itemId === itemB &&
        line.parents.includes(addition.id))).toBe(false);

      const rejectedItems = structuredClone(staleOrder.items);
      rejectedItems[0].quantity = 3;
      const rejectedAmount = recalcAmount(rejectedItems);
      const rejectedData = orderFormSchema.parse({ ...staleOrder.order_data, items: rejectedItems,
        payments: [{ method: 'PIX', amount: rejectedAmount, fee: 0, feeType: 'fixed', status: 'PENDENTE' }],
        paymentsSummary: { totalOrderValue: rejectedAmount } });
      const beforeRejectedSave = { order: staleOrder, moves: increasedMoves, stocks: await stocks() };
      const rejected = await supabase.rpc('update_order_with_inventory_transaction_if_version', {
        p_order_id: orderId,
        p_expected_updated_at: staleOrder.updated_at,
        p_order_payload: buildOrderPersistencePayload(rejectedData as any),
        p_items: rejectedData.items,
        p_payments: rejectedData.payments,
      });
      expect(rejected.error?.message).toContain('Há saídas sem origem confirmada no pedido');
      const afterRejectedOrder = await readOrder();
      expect(afterRejectedOrder.updated_at).toBe(beforeRejectedSave.order.updated_at);
      expect(afterRejectedOrder.items).toEqual(beforeRejectedSave.order.items);
      expect(await getMoves()).toEqual(beforeRejectedSave.moves);
      expect(await stocks()).toEqual(beforeRejectedSave.stocks);

      await deliveryFlowService.cancelDelivery(orderId, lastKnownCorrectData);
      routeStarted = false;
      const restored = await readOrder();
      expect(restored.status).toBe('scheduled');
      expect(restored.delivery_status).toBeNull();
      expect(restored.order_data.stockMovementLineage.lines.some((line: any) => line.itemId === itemB &&
        line.parents.includes(addition.id))).toBe(true);
      await save((items) => { items[0].quantity = 3; return items; });
      const postRetryMoves = await getMoves();
      const postRetryMovesById = new Map(postRetryMoves.map((move: any) => [move.id, move]));
      for (const move of increasedMoves) expect(postRetryMovesById.get(move.id)).toEqual(move);
      expect(postRetryMoves).toHaveLength(increasedMoves.length + 1);
      const afterRetryMoves = activeMoves(await getMoves());
      const firstLineAdjustment = afterRetryMoves.find((move: any) => move.product_id === products[0].id &&
        Number(move.quantity) === 1 && !increasedMoves.some((old: any) => old.id === move.id));
      expect(firstLineAdjustment).toBeDefined();
      expect(JSON.parse(firstLineAdjustment.observation).note).toContain('Ajuste do pedido de venda #');
      expect(await stocks()).toEqual([16, 15]);

      const orderToCancel = await readOrder();
      const cancelled = orderFormSchema.parse({ ...orderToCancel.order_data, status: 'cancelled' });
      const cancellation = await supabase.rpc('update_order_with_inventory_transaction_if_version', {
        p_order_id: orderId,
        p_expected_updated_at: orderToCancel.updated_at,
        p_order_payload: buildOrderPersistencePayload(cancelled as any),
        p_items: cancelled.items,
        p_payments: cancelled.payments,
      });
      if (cancellation.error) throw cancellation.error;
      const finalOrder = await readOrder();
      expect(finalOrder.status).toBe('cancelled');
      expect(await stocks()).toEqual([20, 20]);
      expect(activeMoves(await getMoves())).toEqual([]);
      const operationalList = await supabase.from('orders').select('id').eq('id', orderId).or(NON_TEST_ORDER_FILTER);
      if (operationalList.error) throw operationalList.error;
      expect(operationalList.data).toEqual([]);
      const notifications = await supabase.from('app_notifications').select('id').eq('order_id', orderId);
      if (notifications.error) throw notifications.error;
      expect(notifications.data).toEqual([]);
      writeFileSync(manifestPath, JSON.stringify({ ...fixture, phase: 'cancelled', movementCount: (await getMoves()).length }, null, 2));
    } finally {
      if (created) {
        const current = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
        if (current.data && current.data.status !== 'cancelled') {
          if (routeStarted) await deliveryFlowService.cancelDelivery(orderId, lastKnownCorrectData);
          const latest = await readOrder();
          const cancelData = orderFormSchema.parse({ ...latest.order_data, status: 'cancelled' });
          const cleanup = await supabase.rpc('update_order_with_inventory_transaction_if_version', {
            p_order_id: orderId,
            p_expected_updated_at: latest.updated_at,
            p_order_payload: buildOrderPersistencePayload(cancelData as any),
            p_items: cancelData.items,
            p_payments: cancelData.payments,
          });
          if (cleanup.error) throw new Error(`Falha ao cancelar apenas a venda sintética: ${cleanup.error.message}`);
          const final = await readOrder();
          expect(final.status).toBe('cancelled');
          expect(await stocks()).toEqual([20, 20]);
          const audit = await getMoves();
          writeFileSync(manifestPath, JSON.stringify({ ...fixture, phase: 'cancelled-after-test', movementCount: audit.length }, null, 2));
        }
      }
      await supabase.auth.signOut();
    }
  }, 120000);
});
