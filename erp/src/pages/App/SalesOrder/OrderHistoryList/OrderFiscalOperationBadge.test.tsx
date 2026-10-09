// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { OrderFiscalOperationBadge } from './OrderFiscalOperationBadge';
import type { ReturnFiscalDocumentSummary } from '@/pages/utils/nfe/orderFiscalBadgeRules';

const returnDocument = (
  id: string,
  status: string,
  values: Partial<ReturnFiscalDocumentSummary> = {}
): ReturnFiscalDocumentSummary => ({
  id,
  order_id: `return-${id}`,
  document_type: 'return',
  status,
  ambiente: 2,
  numero_nfe: id === 'nfd-1' ? '901' : '902',
  serie: '1',
  modelo: '55',
  valor_total: 1250.5,
  created_at: '2026-10-09T10:00:00.000Z',
  issuedAt: '2026-10-09T10:00:00.000Z',
  returnOrderCode: id === 'nfd-1' ? 301 : 302,
  itemQuantity: 3,
  ...values,
});

describe('OrderFiscalOperationBadge NFD', () => {
  it('counts fiscal documents and opens their individual details and actions', () => {
    const onOpenDocument = vi.fn();
    render(
      <MemoryRouter>
        <OrderFiscalOperationBadge
          kind="devolucao"
          status="mixed"
          documents={[returnDocument('nfd-1', 'autorizada'), returnDocument('nfd-2', 'cancelada')]}
          onOpenDocument={onOpenDocument}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /NFD · 2 notas fiscais.*Estados mistos/i }));

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('NFD 901 · Série 1')).toBeTruthy();
    expect(screen.getByText('NFD 902 · Série 1')).toBeTruthy();
    expect(screen.getByText('#301')).toBeTruthy();
    expect(
      screen.getAllByText(
        (_text, element) => element?.textContent?.replace(/\u00a0/g, ' ') === 'R$ 1.250,50'
      )
    ).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('button', { name: /Abrir XML\/DANFE e ações fiscais/i })[0]);
    expect(onOpenDocument).toHaveBeenCalledWith('nfd-1', 2);
  });

  it('does not show NFD when there are no persisted return documents', () => {
    const { container } = render(
      <MemoryRouter>
        <OrderFiscalOperationBadge kind="devolucao" status="pending" documents={[]} />
      </MemoryRouter>
    );

    expect(container.firstChild).toBeNull();
  });
});
