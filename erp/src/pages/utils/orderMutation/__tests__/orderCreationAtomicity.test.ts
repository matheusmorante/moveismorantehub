import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  recordHistory: vi.fn(),
  syncCustomer: vi.fn(),
  dispatchNotifications: vi.fn(),
  dispatchUpdateNotifications: vi.fn(),
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from },
}));
vi.mock('@/lib/queryClient', () => ({
  queryClient: { invalidateQueries: mocks.invalidateQueries },
}));
vi.mock('../../orderCode', () => ({
  getNextOrderIndex: async () => 123,
  getOrderIndex: (order: { orderIndex?: number }) => order.orderIndex,
  resolveOrderIndexForUpdate: () => 123,
}));
vi.mock('../../orderSnapshotResolution', () => ({
  resolveOrderCustomerSnapshot: async (order: unknown) => order,
  buildOrderPersistencePayload: (order: any) => ({
    order_index: order.orderIndex,
    order_type: order.orderType,
    status: order.status,
    order_data: order,
  }),
}));
vi.mock('../orderCrmSyncService', () => ({
  ensureCustomerInCrm: async () => undefined,
  syncCustomerToCrmBackground: mocks.syncCustomer,
}));
vi.mock('../orderNotificationDispatcher', () => ({
  dispatchOrderCreationNotifications: mocks.dispatchNotifications,
  dispatchOrderUpdateNotifications: mocks.dispatchUpdateNotifications,
}));
vi.mock('../orderStatusWorkflowService', () => ({ recordOrderStatusHistory: mocks.recordHistory }));

import { executeSaveOrder } from '../orderCreationService';
import { executeUpdateOrder } from '../orderUpdateService';

const scheduledSale = {
  orderType: 'sale',
  status: 'scheduled',
  items: [{ productId: '00000000-0000-0000-0000-000000000001', quantity: 1 }],
  payments: [],
};

const splitPayments = [
  { method: 'PIX', amount: 500, fee: 0, feeType: 'fixed', status: 'PAGO', installments: 1 },
  {
    method: 'Cartão de Crédito',
    amount: 250,
    fee: 12.5,
    feeType: 'percentage',
    status: 'PENDENTE',
    installments: 2,
  },
];

