import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  recordHistory: vi.fn(),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from },
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
  syncCustomerToCrmBackground: vi.fn(),
}));
vi.mock('../orderNotificationDispatcher', () => ({
  dispatchOrderCreationNotifications: vi.fn(),
  dispatchOrderUpdateNotifications: vi.fn(),
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
  beforeEach(() => vi.clearAllMocks());

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
  });
});
