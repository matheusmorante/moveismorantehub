// @vitest-environment happy-dom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
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
