// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ManageInboundInvoiceMappingsModal } from './ManageInboundInvoiceMappingsModal';
import { findProductSupplierCodes } from '@/pages/utils/productSupplierCodesService';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';

vi.mock('@/pages/App/Registrations/shared/PersonFormModal', () => ({ default: () => null }));
vi.mock('@/components/SupplierAutocomplete', () => ({ default: () => null }));
vi.mock('@/pages/utils/personService', () => ({ fetchPersons: async () => [] }));
vi.mock('@/pages/utils/productSupplierCodesService', () => ({ findProductSupplierCodes: vi.fn(), saveProductSupplierCode: vi.fn() }));
vi.mock('@/pages/utils/inboundNfe/inboundInvoicesService', () => ({ saveInboundInvoice: vi.fn() }));
vi.mock('@/pages/utils/inboundNfe/inboundXmlParser', () => ({ parseInboundNfeXml: vi.fn() }));
vi.mock('@/pages/utils/inboundNfe/productResolutionFeedbackService', () => ({ recordProductResolutionFeedback: vi.fn() }));
vi.mock('../components/InboundInvoiceItemsReview', () => ({ InboundInvoiceItemsReview: ({ suggestionsEnabled, items, onProcessingSuggestionsChange }: { suggestionsEnabled: boolean; items: { matchedProductId?: string }[]; onProcessingSuggestionsChange: (value: boolean) => void }) => {
    React.useEffect(() => { onProcessingSuggestionsChange(true); }, [onProcessingSuggestionsChange]);
    return <div data-testid="review" data-enabled={String(suggestionsEnabled)} data-linked={String(Boolean(items[0]?.matchedProductId))}><button type="button">Remover</button></div>;
} }));
afterEach(cleanup);
const invoice = { id: 'nota', supplierId: 'fornecedor', nfeNumber: '1', items: [{ itemNumber: 1, productCode: 'ABC', productDescription: 'Beliche Rubim' }] } as InboundInvoice;

it.each([false, true])('libera a IA somente após concluir a consulta dos vínculos (encontrado: %s)', async (found) => {
    let finish!: (value: Awaited<ReturnType<typeof findProductSupplierCodes>>) => void;
    vi.mocked(findProductSupplierCodes).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const view = render(<ManageInboundInvoiceMappingsModal isOpen invoice={invoice} onClose={vi.fn()} onSaveSuccess={vi.fn()} />);
    await waitFor(() => expect(findProductSupplierCodes).toHaveBeenCalled());
    expect(view.getByTestId('review').getAttribute('data-enabled')).toBe('false');
    await act(async () => { finish(found ? new Map([['ABC', { productId: 'produto', supplierId: 'fornecedor', supplierProductCode: 'ABC' }]]) : new Map()); });
    await waitFor(() => expect(view.getByTestId('review').getAttribute('data-enabled')).toBe('true'));
    expect(view.getByTestId('review').getAttribute('data-linked')).toBe(String(found));
    expect(view.getByRole('button', { name: 'Remover' }).matches(':disabled')).toBe(false);
    expect(view.getByRole('button', { name: 'Salvar Alterações' }).matches(':disabled')).toBe(true);
});

it('mantém sugestões desabilitadas quando a nota fiscal não tem fornecedor selecionado', async () => {
    const invoiceWithoutSupplier = { id: 'nota_sem_forn', supplierId: undefined, nfeNumber: '2', items: [{ itemNumber: 1, productCode: 'XYZ', productDescription: 'Guarda Roupa' }] } as unknown as InboundInvoice;
    const view = render(<ManageInboundInvoiceMappingsModal isOpen invoice={invoiceWithoutSupplier} onClose={vi.fn()} onSaveSuccess={vi.fn()} />);
    await waitFor(() => expect(view.getByTestId('review')).toBeTruthy());
    expect(view.getByTestId('review').getAttribute('data-enabled')).toBe('false');
    expect(findProductSupplierCodes).not.toHaveBeenCalled();
});

