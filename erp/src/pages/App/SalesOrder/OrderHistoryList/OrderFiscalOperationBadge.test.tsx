// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  cleanup();
});
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
  it('opens the fiscal document represented by the clicked NFD badge directly', () => {
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

    expect(screen.getByRole('button', { name: /NFD1 · 901 · Autorizada/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /NFD2 · 902 · Cancelada/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /NFD1 · 901 · Autorizada/i }));

    expect(onOpenDocument).toHaveBeenCalledWith('nfd-1', 2);
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /NFD2 · 902 · Cancelada/i }));
    expect(onOpenDocument).toHaveBeenLastCalledWith('nfd-2', 2);
    expect(onOpenDocument).toHaveBeenCalledTimes(2);
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

describe('OrderFiscalOperationBadge Estorno', () => {
  it('opens document details modal when draftId is provided with onOpenDocument', () => {
    const onOpenDocument = vi.fn();
    render(
      <MemoryRouter>
        <OrderFiscalOperationBadge
          kind="estorno"
          status="prepared"
          draftId="draft-123"
          environment={2}
          onOpenDocument={onOpenDocument}
        />
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /Nota fiscal de estorno.*detalhes/i });
    expect(button).toBeTruthy();

    fireEvent.click(button);
    expect(onOpenDocument).toHaveBeenCalledWith('draft-123', 2);
  });

  it('calls onOpenDraft fallback when onOpenDocument is not provided', () => {
    const onOpenDraft = vi.fn();
    render(
      <MemoryRouter>
        <OrderFiscalOperationBadge
          kind="estorno"
          status="prepared"
          draftId="draft-123"
          onOpenDraft={onOpenDraft}
        />
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /Nota fiscal de estorno.*detalhes/i });
    expect(button).toBeTruthy();

    fireEvent.click(button);
    expect(onOpenDraft).toHaveBeenCalledWith('draft-123');
  });

  it('opens document when documentId is provided', () => {
    const onOpenDocument = vi.fn();
    render(
      <MemoryRouter>
        <OrderFiscalOperationBadge
          kind="estorno"
          status="issued"
          documentId="doc-456"
          environment={2}
          onOpenDocument={onOpenDocument}
        />
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /Nota fiscal de estorno.*documento fiscal/i });
    expect(button).toBeTruthy();

    fireEvent.click(button);
    expect(onOpenDocument).toHaveBeenCalledWith('doc-456', 2);
  });

  it('renders a span when neither documentId nor draftId is provided', () => {
    render(
      <MemoryRouter>
        <OrderFiscalOperationBadge kind="estorno" status="prepared" />
      </MemoryRouter>
    );

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('NFE')).toBeTruthy();
  });
});
