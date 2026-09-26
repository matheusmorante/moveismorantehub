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
vi.mock('../orderNotificationDispatcher', () => ({ dispatchOrderCreationNotifications: vi.fn() }));
vi.mock('../orderStatusWorkflowService', () => ({ recordOrderStatusHistory: mocks.recordHistory }));

import { executeSaveOrder } from '../orderCreationService';

const scheduledSale = {
  orderType: 'sale',
  status: 'scheduled',
  items: [{ productId: '00000000-0000-0000-0000-000000000001', quantity: 1 }],
  payments: [],
};

describe('cadastro de pedido com estoque atômico', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envia o pedido à RPC que também grava as movimentações', async () => {
    mocks.rpc.mockResolvedValue({ data: { id: 'pedido-1', order_index: 123, order_data: scheduledSale }, error: null });

    await expect(executeSaveOrder(scheduledSale as any, vi.fn())).resolves.toBe('pedido-1');
    expect(mocks.rpc).toHaveBeenCalledWith('create_order_with_inventory_transaction',
      expect.objectContaining({ p_order_id: expect.any(String), p_items: scheduledSale.items }));
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('não grava pedido por fallback quando a RPC ou a movimentação falha', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('falha na movimentação') });

    await expect(executeSaveOrder(scheduledSale as any, vi.fn())).rejects.toThrow('falha na movimentação');
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.recordHistory).not.toHaveBeenCalled();
  });
});
