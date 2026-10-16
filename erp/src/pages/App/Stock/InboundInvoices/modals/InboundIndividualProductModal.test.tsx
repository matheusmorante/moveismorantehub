// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  vi.clearAllMocks(); mocks.find.mockReset().mockResolvedValue(new Map()); mocks.context.mockReset().mockResolvedValue([]);
  mocks.title.mockReset().mockResolvedValue({ title: 'Mesa' }); mocks.categories.mockReset().mockResolvedValue({ categories: [] }); mocks.category.mockReset().mockResolvedValue(null);
  mocks.details.mockReset(); mocks.classify.mockReset();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('preparação individual com proprietário, resolver e cadeia de preparação reais', () => {
  it('mantém o modal até a preparação terminar', async () => {
    const title = deferred<{ title: string }>(); mocks.title.mockReturnValueOnce(title.promise);
    render(<Page />); fireEvent.click(screen.getByText('Preparar item')); fireEvent.click(screen.getByText('Abrir cadastro'));
    await waitFor(() => expect(mocks.title).toHaveBeenCalledOnce());
    expect(screen.getByRole('button', { name: 'Abrir cadastro' })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Abrir cadastro' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Acréscimo sobre o custo final (%)') as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('Cancelar')); fireEvent.click(screen.getByText('Abrir cadastro'));
    expect(within(screen.getByRole('dialog')).getByRole('status').textContent).toContain('Preparando'); expect(controller.individualItem).toBeTruthy(); expect(mocks.title).toHaveBeenCalledOnce();
    await act(async () => { title.resolve({ title: 'Mesa pronta' }); });
    await waitFor(() => expect(screen.getByLabelText('Cadastro aberto').textContent).toBe('true'));
    expect(controller.individualItem).toBeNull();
  });
  it.each(['title', 'categories', 'category'] as const)('falha de %s mantém dados e modal para tentativa explícita', async (stage) => {
    mocks[stage].mockRejectedValueOnce(new Error('Falha na preparação'));
    render(<Page />); fireEvent.click(screen.getByText('Preparar item')); fireEvent.change(screen.getByLabelText('Acréscimo sobre o custo final (%)'), { target: { value: '10' } });
    fireEvent.click(screen.getByText('Abrir cadastro')); await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Falha na preparação'));
    expect(controller.isProductModalOpen).toBe(false); expect(controller.individualMarkup).toBe('10'); expect(controller.individualBusy).toBe(false);
    fireEvent.click(screen.getByText('Abrir cadastro')); await waitFor(() => expect(controller.isProductModalOpen).toBe(true));
    expect(controller.initialProductData).toMatchObject({ costPrice: 10, unitPrice: 11, stock: 0 }); expect(mocks.save).not.toHaveBeenCalled();
  });
  it.each(['description', 'quantity', 'cost', 'markup'] as const)('resolver impede entrada inválida %s antes do I/O', async (kind) => {
    const invalid = { ...item, ...(kind === 'description' ? { productDescription: '  ' } : kind === 'quantity' ? { quantity: 0 } : kind === 'cost' ? { unitCost: -1 } : {}) };
    render(<Page items={[invalid]} />); fireEvent.click(screen.getByText('Preparar item'));
    if (kind === 'markup') fireEvent.change(screen.getByLabelText('Acréscimo sobre o custo final (%)'), { target: { value: '-1' } });
    fireEvent.click(screen.getByText('Abrir cadastro')); await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(mocks.find).not.toHaveBeenCalled(); expect(mocks.context).not.toHaveBeenCalled(); expect(mocks.title).not.toHaveBeenCalled(); expect(mocks.change).not.toHaveBeenCalled();
  });
  it.each(['', '0', '12.5'])('preserva custo, estoque zero e contrato de acréscimo %s', async (markup) => {
    render(<Page supplierId=" supplier-1 " items={[{ ...item, unitCost: 0 }]} />); fireEvent.click(screen.getByText('Preparar item'));
    fireEvent.change(screen.getByLabelText('Acréscimo sobre o custo final (%)'), { target: { value: markup } }); fireEvent.click(screen.getByText('Abrir cadastro'));
    await waitFor(() => expect(controller.isProductModalOpen).toBe(true));
    expect(mocks.find).toHaveBeenCalledWith('supplier-1', ['FORN-1']); expect(mocks.title).toHaveBeenCalledWith({ description: 'Mesa' });
    expect(controller.initialProductData).toMatchObject({ supplierId: 'supplier-1', costPrice: 0, stock: 0, unitPrice: 0, fiscal: { ncm: item.ncm, cfop: item.cfop } });
    expect(item.productDescription).toBe(' Mesa ');
  });
  it('nome inválido não abre o cadastro nem fecha o modal', async () => {
    mocks.title.mockResolvedValueOnce({ title: ' ' }); render(<Page />); fireEvent.click(screen.getByText('Preparar item')); fireEvent.click(screen.getByText('Abrir cadastro'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('nome válido')); expect(controller.isProductModalOpen).toBe(false); expect(mocks.categories).not.toHaveBeenCalled();
  });
  it('vínculo existente aguarda detalhes e usa IDs parseados sem criar produto', async () => {
    const details = deferred<{ linkedProductCode: string; productErpName: string }>(); mocks.details.mockReturnValueOnce(details.promise);
    mocks.find.mockResolvedValueOnce(new Map([['FORN-1', { productId: ' product-1 ', productVariationId: ' variation-1 ' }]]));
    render(<Page />); fireEvent.click(screen.getByText('Preparar item')); fireEvent.click(screen.getByText('Abrir cadastro'));
    await waitFor(() => expect(mocks.details).toHaveBeenCalledWith('product-1', 'variation-1')); expect(controller.individualBusy).toBe(true); expect(mocks.change).not.toHaveBeenCalled();
    await act(async () => { details.resolve({ linkedProductCode: 'ERP-1', productErpName: 'Mesa existente' }); });
    await waitFor(() => expect(controller.individualItem).toBeNull()); expect(mocks.change).toHaveBeenCalledWith(1, { matchedProductId: 'product-1', matchedVariationId: 'variation-1', linkedProductCode: 'ERP-1', productErpName: 'Mesa existente' });
    expect(mocks.title).not.toHaveBeenCalled(); expect(mocks.classify).not.toHaveBeenCalled(); expect(controller.isProductModalOpen).toBe(false);
  });
  it('associação sem produto encontrado fica visível como falha', async () => {
    mocks.find.mockResolvedValueOnce(new Map([['FORN-1', { productId: 'product-1' }]])); mocks.details.mockResolvedValueOnce(null);
    render(<Page />); fireEvent.click(screen.getByText('Preparar item')); fireEvent.click(screen.getByText('Abrir cadastro'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('não foi encontrado')); expect(mocks.change).not.toHaveBeenCalled(); expect(controller.individualItem).toBeTruthy();
  });
  it('classificação confirmada encerra a preparação e conserva a decisão para o proprietário distinto', async () => {
    const classification = { decision: 'EXISTING_VARIATION', matchedProductId: 'product-1', matchedVariationId: 'variation-1', normalizedParentName: 'Mesa',
      extractedAttributes: { color: null, measure: null, material: null }, confidence: 0.9, reasons: [] };
    mocks.context.mockResolvedValueOnce([{ id: 'product-1' }]); mocks.classify.mockResolvedValueOnce(classification);
    render(<Page />); fireEvent.click(screen.getByText('Preparar item')); fireEvent.click(screen.getByText('Abrir cadastro'));
    await waitFor(() => expect(controller.aiClassification).toEqual(classification)); expect(controller.individualItem).toBeNull(); expect(controller.isProductModalOpen).toBe(false);
    expect(mocks.classify).toHaveBeenCalledWith(expect.objectContaining({ itemDescription: 'Mesa', itemProductCode: 'FORN-1' })); expect(mocks.change).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it.each(['supplier', 'item'])('troca de %s durante consulta impede publicar resposta anterior', async (kind) => {
    const categories = deferred<{ categories: [] }>(); mocks.categories.mockReturnValueOnce(categories.promise);
    const view = render(<Page />); fireEvent.click(screen.getByText('Preparar item')); fireEvent.click(screen.getByText('Abrir cadastro'));
    await waitFor(() => expect(mocks.categories).toHaveBeenCalledOnce());
    view.rerender(kind === 'supplier' ? <Page supplierId="supplier-2" /> : <Page items={[{ ...item, productDescription: 'Outro item' }]} />);
    await act(async () => { categories.resolve({ categories: [] }); }); await waitFor(() => expect(controller.individualBusy).toBe(false));
    expect(controller.isProductModalOpen).toBe(false); expect(mocks.category).not.toHaveBeenCalled(); expect(mocks.change).not.toHaveBeenCalled(); expect(screen.getByRole('alert').textContent).toContain('contexto');
    fireEvent.click(screen.getByText('Cancelar')); fireEvent.click(screen.getByText('Preparar item')); expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(screen.getByText('Abrir cadastro')); await waitFor(() => expect(controller.isProductModalOpen).toBe(true));
  });
  it('prazo total libera a tela, permite nova consulta e descarta título tardio', async () => {
    vi.useFakeTimers(); const title = deferred<{ title: string }>(); mocks.title.mockReturnValueOnce(title.promise);
    render(<Page />); fireEvent.click(screen.getByText('Preparar item')); fireEvent.click(screen.getByText('Abrir cadastro'));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); }); expect(mocks.title).toHaveBeenCalledOnce();
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); }); expect(screen.getByRole('alert').textContent).toContain('demorou'); expect(controller.individualBusy).toBe(false);
    fireEvent.click(screen.getByText('Abrir cadastro')); await act(async () => { await vi.advanceTimersByTimeAsync(0); }); expect(controller.isProductModalOpen).toBe(true);
    await act(async () => { title.resolve({ title: 'Resposta antiga' }); }); expect(controller.initialProductData?.name).toBe('Mesa'); expect(mocks.categories).toHaveBeenCalledOnce();
  });
  it('consulta antiga não publica cache ou inicia IA após trocar fornecedor', async () => {
    const products = deferred<unknown[]>(); mocks.context.mockReturnValueOnce(products.promise);
    const view = render(<Page />); fireEvent.click(screen.getByText('Preparar item')); fireEvent.click(screen.getByText('Abrir cadastro'));
    await waitFor(() => expect(mocks.context).toHaveBeenCalledWith('supplier-1')); view.rerender(<Page supplierId="supplier-2" />);
    await act(async () => { products.resolve([{ id: 'product-old' }]); }); await waitFor(() => expect(controller.individualBusy).toBe(false)); expect(mocks.classify).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Cancelar')); fireEvent.click(screen.getByText('Preparar item')); fireEvent.click(screen.getByText('Abrir cadastro'));
    await waitFor(() => expect(controller.isProductModalOpen).toBe(true)); expect(mocks.context.mock.calls.map(([id]) => id)).toEqual(['supplier-1', 'supplier-2']);
  });
  it('desmontagem durante leitura impede a próxima etapa e qualquer publicação', async () => {
    const title = deferred<{ title: string }>(); mocks.title.mockReturnValueOnce(title.promise);
    const view = render(<Page />); fireEvent.click(screen.getByText('Preparar item')); fireEvent.click(screen.getByText('Abrir cadastro'));
    await waitFor(() => expect(mocks.title).toHaveBeenCalledOnce()); view.unmount(); await act(async () => { title.resolve({ title: 'Tardio' }); });
    expect(mocks.categories).not.toHaveBeenCalled(); expect(mocks.change).not.toHaveBeenCalled();
  });
});
