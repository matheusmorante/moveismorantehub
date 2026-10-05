// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import OrderHistoryRow from './OrderHistoryRow';

afterEach(() => {
  cleanup();
});

vi.mock('@/pages/utils/settingsService', () => ({ getSettings: () => ({}) }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));

describe('OrderHistoryRow', () => {
  it('mantém somente células diretamente dentro da linha cancelada', () => {
    const order = { id: 'cancelled-order', status: 'cancelled', orderType: 'sale' } as any;
    const noop = vi.fn();
    const { container } = render(
      <table>
        <tbody>
          <OrderHistoryRow
            order={order}
            onEdit={noop}
            onDelete={noop}
            onRestore={noop}
            onPermanentDelete={noop}
            onAction={noop}
            onStatusUpdate={noop}
            visibilitySettings={{
              id: true,
              orderDate: true,
              deliveryDate: true,
              customer: true,
              totalValue: true,
              status: true,
              orderType: true,
              labels: true,
              actions: true,
            }}
            orderedColumnKeys={['id']}
          />
        </tbody>
      </table>
    );

    const row = container.querySelector('tr');
    expect(screen.getByText('Cancelado')).toBeTruthy();
    expect(row).not.toBeNull();
    expect([...row!.children].every((child) => ['TD', 'TH'].includes(child.tagName))).toBe(true);
  });

  const mockVisibilitySettings: any = {
    id: true,
    orderDate: true,
    deliveryDate: true,
    customer: true,
    totalValue: true,
    status: true,
    orderType: true,
    labels: true,
    actions: true,
  };

  it('exibe apenas rótulo NF quando não há nota de homologação emitida', () => {
    const order = { id: 'order-1', status: 'fulfilled', orderType: 'sale' } as any;
    const noop = vi.fn();
    render(
      <table>
        <tbody>
          <OrderHistoryRow
            order={order}
            fiscalBadgeStatus="issued"
            fiscalHmlBadgeStatus="not_issued"
            onEdit={noop}
            onDelete={noop}
            onRestore={noop}
            onPermanentDelete={noop}
            onAction={noop}
            onStatusUpdate={noop}
            visibilitySettings={mockVisibilitySettings}
            orderedColumnKeys={['id']}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('NF')).toBeTruthy();
    expect(screen.queryByText('NFH')).toBeNull();
  });

  it('exibe rótulo NFH quando homologação estiver emitida/autorizada', () => {
    const order = { id: 'order-1', status: 'fulfilled', orderType: 'sale' } as any;
    const noop = vi.fn();
    render(
      <table>
        <tbody>
          <OrderHistoryRow
            order={order}
            fiscalBadgeStatus="not_issued"
            fiscalHmlBadgeStatus="issued"
            onEdit={noop}
            onDelete={noop}
            onRestore={noop}
            onPermanentDelete={noop}
            onAction={noop}
            onStatusUpdate={noop}
            visibilitySettings={mockVisibilitySettings}
            orderedColumnKeys={['id']}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('NF')).toBeTruthy();
    expect(screen.getByText('NFH')).toBeTruthy();
    expect(screen.getByTitle('Nota fiscal de homologação emitida')).toBeTruthy();
  });
});
