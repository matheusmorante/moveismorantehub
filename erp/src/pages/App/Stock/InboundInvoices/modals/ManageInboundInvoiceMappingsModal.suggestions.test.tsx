// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ManageInboundInvoiceMappingsModal } from './ManageInboundInvoiceMappingsModal';
import { findProductSupplierCodes } from '@/pages/utils/productSupplierCodesService';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
const reviewSignals = vi.hoisted(() => ({ onProcessing: undefined as ((busy: boolean) => void) | undefined }));

vi.mock('@/pages/App/Registrations/shared/modals/PersonFormModal', () => ({ default: () => null }));
vi.mock('@/components/SupplierAutocomplete', () => ({ default: () => null }));
vi.mock('@/pages/utils/personService', () => ({ fetchPersons: async () => [] }));
vi.mock('@/pages/utils/productSupplierCodesService', () => ({
  findProductSupplierCodes: vi.fn(),
  saveProductSupplierCode: vi.fn(),
}));
vi.mock('@/pages/utils/inboundNfe/inboundInvoicesService', () => ({ saveInboundInvoice: vi.fn() }));
vi.mock('@/pages/utils/inboundNfe/inboundXmlParser', () => ({ parseInboundNfeXml: vi.fn() }));
vi.mock('@/pages/utils/inboundNfe/productResolutionFeedbackService', () => ({
  recordProductResolutionFeedback: vi.fn(),
}));
vi.mock('@/pages/utils/inboundNfe/inboundItemProductResolver', () => ({
  enrichInboundItemsWithProductDetails: vi.fn(async (items) => items),
  resolveLinkedProductDetails: vi.fn(),
  isGenericOrEmptyProductName: vi.fn(),
}));
vi.mock('../components/InboundInvoiceItemsReview', () => ({
  InboundInvoiceItemsReview: ({
    suggestionsEnabled,
    items,
    contextKey,
    onProcessingSuggestionsChange,
  }: {
    suggestionsEnabled: boolean;
    items: { matchedProductId?: string }[];
    contextKey?: string;
    onProcessingSuggestionsChange?: (busy: boolean) => void;
  }) => {
    const [token] = React.useState(() => crypto.randomUUID());
    reviewSignals.onProcessing = onProcessingSuggestionsChange;
    React.useEffect(() => () => onProcessingSuggestionsChange?.(false), [onProcessingSuggestionsChange]);
    return (
      <div
        data-testid="review"
        data-enabled={String(suggestionsEnabled)}
        data-linked={String(Boolean(items[0]?.matchedProductId))}
        data-context={contextKey}
        data-token={token}
      >
        <button type="button">Remover</button>
      </div>
    );
  },
}));
afterEach(cleanup);
const invoice = {
  id: 'nota',
  supplierId: 'fornecedor',
  nfeNumber: '1',
  items: [{ itemNumber: 1, productCode: 'ABC', productDescription: 'Beliche Rubim' }],
} as InboundInvoice;

it('forwards the invoice identity and blocks closing during a child operation', async () => {
  vi.mocked(findProductSupplierCodes).mockResolvedValue(new Map()); const onClose = vi.fn();
  const view = render(<ManageInboundInvoiceMappingsModal isOpen invoice={invoice} onClose={onClose} onSaveSuccess={vi.fn()} />);
  await waitFor(() => expect(view.getByTestId('review').getAttribute('data-context')).toBe('nota'));
  act(() => reviewSignals.onProcessing?.(true));
  expect(view.getByLabelText('Fechar vínculos')).toHaveProperty('disabled', true);
  expect(view.getByRole('button', { name: 'Remover' }).closest('fieldset')).toHaveProperty('disabled', true);
  fireEvent.click(view.getByLabelText('Fechar vínculos')); expect(onClose).not.toHaveBeenCalled();
  act(() => reviewSignals.onProcessing?.(false)); fireEvent.click(view.getByLabelText('Fechar vínculos')); expect(onClose).toHaveBeenCalledOnce();
});

it('remounts the review owner when changing to another invoice', async () => {
  vi.mocked(findProductSupplierCodes).mockResolvedValue(new Map());
  const view = render(<ManageInboundInvoiceMappingsModal isOpen invoice={invoice} onClose={vi.fn()} onSaveSuccess={vi.fn()} />);
  await waitFor(() => expect(view.getByTestId('review').getAttribute('data-context')).toBe('nota'));
  const token = view.getByTestId('review').getAttribute('data-token');
  view.rerender(<ManageInboundInvoiceMappingsModal isOpen invoice={{ ...invoice, id: 'outra-nota' }} onClose={vi.fn()} onSaveSuccess={vi.fn()} />);
  await waitFor(() => expect(view.getByTestId('review').getAttribute('data-context')).toBe('outra-nota'));
  expect(view.getByTestId('review').getAttribute('data-token')).not.toBe(token);
});

it.each([false, true])(
  'mantém as sugestões desabilitadas após consultar os vínculos existentes (encontrado: %s)',
  async (found) => {
    let finish!: (value: Awaited<ReturnType<typeof findProductSupplierCodes>>) => void;
    vi.mocked(findProductSupplierCodes).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const view = render(
      <ManageInboundInvoiceMappingsModal
        isOpen
        invoice={invoice}
        onClose={vi.fn()}
        onSaveSuccess={vi.fn()}
      />
    );
    await waitFor(() => expect(findProductSupplierCodes).toHaveBeenCalled());
    expect(view.getByTestId('review').getAttribute('data-enabled')).toBe('false');
    await act(async () => {
      finish(
        found
          ? new Map([
              [
                'ABC',
                { productId: 'produto', supplierId: 'fornecedor', supplierProductCode: 'ABC' },
              ],
            ])
          : new Map()
      );
    });
    await waitFor(() =>
      expect(view.getByTestId('review').getAttribute('data-linked')).toBe(String(found))
    );
    expect(view.getByTestId('review').getAttribute('data-enabled')).toBe('false');
    expect(view.getByTestId('review').getAttribute('data-linked')).toBe(String(found));
    expect(view.getByRole('button', { name: 'Remover' }).matches(':disabled')).toBe(false);
    expect(view.queryByRole('button', { name: 'Salvar Alterações' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Cancelar' })).toBeNull();
  }
);

it('mantém sugestões desabilitadas quando a nota fiscal não tem fornecedor selecionado', async () => {
  const invoiceWithoutSupplier = {
    id: 'nota_sem_forn',
    supplierId: undefined,
    nfeNumber: '2',
    items: [{ itemNumber: 1, productCode: 'XYZ', productDescription: 'Guarda Roupa' }],
  } as unknown as InboundInvoice;
  const view = render(
    <ManageInboundInvoiceMappingsModal
      isOpen
      invoice={invoiceWithoutSupplier}
      onClose={vi.fn()}
      onSaveSuccess={vi.fn()}
    />
  );
  await waitFor(() => expect(view.getByTestId('review')).toBeTruthy());
  expect(view.getByTestId('review').getAttribute('data-enabled')).toBe('false');
  expect(findProductSupplierCodes).not.toHaveBeenCalled();
});
