// @vitest-environment happy-dom
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DeliveryInfoModal } from '../DeliveryInfoModal';
import Order from '@/pages/types/order.type';

describe('DeliveryInfoModal', () => {
  const mockOrder = {
    id: 'ord-123',
    customerData: {
      fullName: 'Cliente Teste',
      phone: '41999998888',
      fullAddress: {
        street: 'Rua Principal',
        number: '100',
        city: 'Curitiba',
        state: 'PR',
      },
    },
    shipping: {
      deliveryMethod: 'delivery',
      scheduling: {
        date: '2026-10-25',
        type: 'fixed',
        time: '10:00',
      },
    },
    items: [],
    paymentsSummary: { totalOrderValue: 500 },
  } as unknown as Order;

  beforeEach(() => {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  });

  it('desativa o scroll do conteúdo de fundo (body e html) quando o modal estiver aberto e restaura ao fechar', () => {
    const { unmount, rerender } = render(
      <DeliveryInfoModal
        order={mockOrder}
        isOpen={true}
        onClose={vi.fn()}
        clickedButtons={{}}
        staleButtons={{}}
        onExecuteAction={vi.fn()}
      />
    );

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overflow).toBe('hidden');

    rerender(
      <DeliveryInfoModal
        order={mockOrder}
        isOpen={false}
        onClose={vi.fn()}
        clickedButtons={{}}
        staleButtons={{}}
        onExecuteAction={vi.fn()}
      />
    );

    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');

    unmount();
  });

  it('fecha o modal ao pressionar a tecla Escape', () => {
    const handleClose = vi.fn();
    render(
      <DeliveryInfoModal
        order={mockOrder}
        isOpen={true}
        onClose={handleClose}
        clickedButtons={{}}
        staleButtons={{}}
        onExecuteAction={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('mostra primeiro as operações e só abre as ações da operação escolhida', () => {
    const handleExecuteAction = vi.fn();
    const orderWithOperations = {
      ...mockOrder,
      items: [
        { orderItemId: 'line-delivery', description: 'Mesa', quantity: 1 },
        { orderItemId: 'line-pickup', description: 'Cadeira', quantity: 2 },
      ],
      shipping: {
        ...mockOrder.shipping,
        scheduling: {
          ...mockOrder.shipping.scheduling,
          appointments: [
            {
              id: 'delivery-1',
              itemIds: ['line-delivery'],
              deliveryMethod: 'delivery',
              scheduling: mockOrder.shipping.scheduling,
            },
            {
              id: 'pickup-2',
              itemIds: ['line-pickup'],
              deliveryMethod: 'pickup',
              scheduling: mockOrder.shipping.scheduling,
            },
          ],
        },
      },
    } as unknown as Order;

    render(
      <DeliveryInfoModal
        order={orderWithOperations}
        isOpen={true}
        onClose={vi.fn()}
        clickedButtons={{}}
        staleButtons={{}}
        onExecuteAction={handleExecuteAction}
      />
    );

    expect(screen.getByRole('heading', { name: 'Informações sobre as operações' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Enviar para a Equipe/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Operação 2/2 · Retirada' }));
    expect(screen.getByRole('heading', { name: 'Operação 2/2' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Enviar para a Equipe/i }));
    expect(handleExecuteAction).toHaveBeenCalledWith(
      'sendShippingOrder',
      'SEND_SHIPPING_ORDER',
      'pickup-2'
    );
  });
});
