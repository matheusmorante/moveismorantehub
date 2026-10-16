// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { useInboundInvoiceItemsReview } from '../hooks/useInboundInvoiceItemsReview';
import { InboundIndividualProductModal } from './InboundIndividualProductModal';

const mocks = vi.hoisted(() => ({ find: vi.fn(), context: vi.fn(), title: vi.fn(), classify: vi.fn(), categories: vi.fn(),
  category: vi.fn(), details: vi.fn(), change: vi.fn(), save: vi.fn(), toast: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() } }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));
vi.mock('@/pages/utils/productService', () => ({ getFullProduct: vi.fn(), saveVariation: vi.fn() }));
vi.mock('@/pages/utils/productSupplierCodesService', () => ({ findProductSupplierCodes: mocks.find, saveProductSupplierCode: mocks.save, deleteProductSupplierCode: vi.fn() }));
vi.mock('@/pages/utils/categoryService', () => ({ fetchGroupsAndCategories: mocks.categories }));
vi.mock('@/pages/utils/categoryResolutionService', () => ({ resolveAutoCategory: mocks.category }));
vi.mock('@/pages/utils/aiService', () => ({ aiService: { generateMarketplaceTitle: mocks.title, classifyInboundItemWithSupplierContext: mocks.classify } }));
vi.mock('@/pages/utils/inboundNfe/inboundSupplierProductContext', () => ({ fetchSupplierProductsForContext: mocks.context, buildSupplierContextSummary: () => 'catálogo' }));
vi.mock('@/pages/utils/inboundNfe/inboundItemProductResolver', () => ({ resolveLinkedProductDetails: mocks.details,
  enrichInboundItemsWithProductDetails: async (items: unknown) => items, isGenericOrEmptyProductName: () => false }));
vi.mock('../services/inboundProductPreparationService', () => ({ prepareNewParentWithVariation: vi.fn(), prepareExistingParentNewVariation: vi.fn() }));
vi.mock('../hooks/useInboundInvoiceSuggestions', () => ({ useInboundInvoiceSuggestions: () => ({ suggestionFor: () => undefined, rejectSuggestion: vi.fn(),
  isProcessingSuggestions: false, isItemProcessing: () => false, retrySuggestions: vi.fn() }) }));
vi.mock('react-toastify', () => ({ toast: mocks.toast }));

const item: InboundInvoiceItem = { itemNumber: 1, productCode: 'FORN-1', productDescription: ' Mesa ', quantity: 2, unit: 'UN', unitCost: 10, totalCost: 20, ncm: '94036000', cfop: '1102' };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
let controller: ReturnType<typeof useInboundInvoiceItemsReview>;
function Page({ supplierId = 'supplier-1', items = [item] }: { supplierId?: string; items?: InboundInvoiceItem[] }) {
  const review = useInboundInvoiceItemsReview({ items, supplierId, suppliers: [], onChange: mocks.change, suggestionsEnabled: false });
  React.useEffect(() => { controller = review; }, [review]);
  return <>
    <button onClick={() => review.requestIndividualCreation(items[0])}>Preparar item</button>
    <output aria-label="Produto preparado">{JSON.stringify(review.initialProductData)}</output>
    <output aria-label="Cadastro aberto">{String(review.isProductModalOpen)}</output>
    <InboundIndividualProductModal item={review.individualItem} markup={review.individualMarkup} onMarkupChange={review.setIndividualMarkup}
      isBusy={review.individualBusy} error={review.individualError} onClose={review.cancelIndividualCreation} onConfirm={review.confirmIndividualCreation} />
  </>;
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.find.mockResolvedValue(new Map()); mocks.context.mockResolvedValue([]);
  mocks.title.mockResolvedValue({ title: 'Mesa' }); mocks.categories.mockResolvedValue({ categories: [] }); mocks.category.mockResolvedValue(null);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('preparação individual com proprietário, resolver e cadeia de preparação reais', () => {
  it('mantém o modal até a preparação terminar', async () => {
    const title = deferred<{ title: string }>(); mocks.title.mockReturnValueOnce(title.promise);
    render(<Page />); fireEvent.click(screen.getByText('Preparar item')); fireEvent.click(screen.getByText('Abrir cadastro'));
    await waitFor(() => expect(mocks.title).toHaveBeenCalledOnce());
    expect(screen.getByRole('button', { name: 'Abrir cadastro' })).toBeTruthy();
    await act(async () => { title.resolve({ title: 'Mesa pronta' }); });
    await waitFor(() => expect(screen.getByLabelText('Cadastro aberto').textContent).toBe('true'));
    expect(controller.individualItem).toBeNull();
  });
});
