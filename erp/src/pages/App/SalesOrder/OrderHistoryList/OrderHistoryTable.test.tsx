// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import OrderHistoryTable from './OrderHistoryTable';

vi.mock('@/pages/utils/settingsService', () => ({ getSettings: () => ({}) }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));

const mockWindowWidth = (width: number) => {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
};

describe('OrderHistoryTable', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  const baseOrder = {
    id: 'order-101',
    orderNumber: 101,
    status: 'cancelled',
    orderType: 'sale',
    customerData: { fullName: 'Consumidor Teste' },
    paymentsSummary: { totalOrderValue: 250 },
    items: [],
  } as any;

  const defaultProps = {
    orders: [baseOrder],
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onRestore: vi.fn(),
    onPermanentDelete: vi.fn(),
    onAction: vi.fn(),
    onStatusUpdate: vi.fn(),
    visibilitySettings: {} as any,
    selectedOrders: [],
    onToggleSelection: vi.fn(),
  };

  it.each([1200, 500])('usa o resumo físico dos irmãos, sem repetir a devolução integral histórica (%i px)', width => {
    mockWindowWidth(width);
    render(<MemoryRouter><OrderHistoryTable {...defaultProps} orders={[{ ...baseOrder,
      status: 'fulfilled', stockProcessed: true, returnOrderId: 'cancelled-return', returnKind: 'complete',
      linkedReturnMovement: { status: 'fulfilled', returnKind: 'partial', stockProcessed: true },
    }]} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Saída devolvida parcialmente' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Saída devolvida integralmente' })).toBeNull();
  });

  it.each([1200, 500])('mostra a NFD própria da devolução e abre o documento no ambiente correto (%i px)', (width) => {
    mockWindowWidth(width);
    const onViewFiscalDocument = vi.fn();
    render(<MemoryRouter><OrderHistoryTable {...defaultProps}
      orders={[{ ...baseOrder, orderType: 'return', status: 'fulfilled' }]}
      onViewFiscalDocument={onViewFiscalDocument}
      fiscalBadgeStatusByOrderId={{ 'order-101': {
        production: 'not_issued', homologation: 'not_issued',
        devolucaoStatus: 'issued', devolucaoEnvironment: 2, devolucaoDocumentId: 'return-doc',
        devolucaoDocuments: [{ id: 'return-doc', order_id: 'order-101', document_type: 'return', status: 'homologada', ambiente: 2, modelo: '55', numero_nfe: 709, serie: '1' }],
      } }}
    /></MemoryRouter>);
    expect(screen.queryByLabelText(/Nota fiscal não emitida/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /NFD.*Autorizada/ }));
    fireEvent.click(screen.getByRole('button', { name: /Abrir XML\/DANFE e ações fiscais/ }));
    expect(onViewFiscalDocument).toHaveBeenCalledWith('return-doc', 2);
  });

  it('renderiza visão em tabela para telas desktop sem erro', () => {
    mockWindowWidth(1200);

    render(
      <MemoryRouter>
        <OrderHistoryTable
          {...defaultProps}
          fiscalBadgeStatusByOrderId={{
            'order-101': {
              production: 'not_issued',
              homologation: 'issued',
              estornoStatus: 'prepared',
              estornoDraftId: 'draft-xyz',
              estornoEnvironment: 2,
            },
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('table')).toBeTruthy();
  });

  it('renderiza visão em cards para telas móveis com estornoDraftId sem lançar ReferenceError', () => {
    mockWindowWidth(500);

    const { container } = render(
      <MemoryRouter>
        <OrderHistoryTable
          {...defaultProps}
          fiscalBadgeStatusByOrderId={{
            'order-101': {
              production: 'not_issued',
              homologation: 'issued',
              estornoStatus: 'prepared',
              estornoDraftId: 'draft-xyz',
              estornoEnvironment: 2,
            },
          }}
        />
      </MemoryRouter>
    );

    expect(container.querySelector('#order-card-order-101')).toBeTruthy();
  });
});
