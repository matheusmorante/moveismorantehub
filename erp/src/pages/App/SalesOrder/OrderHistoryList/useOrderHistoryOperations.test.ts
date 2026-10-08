import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  updateOrder: vi.fn(),
  processFiscalEffects: vi.fn(),
  toast: {
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../utils/orderHistoryService', () => ({
  restoreOrder: vi.fn(),
  permanentDeleteDraftOrder: vi.fn(),
  permanentDeleteOrder: vi.fn(),
  updateOrder: mocks.updateOrder,
}));
vi.mock('react-toastify', () => ({ toast: mocks.toast }));
vi.mock('@/pages/utils/orderStatusPresentation', () => ({
  getFulfillmentLabels: vi.fn(),
}));
vi.mock('@/pages/utils/nfe/nfeService', () => ({
  processOrderCancellationFiscalEffects: mocks.processFiscalEffects,
}));

describe('transação comercial antes dos efeitos fiscais do cancelamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não inicia efeito fiscal quando a transação comercial falha', async () => {
    mocks.updateOrder.mockRejectedValueOnce(new Error('falha transacional'));
    const { createOrderHistoryOperations } = await import('./useOrderHistoryOperations');
    const setOrders = vi.fn();
    const operations = createOrderHistoryOperations({
      orders: [],
      setOrders,
      selectedOrders: [],
      setSelectedOrders: vi.fn(),
      setLoading: vi.fn(),
      refresh: vi.fn().mockResolvedValue(undefined),
    });

    await operations.commitStatusUpdate(
      {
        id: 'TEST_AUT_order',
        status: 'scheduled',
        stockProcessed: true,
      } as any,
      'cancelled'
    );

    expect(mocks.updateOrder).toHaveBeenCalledTimes(1);
    expect(mocks.processFiscalEffects).not.toHaveBeenCalled();
    expect(setOrders).toHaveBeenCalledTimes(2);
    expect(mocks.toast.error).toHaveBeenCalledWith('Erro ao atualizar status do pedido.');
  });

  it('mantém a venda cancelada e não repete a movimentação de estoque ao reconciliar o fiscal', async () => {
    mocks.updateOrder.mockResolvedValue(undefined);
    mocks.processFiscalEffects
      .mockRejectedValueOnce(new Error('Resultado incerto; consulte a SEFAZ.'))
      .mockResolvedValueOnce({ action: 'reconcile', reconciliationState: 'authorized' });
    const { createOrderHistoryOperations } = await import('./useOrderHistoryOperations');
    const order = {
      id: 'TEST_AUT_order',
      status: 'scheduled',
      stockProcessed: true,
      stockReversed: false,
    } as any;
    const operations = createOrderHistoryOperations({
      orders: [order],
      setOrders: vi.fn(),
      selectedOrders: [],
      setSelectedOrders: vi.fn(),
      setLoading: vi.fn(),
      refresh: vi.fn().mockResolvedValue(undefined),
    });

    await operations.commitStatusUpdate(order, 'cancelled');
    expect(mocks.updateOrder).toHaveBeenCalledTimes(1);
    expect(mocks.updateOrder.mock.calls[0][1]).toEqual({ status: 'cancelled' });

    await operations.retryFiscalCancellation({
      ...order,
      status: 'cancelled',
      stockProcessed: false,
      stockReversed: true,
    } as any);

    expect(mocks.updateOrder).toHaveBeenCalledTimes(1);
    expect(mocks.processFiscalEffects).toHaveBeenCalledTimes(2);
    expect(mocks.toast.warning).toHaveBeenCalledWith(
      expect.stringContaining('o cancelamento não foi registrado')
    );
  });
});
