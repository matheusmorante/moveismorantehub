// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OrderHistoryRow from './OrderHistoryRow';

vi.mock('@/pages/utils/settingsService', () => ({ getSettings: () => ({}) }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));

describe('OrderHistoryRow', () => {
  const rowProps = (order: any, fiscalBadgeStatus?: 'not_issued' | 'issued' | 'cancelled' | 'return' | 'estorno') => ({
    order,
    fiscalBadgeStatus,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onRestore: vi.fn(),
    onPermanentDelete: vi.fn(),
    onAction: vi.fn(),
    onStatusUpdate: vi.fn(),
    visibilitySettings: { id: true, customer: true },
    orderedColumnKeys: ['id', 'customer'],
  }) as any;

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

  it('coloca o selo fiscal abaixo do cliente e aplica cores próprias para devolução e estorno', () => {
    const { container, rerender } = render(
      <table><tbody><OrderHistoryRow {...rowProps({
        id: 'fiscal-return', status: 'fulfilled', orderType: 'return', returnStockReversed: true,
        customerData: { fullName: 'Cliente Teste' },
      }, 'return')} /></tbody></table>
    );

    const returnedBadge = screen.getByLabelText('Nota fiscal de devolução');
    expect(container.querySelectorAll('td')[1].contains(returnedBadge)).toBe(true);
    expect(returnedBadge.className).toContain('bg-orange-500');
    expect(returnedBadge.className).toContain('text-white');
    const returnIcon = returnedBadge.querySelector('svg.lucide-undo-2');
    expect(returnIcon).not.toBeNull();
    expect(returnIcon?.getAttribute('class')).toContain('h-2.5 w-2.5');
    expect(returnIcon?.parentElement?.className).toContain('h-3.5 w-3.5');
    expect(returnIcon?.parentElement?.className).toContain('bg-orange-500');

    rerender(
      <table><tbody><OrderHistoryRow {...rowProps({
        id: 'fiscal-estorno', status: 'fulfilled', orderType: 'sale',
        customerData: { fullName: 'Cliente Teste' },
      }, 'estorno')} /></tbody></table>
    );

    const estornoBadge = screen.getByLabelText('Nota fiscal de estorno');
    expect(estornoBadge.className).toContain('bg-purple-600');
    expect(estornoBadge.className).toContain('text-white');
    const estornoIcon = estornoBadge.querySelector('svg.lucide-arrow-left');
    expect(estornoIcon).not.toBeNull();
    expect(estornoIcon?.getAttribute('class')).toContain('h-2.5 w-2.5');
    expect(estornoIcon?.parentElement?.className).toContain('h-3.5 w-3.5');
    expect(estornoIcon?.parentElement?.className).toContain('bg-purple-600');
  });

  it('marca NF cancelada com X e fundo vermelho', () => {
    render(
      <table><tbody><OrderHistoryRow {...rowProps({
        id: 'fiscal-cancelled', status: 'fulfilled', orderType: 'sale',
        customerData: { fullName: 'Cliente Teste' },
      }, 'cancelled')} /></tbody></table>
    );

    const cancelledBadge = screen.getByLabelText('Nota fiscal cancelada');
    expect(cancelledBadge.className).toContain('bg-red-600');
    expect(cancelledBadge.className).toContain('text-white');
    const cancelIcon = cancelledBadge.querySelector('svg.lucide-x');
    expect(cancelIcon).not.toBeNull();
    expect(cancelIcon?.getAttribute('class')).toContain('h-2.5 w-2.5');
    expect(cancelIcon?.parentElement?.className).toContain('h-3.5 w-3.5');
    expect(cancelIcon?.parentElement?.className).toContain('bg-red-600');
  });

  it('usa o mesmo check e as mesmas dimensões no selo de NF emitida', () => {
    render(
      <table><tbody><OrderHistoryRow {...rowProps({
        id: 'fiscal-issued', status: 'fulfilled', orderType: 'sale',
        customerData: { fullName: 'Cliente Teste' },
      }, 'issued')} /></tbody></table>
    );

    const issuedBadge = screen.getByLabelText('Nota fiscal emitida');
    const checkIcon = issuedBadge.querySelector('svg.lucide-check');
    expect(checkIcon).not.toBeNull();
    expect(checkIcon?.getAttribute('class')).toContain('h-2.5 w-2.5');
    expect(checkIcon?.parentElement?.className).toContain('h-3.5 w-3.5');
    expect(checkIcon?.parentElement?.className).toContain('bg-emerald-600');
  });
});