describe('cadastro de pedido com estoque atômico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invalidateQueries.mockResolvedValue(undefined);
  });

  it('envia o pedido à RPC que também grava as movimentações', async () => {
    mocks.rpc.mockResolvedValue({
      data: { id: 'pedido-1', order_index: 123, order_data: scheduledSale },
      error: null,
    });

    await expect(executeSaveOrder(scheduledSale as any, vi.fn())).resolves.toBe('pedido-1');
    expect(mocks.rpc).toHaveBeenCalledWith(
      'create_order_with_inventory_transaction',
      expect.objectContaining({ p_order_id: expect.any(String), p_items: scheduledSale.items })
    );
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.dispatchNotifications).toHaveBeenCalledTimes(1);
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders'] });
  });

  it('invalida a lista de pedidos depois que a atualização persiste com sucesso', async () => {
    mocks.rpc.mockResolvedValue({ data: { order_data: scheduledSale }, error: null });

    await executeUpdateOrder(
      'pedido-1',
      { observation: 'alteração confirmada' } as any,
      { ...scheduledSale, id: 'pedido-1', orderIndex: 123 } as any
    );

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders'] });
  });

  it('usa uma chave estável de idempotência quando a fixture a fornece', async () => {
    mocks.rpc.mockResolvedValue({
      data: { id: '550e8400-e29b-41d4-a716-446655440010', order_index: 123, order_data: scheduledSale },
      error: null,
    });

    await executeSaveOrder(scheduledSale as any, vi.fn(), {
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440010',
    });

    expect(mocks.rpc.mock.calls[0][1].p_order_id).toBe('550e8400-e29b-41d4-a716-446655440010');
  });

  it('mantém estoque/RPC sem gerar notificação do teste nem atualizar contatos operacionais', async () => {
    const syntheticOrder = { ...scheduledSale, customerData: { id: 'test-customer' }, is_test: true, syntheticFixture: { scenarioKey: 'SCENARIO_001', version: 1 } };
    mocks.rpc.mockResolvedValue({
      data: { id: '550e8400-e29b-41d4-a716-446655440011', order_index: 123, order_data: syntheticOrder },
      error: null,
    });

    await executeSaveOrder(syntheticOrder as any, vi.fn(), {
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440011',
    });

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc.mock.calls[0][1].p_order_payload.order_data.is_test).toBe(true);
    expect(mocks.syncCustomer).not.toHaveBeenCalled();
    expect(mocks.dispatchNotifications).not.toHaveBeenCalled();
  });

  it('envia somente itens normais vinculados à RPC ao criar ou atender a venda', async () => {
    const items = [
      { productId: 'normal', condition: 'novo', quantity: 1 },
      { productId: 'salvado', variationId: 'var-s', condition: 'salvado', quantity: 1 },
      { productId: 'usado', variationId: 'var-u', condition: 'usado', quantity: 1 },
    ];
    const order = { ...scheduledSale, items };
    mocks.rpc.mockResolvedValue({
      data: { id: 'pedido-1', order_index: 123, order_data: order },
      error: null,
    });

    await executeSaveOrder(order as any, vi.fn());
    const createdItems = mocks.rpc.mock.calls[0][1].p_items;
    expect(createdItems.map((item: any) => item.productId)).toEqual([
      'normal',
      undefined,
      undefined,
    ]);
    expect(createdItems.slice(1)).toEqual([
      expect.objectContaining({ condition: 'salvado', isTemporaryProduct: true }),
      expect.objectContaining({ condition: 'usado', isTemporaryProduct: true }),
    ]);

    mocks.rpc.mockClear();
    await executeUpdateOrder(
      'pedido-1',
      { status: 'fulfilled' } as any,
      {
        ...order,
        id: 'pedido-1',
        orderIndex: 123,
      } as any
    );
    expect(mocks.rpc.mock.calls[0][1].p_items).toEqual(createdItems);
  });

  it('envia todas as formas de pagamento uma única vez ao criar a venda', async () => {
    mocks.rpc.mockResolvedValue({
      data: { id: 'pedido-1', order_index: 123, order_data: scheduledSale },
      error: null,
    });

    await executeSaveOrder({ ...scheduledSale, payments: splitPayments } as any, vi.fn());

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc.mock.calls[0][1].p_payments).toEqual(splitPayments);
  });

  it('mantém todas as formas de pagamento atualizadas ao editar a venda', async () => {
    mocks.rpc.mockResolvedValue({
      data: { order_data: { ...scheduledSale, payments: splitPayments } },
      error: null,
    });
    const current = {
      ...scheduledSale,
      id: 'pedido-1',
      orderIndex: 123,
      payments: [{ method: 'DINHEIRO', amount: 750 }],
    };

    await executeUpdateOrder('pedido-1', { payments: splitPayments } as any, current as any);

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith(
      'create_order_with_inventory_transaction',
      expect.objectContaining({ p_is_update: true, p_payments: splitPayments })
    );
  });

  it('não envia notificação ao editar um pedido de teste', async () => {
    const testOrder = {
      ...scheduledSale,
      id: 'pedido-teste',
      is_test: true,
      orderIndex: 123,
      customerData: { id: 'cliente-teste' },
    };
    mocks.rpc.mockResolvedValue({ data: { order_data: testOrder }, error: null });

    await executeUpdateOrder('pedido-teste', { observation: 'ajuste de teste' } as any, testOrder as any);

    expect(mocks.dispatchUpdateNotifications).not.toHaveBeenCalled();
  });

  it('guarda a versão conferida do pedido dentro da transação comercial e de estoque', async () => {
    mocks.rpc.mockResolvedValue({ data: { order_data: scheduledSale }, error: null });

    await executeUpdateOrder(
      'pedido-1',
      { observation: 'alteração confirmada' } as any,
      { ...scheduledSale, id: 'pedido-1' } as any,
      '2026-10-09T10:00:00.000Z'
    );

    expect(mocks.rpc).toHaveBeenCalledWith(
      'update_order_with_inventory_transaction_if_version',
      expect.objectContaining({
        p_order_id: 'pedido-1',
        p_expected_updated_at: '2026-10-09T10:00:00.000Z',
        p_items: scheduledSale.items,
        p_payments: scheduledSale.payments,
      })
    );
  });

  it('não perde os pagamentos quando salvar um pedido existente pelo fluxo de salvar', async () => {
    const updateOrder = vi.fn().mockResolvedValue(undefined);
    const existingSale = { id: 'pedido-1', payments: splitPayments };

    await expect(executeSaveOrder(existingSale as any, updateOrder)).resolves.toBe('pedido-1');

    expect(updateOrder).toHaveBeenCalledTimes(1);
    expect(updateOrder).toHaveBeenCalledWith('pedido-1', existingSale);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('não grava pedido por fallback quando a RPC ou a movimentação falha', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('falha na movimentação') });

    await expect(executeSaveOrder(scheduledSale as any, vi.fn())).rejects.toThrow(
      'falha na movimentação'
    );
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.recordHistory).not.toHaveBeenCalled();
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
  });
});
