// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OrderHistoryRow from './OrderHistoryRow';

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
});
