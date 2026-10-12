// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type Order from '../../../types/order.type';
import { OrderDeliveryPrompt } from './OrderDeliveryPrompt';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('OrderDeliveryPrompt para coleta de devolução', () => {
  const collectionOrder = (startTime = '15:30') =>
    ({
      id: 'return-order-1',
      orderType: 'return',
      returnMethod: 'store_collection',
      status: 'scheduled',
      shipping: { scheduling: { date: '2026-10-10', startTime, type: 'fixed' } },
    }) as unknown as Order;

  it('mostra a coleta agendada e o tempo restante até concluir como Devolvido', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 10, 14, 30));

    render(
      <OrderDeliveryPrompt
        order={collectionOrder()}
        showManualPrompt={false}
        onStatusUpdate={vi.fn()}
      />
    );

    expect(screen.getByText('Coleta agendada')).toBeTruthy();
    expect(screen.getByText('Devolvido automaticamente em 9h 30min')).toBeTruthy();
    expect(screen.queryByText('Confirmar coleta')).toBeNull();
  });

  it('sinaliza prazo vencido enquanto a atualização automática conclui', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 11, 0, 1));

    render(
      <OrderDeliveryPrompt
        order={collectionOrder()}
        showManualPrompt={false}
        onStatusUpdate={vi.fn()}
      />
    );

    expect(screen.getByText('Coleta agendada')).toBeTruthy();
    expect(screen.getByText('Prazo vencido. Atualizando para Devolvido.')).toBeTruthy();
  });
});
