// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
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
      <MemoryRouter>
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
      </MemoryRouter>
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

  it('exibe ambos os rótulos NF e NFH mesmo quando não há nota de homologação emitida e permite emissão ao clicar', () => {
    const order = { id: 'order-1', status: 'fulfilled', orderType: 'sale' } as any;
    const noop = vi.fn();
    const onIssueNfe = vi.fn();
    render(
      <MemoryRouter>
        <table>
          <tbody>
            <OrderHistoryRow
              order={order}
              fiscalBadgeStatus="not_issued"
              fiscalHmlBadgeStatus="not_issued"
              onEdit={noop}
              onDelete={noop}
              onRestore={noop}
              onPermanentDelete={noop}
              onAction={noop}
              onStatusUpdate={noop}
              onIssueNfe={onIssueNfe}
              visibilitySettings={mockVisibilitySettings}
              orderedColumnKeys={['id', 'customer']}
            />
          </tbody>
        </table>
      </MemoryRouter>
    );

    expect(screen.getByText('NF')).toBeTruthy();
    expect(screen.getByText('NFH')).toBeTruthy();

    const row = screen.getByText('NF').closest('tr');
    expect(screen.getByText('NF').closest('td')).toBe(row?.children[1]);

    fireEvent.click(screen.getByText('NFH'));
    expect(onIssueNfe).toHaveBeenCalledWith(order, 2);

    fireEvent.click(screen.getByText('NF'));
    expect(onIssueNfe).toHaveBeenCalledWith(order, 1);
  });

  it('exibe rótulo NFH quando homologação estiver emitida/autorizada', () => {
    const order = { id: 'order-1', status: 'fulfilled', orderType: 'sale' } as any;
    const noop = vi.fn();
    const onViewFiscalDocument = vi.fn();
    render(
      <MemoryRouter>
        <table>
          <tbody>
            <OrderHistoryRow
              order={order}
              fiscalBadgeStatus="issued"
              fiscalHmlBadgeStatus="issued"
              fiscalDocumentId="production-document-1"
              fiscalHmlDocumentId="hml-document-1"
              onViewFiscalDocument={onViewFiscalDocument}
              onEdit={noop}
              onDelete={noop}
              onRestore={noop}
              onPermanentDelete={noop}
              onAction={noop}
              onStatusUpdate={noop}
              visibilitySettings={mockVisibilitySettings}
              orderedColumnKeys={['id', 'customer']}
            />
          </tbody>
        </table>
      </MemoryRouter>
    );

    expect(screen.getByText('NF')).toBeTruthy();
    expect(screen.getByText('NFH')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Nota fiscal de homologação emitida · Abrir documento fiscal',
      })
    ).toBeTruthy();
    const row = screen.getByText('NFH').closest('tr');
    expect(screen.getByText('NFH').closest('td')).toBe(row?.children[1]);
    expect(row?.children[0].textContent).not.toContain('NFH');

    fireEvent.click(screen.getByRole('button', { name: 'Nota fiscal de homologação emitida · Abrir documento fiscal' }));
    expect(onViewFiscalDocument).toHaveBeenCalledWith('hml-document-1', 2);
    fireEvent.click(screen.getByRole('button', { name: 'Nota fiscal emitida · Abrir documento fiscal' }));
    expect(onViewFiscalDocument).toHaveBeenCalledWith('production-document-1', 1);
  });
});
