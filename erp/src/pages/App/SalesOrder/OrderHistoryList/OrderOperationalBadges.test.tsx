// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrderOperationalBadges } from './OrderOperationalBadges';
import Order from '../../../types/order.type';

afterEach(() => {
  cleanup();
});

const defaultStatusConfig = {
  scheduled: { label: 'Agendado', bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
  draft: { label: 'Rascunho', bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
};

describe('OrderOperationalBadges - Ícone de Retirada e Tipos Operacionais', () => {
  it('renderiza o ícone de retirada com duas mãos e a caixa (PickupIcon) para pedidos de retirada, sem bi-shop', () => {
    const pickupOrder = {
      id: 'order-pickup-1',
      status: 'scheduled',
      orderType: 'sale',
      shipping: { deliveryMethod: 'pickup' },
    } as unknown as Order;

    const { container } = render(
      <OrderOperationalBadges
        order={pickupOrder}
        isPaidTraffic={false}
        statusConfig={defaultStatusConfig}
        onStatusUpdate={vi.fn()}
      />
    );

    const badge = screen.getByTitle('Retirada');
    expect(badge).toBeTruthy();
    expect(badge.className).toContain('bg-purple-600');

    // Não pode conter o ícone antigo de loja (bi-shop)
    expect(badge.querySelector('.bi-shop')).toBeNull();

    // Deve conter o PickupIcon (span com maskImage para o asset de duas mãos segurando caixa) com tamanho h-5 w-5 preenchendo o container
    const iconSpan = badge.querySelector('span');
    expect(iconSpan).not.toBeNull();
    expect(iconSpan?.style.maskImage).toContain('pickup-hands-parcel-white.png');
    expect(iconSpan?.className).toContain('h-5');
    expect(iconSpan?.className).toContain('w-5');
  });

  it('renderiza o ícone de caminhão para pedidos de entrega', () => {
    const deliveryOrder = {
      id: 'order-delivery-1',
      status: 'scheduled',
      orderType: 'sale',
      shipping: { deliveryMethod: 'delivery' },
    } as unknown as Order;

    render(
      <OrderOperationalBadges
        order={deliveryOrder}
        isPaidTraffic={false}
        statusConfig={defaultStatusConfig}
        onStatusUpdate={vi.fn()}
      />
    );

    const badge = screen.getByTitle('Entrega');
    expect(badge).toBeTruthy();
    expect(badge.className).toContain('bg-emerald-600');
    expect(badge.querySelector('.bi-truck')).not.toBeNull();
  });

  it('renderiza o ícone de ferramentas para pedidos de assistência', () => {
    const assistanceOrder = {
      id: 'order-assis-1',
      status: 'scheduled',
      orderType: 'assistance',
      shipping: { deliveryMethod: 'delivery' },
    } as unknown as Order;

    render(
      <OrderOperationalBadges
        order={assistanceOrder}
        isPaidTraffic={false}
        statusConfig={defaultStatusConfig}
        onStatusUpdate={vi.fn()}
      />
    );

    const badge = screen.getByTitle('Assistência');
    expect(badge).toBeTruthy();
    expect(badge.className).toContain('bg-orange-500');
    expect(badge.querySelector('.bi-tools')).not.toBeNull();
  });

  it('renderiza container redondo com ícone de relógio no canto superior direito do botão de agendado (calendário) quando pendingScheduling=true', () => {
    const scheduledPendingOrder = {
      id: 'order-pending-sched-1',
      status: 'scheduled',
      orderType: 'sale',
      shipping: {
        deliveryMethod: 'delivery',
        scheduling: { pendingScheduling: true },
      },
    } as unknown as Order;

    render(
      <OrderOperationalBadges
        order={scheduledPendingOrder}
        isPaidTraffic={false}
        statusConfig={defaultStatusConfig}
        onStatusUpdate={vi.fn()}
      />
    );

    const statusButton = screen.getByTitle(/Status: Agendado \(Agendamento pendente\)/);
    expect(statusButton).toBeTruthy();
    // Confirma o ícone do calendário de agendado dentro do botão
    expect(statusButton.querySelector('.bi-calendar3')).not.toBeNull();

    // Confirma o container redondo com o ícone de relógio no canto superior direito
    const pendingDot = statusButton.querySelector('span[title="Agendamento pendente"]');
    expect(pendingDot).toBeTruthy();
    expect(pendingDot?.className).toContain('rounded-full');
    expect(pendingDot?.className).toContain('bg-orange-500');
    expect(pendingDot?.className).toContain('absolute');
    expect(pendingDot?.className).toContain('-top-1');
    expect(pendingDot?.className).toContain('-right-1');
    expect(pendingDot?.querySelector('.bi-clock')).not.toBeNull();
  });

  it('não renderiza o container redondo de relógio quando pendingScheduling é falso ou omitido', () => {
    const normalOrder = {
      id: 'order-normal-sched-1',
      status: 'scheduled',
      orderType: 'sale',
      shipping: {
        deliveryMethod: 'delivery',
        scheduling: { pendingScheduling: false },
      },
    } as unknown as Order;

    render(
      <OrderOperationalBadges
        order={normalOrder}
        isPaidTraffic={false}
        statusConfig={defaultStatusConfig}
        onStatusUpdate={vi.fn()}
      />
    );

    const statusButton = screen.getByTitle('Status: Agendado | Tipo: Entrega');
    expect(statusButton).toBeTruthy();
    expect(statusButton.querySelector('span[title="Agendamento pendente"]')).toBeNull();
  });

  it('não renderiza o container redondo de relógio quando o pedido está cancelado', () => {
    const cancelledOrder = {
      id: 'order-cancelled-1',
      status: 'cancelled',
      orderType: 'sale',
      shipping: {
        deliveryMethod: 'delivery',
        scheduling: { pendingScheduling: true },
      },
    } as unknown as Order;

    render(
      <OrderOperationalBadges
        order={cancelledOrder}
        isPaidTraffic={false}
        statusConfig={defaultStatusConfig}
        onStatusUpdate={vi.fn()}
      />
    );

    const statusButton = screen.getByTitle('Status: Rascunho | Tipo: Entrega');
    expect(statusButton.querySelector('span[title="Agendamento pendente"]')).toBeNull();
  });
});
