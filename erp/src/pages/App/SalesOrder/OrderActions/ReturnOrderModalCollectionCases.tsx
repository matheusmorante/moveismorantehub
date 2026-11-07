import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { expect, it, vi } from 'vitest';
import type Order from '../../../types/order.type';
import type { ReturnOrderModalProps } from './return-order-modal/types';

type ReturnMethodLifecycleDependencies = {
  ReturnOrderModal: ComponentType<ReturnOrderModalProps>;
  order: Order;
  authorizedInvoice: any;
  mocks: any;
  setupSupabaseFrom: (nfeDocs?: any[], priorReturns?: any[]) => void;
};

export function registerReturnMethodLifecycleCases({
  ReturnOrderModal,
  order,
  authorizedInvoice,
  mocks,
  setupSupabaseFrom,
}: ReturnMethodLifecycleDependencies): void {
  it('mantém a coleta agendada na agenda e não transmite antes da confirmação física', async () => {
    setupSupabaseFrom([authorizedInvoice]);
    render(<ReturnOrderModal order={order} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await screen.findByRole('status');
    fireEvent.click(screen.getByRole('button', { name: 'Cadeira' }));
    fireEvent.click(screen.getByRole('button', { name: 'Coleta da devolução' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agendar coleta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gerar pedido de devolução' }));

    await waitFor(() => expect(mocks.saveOrder).toHaveBeenCalledTimes(1));
    const created = mocks.saveOrder.mock.calls[0][0] as Order;
    expect(created).toMatchObject({
      orderType: 'return',
      status: 'scheduled',
      returnMethod: 'store_collection',
      shipping: { scheduling: { date: '2026-10-15', startTime: '10:00' } },
      collectionObservation: '',
    });
    expect(mocks.autoTransmitReturnFiscal).not.toHaveBeenCalled();
  });

  it('inicia a emissão automática após gravar a devolução já recebida na loja', async () => {
    setupSupabaseFrom([authorizedInvoice]);
    render(<ReturnOrderModal order={order} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await screen.findByRole('status');
    fireEvent.click(screen.getByRole('button', { name: 'Cadeira' }));
    fireEvent.click(screen.getByRole('button', { name: 'Coleta da devolução' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cliente devolveu na loja' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gerar pedido de devolução' }));

    await waitFor(() => expect(mocks.saveOrder).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mocks.autoTransmitReturnFiscal).toHaveBeenCalledWith('return-order')
    );
    const created = mocks.saveOrder.mock.calls[0][0] as Order;
    expect(created).toMatchObject({
      orderType: 'return',
      status: 'fulfilled',
      returnMethod: 'store_delivery',
      linkedOrderId: 'sale-order',
      returnKind: 'complete',
      returnedTotalAmount: 100,
      originalSoldTotal: 100,
      returnStockProcessed: false,
      fiscalReturnAllocations: [
        {
          returnItemIndex: 0,
          originalOrderItemIndex: 0,
          originalDocumentId: 'source-nfe',
          originalItemNumber: 1,
          quantity: 1,
        },
      ],
    });
  });
}
