import { expect, it, vi } from 'vitest';
import { executeSaveOrder } from '../orderCreationService';
import { executeUpdateOrder } from '../orderUpdateService';

type OrderPaymentCaseMocks = {
  rpc: any;
};

export function registerOrderPaymentPersistenceCases(
  mocks: OrderPaymentCaseMocks,
  scheduledSale: any,
  splitPayments: any[],
): void {
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
}
