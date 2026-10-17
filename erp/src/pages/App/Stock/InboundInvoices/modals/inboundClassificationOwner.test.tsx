// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ full: vi.fn(), variation: vi.fn(), code: vi.fn(), find: vi.fn(), details: vi.fn(), change: vi.fn(), reset: vi.fn(), success: vi.fn(), title: vi.fn(), open: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));
vi.mock('@/pages/utils/productService', () => ({ getFullProduct: mocks.full, saveVariation: mocks.variation }));
vi.mock('@/pages/utils/productSupplierCodesService', () => ({ findProductSupplierCodes: mocks.find, saveProductSupplierCode: mocks.code }));
vi.mock('@/pages/utils/categoryService', () => ({ fetchGroupsAndCategories: vi.fn().mockResolvedValue({ categories: [] }) }));
vi.mock('@/pages/utils/categoryResolutionService', () => ({ resolveAutoCategory: vi.fn().mockResolvedValue(null) }));
vi.mock('@/pages/utils/aiService', () => ({ aiService: { generateMarketplaceTitle: mocks.title } }));
vi.mock('@/pages/utils/inboundNfe/inboundItemProductResolver', () => ({ resolveLinkedProductDetails: mocks.details }));
vi.mock('react-toastify', () => ({ toast: { success: mocks.success, error: vi.fn(), info: vi.fn() } }));
import { useInboundInvoiceProductCreation } from '../hooks/useInboundInvoiceProductCreation';
import { InboundClassificationModals } from './InboundClassificationModals';
import { fetchGroupsAndCategories } from '@/pages/utils/categoryService';
import { resolveAutoCategory } from '@/pages/utils/categoryResolutionService';
const item = { itemNumber: 1, productCode: 'FORN-1', productDescription: 'Mesa', quantity: 2, unit: 'UN', unitCost: 10, totalCost: 20, ncm: '94036000', cfop: '1102' };
const classification = { decision: 'NEW_VARIATION_OF_EXISTING_PRODUCT' as const, matchedProductId: 'parent', matchedVariationId: null, normalizedParentName: 'Mesa', extractedAttributes: { color: null, measure: null, material: null }, confidence: 0.9, reasons: [] };
const deferred = () => { let resolve!: (value: any) => void; const promise = new Promise<any>(yes => { resolve = yes; }); return { promise, resolve }; };
function Owner({ currentItem = item, proposal = classification as any, supplierId = 'supplier', markup = '50', contextKey = 'invoice' }: any) {
  const owner = useInboundInvoiceProductCreation({ items: [currentItem], supplierId, contextKey, onChange: mocks.change, setCreatingItemNumber: vi.fn(), setCreatingVariationId: vi.fn(), setIsPreparingProduct: vi.fn(), setSuggestedCategory: vi.fn(), setInitialProductData: vi.fn(), setIsProductModalOpen: mocks.open, creatingItemNumber: null, creatingVariationId: null, aiClassification: proposal, setAiClassification: vi.fn(), classifyingItem: currentItem, classifyWithAI: vi.fn(), resetClassification: mocks.reset, effectiveMarkup: markup, setIndividualMarkup: vi.fn() });
  return <InboundClassificationModals isPreparingProduct={false} isClassifying={false} classifyingItem={currentItem} aiClassification={proposal} effectiveMarkup={markup} onEffectiveMarkupChange={vi.fn()} onConfirmExistingVariation={owner.confirmExistingVariationLink} onConfirmNewVariation={owner.confirmNewVariationInFamily} onDiscardAndCreateNew={owner.discardClassificationAndCreateNew} {...({ isBusy: (owner as any).classificationBusy, error: (owner as any).classificationError } as any)} />;
}
beforeEach(() => {
  vi.resetAllMocks(); mocks.title.mockResolvedValue({ title: 'Mesa' }); mocks.full.mockResolvedValue({ id: 'parent', name: 'Mesa', variations: [] }); mocks.variation.mockResolvedValue(undefined); mocks.code.mockResolvedValue(undefined); mocks.change.mockResolvedValue(true); mocks.details.mockResolvedValue({ linkedProductCode: '100-01', productErpName: 'Mesa' });
  vi.mocked(fetchGroupsAndCategories).mockResolvedValue({ categories: [], groups: [] }); vi.mocked(resolveAutoCategory).mockResolvedValue(null);
  mocks.find.mockImplementation(async () => new Map([['FORN-1', { productId: 'parent', productVariationId: mocks.variation.mock.calls[0]?.[1].id }]]));
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
const confirm = () => fireEvent.click(screen.getByRole('button', { name: /Cadastrar variação no produto pai/ }));
describe('inbound classification owner', () => {
  it('waits for the item callback before announcing success or resetting the proposal', async () => {
    const pending = deferred(); mocks.change.mockReturnValue(pending.promise); render(<Owner />); confirm();
    await waitFor(() => expect(mocks.change).toHaveBeenCalledOnce()); expect(mocks.reset).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled();
    await act(async () => { pending.resolve(true); }); expect(mocks.reset).toHaveBeenCalledOnce();
  });
  it('blocks a missing supplier code before creating a variation', async () => {
    render(<Owner currentItem={{ ...item, productCode: '' }} />); confirm(); await screen.findByRole('alert'); expect(mocks.variation).not.toHaveBeenCalled();
  });
  it('does not apply a proposed existing link when the product cannot be resolved', async () => {
    mocks.details.mockResolvedValue(null); render(<Owner proposal={{ ...classification, decision: 'EXISTING_VARIATION', matchedVariationId: 'variation' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Vincular à variação existente' })); await screen.findByRole('alert'); expect(mocks.change).not.toHaveBeenCalled(); expect(mocks.reset).not.toHaveBeenCalled();
  });
  it.each(['', '-1', 'bad', 'Infinity'])('rejects invalid markup %s before the product query or mutation', async markup => {
    render(<Owner markup={markup} />); confirm(); await screen.findByRole('alert'); expect(mocks.full).not.toHaveBeenCalled(); expect(mocks.variation).not.toHaveBeenCalled();
  });
  it('sends parsed input and the same generated variation identity through every stage', async () => {
    render(<Owner currentItem={{ ...item, productDescription: '  Mesa  ', productCode: ' FORN-1 ' }} markup=" 25,5 " />); confirm(); await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce());
    const variation = mocks.variation.mock.calls[0][1]; expect(variation).toMatchObject({ name: 'Mesa', unitPrice: 12.55, costPrice: 10, stock: 0 });
    expect(mocks.code.mock.calls[0][0]).toMatchObject({ productVariationId: variation.id, supplierProductCode: 'FORN-1', supplierDescription: 'Mesa' });
    expect(mocks.change.mock.calls[0][1]).toMatchObject({ matchedProductId: 'parent', matchedVariationId: variation.id });
  });
  it('blocks duplicate confirms, discard, backdrop and Escape through the shared owner while saving', async () => {
    const pending = deferred(); mocks.variation.mockReturnValue(pending.promise); render(<Owner />);
    act(() => { confirm(); confirm(); }); await waitFor(() => expect(mocks.variation).toHaveBeenCalledOnce());
    expect(screen.getByRole('status')).toBeTruthy(); expect(screen.getByRole('button', { name: /Criar como produto independente/ })).toHaveProperty('disabled', true);
    fireEvent.keyDown(window, { key: 'Escape' }); expect(mocks.reset).not.toHaveBeenCalled();
    await act(async () => { pending.resolve(undefined); }); await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce());
  });
  it('rejects a contradictory parent receipt before starting a variation', async () => {
    mocks.full.mockResolvedValue({ id: 'other', name: 'Outra' }); render(<Owner />); confirm(); await screen.findByRole('alert'); expect(mocks.variation).not.toHaveBeenCalled();
  });
  it('keeps an acknowledged variation and retries only a known supplier-code refusal', async () => {
    mocks.code.mockRejectedValueOnce(Object.assign(new Error('Código recusado'), { code: '23514' })); render(<Owner />); confirm(); await screen.findByRole('alert');
    expect(mocks.reset).not.toHaveBeenCalled(); confirm(); await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce());
    expect(mocks.variation).toHaveBeenCalledOnce(); expect(mocks.code).toHaveBeenCalledTimes(2); expect(mocks.code.mock.calls[0][0].productVariationId).toBe(mocks.code.mock.calls[1][0].productVariationId);
  });
  it('retries only confirmation reads after the code write is already acknowledged', async () => {
    mocks.find.mockResolvedValueOnce(new Map()); render(<Owner />); confirm(); await screen.findByRole('alert'); expect(mocks.change).not.toHaveBeenCalled();
    confirm(); await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce()); expect(mocks.variation).toHaveBeenCalledOnce(); expect(mocks.code).toHaveBeenCalledOnce(); expect(mocks.find).toHaveBeenCalledTimes(2);
  });
  it('retries only applying the known link after a parent callback refuses it', async () => {
    mocks.change.mockResolvedValueOnce(false); render(<Owner />); confirm(); await screen.findByRole('alert'); expect(mocks.reset).not.toHaveBeenCalled();
    confirm(); await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce()); expect(mocks.variation).toHaveBeenCalledOnce(); expect(mocks.code).toHaveBeenCalledOnce(); expect(mocks.find).toHaveBeenCalledOnce(); expect(mocks.change).toHaveBeenCalledTimes(2);
  });
  it('does not create a second variation when markup changes after a known partial save', async () => {
    mocks.change.mockResolvedValue(false); const view = render(<Owner />); confirm(); await screen.findByRole('alert'); view.rerender(<Owner markup="60" />); confirm();
    await screen.findByRole('alert'); expect(mocks.variation).toHaveBeenCalledOnce(); expect(mocks.change).toHaveBeenCalledOnce();
  });
  it('does not create an independent product after an acknowledged family variation', async () => {
    mocks.change.mockResolvedValue(false); render(<Owner />); confirm(); await screen.findByRole('alert'); fireEvent.click(screen.getByRole('button', { name: /Criar como produto independente/ }));
    await screen.findByRole('alert'); expect(mocks.variation).toHaveBeenCalledOnce(); expect(mocks.reset).not.toHaveBeenCalled();
  });
  it('blocks replay after an uncertain variation response', async () => {
    mocks.variation.mockRejectedValue(new Error('Lost response')); render(<Owner />); confirm(); await screen.findByRole('alert'); confirm(); await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/sem confirmação/)); expect(mocks.variation).toHaveBeenCalledOnce(); expect(mocks.code).not.toHaveBeenCalled();
  });
  it('bounds a stalled variation, keeps the proposal and does not continue when the response arrives late', async () => {
    vi.useFakeTimers(); const pending = deferred(); mocks.variation.mockReturnValue(pending.promise); render(<Owner />); await act(async () => { confirm(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(20_001); }); expect(screen.queryByRole('status')).toBeNull(); expect(mocks.reset).not.toHaveBeenCalled(); expect(mocks.code).not.toHaveBeenCalled();
    await act(async () => { pending.resolve(undefined); }); expect(mocks.code).not.toHaveBeenCalled(); confirm(); expect(mocks.variation).toHaveBeenCalledOnce();
  });
  it.each(['supplier', 'item', 'proposal', 'invoice'] as const)('does not start a write after %s changes during the parent query', async change => {
    const pending = deferred(); mocks.full.mockReturnValue(pending.promise); const view = render(<Owner />); confirm(); await waitFor(() => expect(mocks.full).toHaveBeenCalledOnce());
    view.rerender(<Owner supplierId={change === 'supplier' ? 'another' : 'supplier'} currentItem={change === 'item' ? { ...item, productDescription: 'Outra mesa' } : item} proposal={change === 'proposal' ? { ...classification, matchedProductId: 'other' } : classification} contextKey={change === 'invoice' ? 'another-invoice' : 'invoice'} />);
    await act(async () => { pending.resolve({ id: 'parent', name: 'Mesa' }); }); expect(mocks.variation).not.toHaveBeenCalled(); expect(mocks.change).not.toHaveBeenCalled(); expect(mocks.reset).not.toHaveBeenCalled();
  });
  it('does not continue to supplier linking after unmounting during a variation write', async () => {
    const pending = deferred(); mocks.variation.mockReturnValue(pending.promise); const view = render(<Owner />); confirm(); await waitFor(() => expect(mocks.variation).toHaveBeenCalledOnce()); view.unmount();
    await act(async () => { pending.resolve(undefined); }); expect(mocks.code).not.toHaveBeenCalled(); expect(mocks.reset).not.toHaveBeenCalled();
  });
  it('keeps existing-link resolution and callback in the resolver until confirmation', async () => {
    const pending = deferred(); mocks.change.mockReturnValue(pending.promise); render(<Owner proposal={{ ...classification, decision: 'EXISTING_VARIATION', matchedVariationId: 'variation' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Vincular à variação existente' })); await waitFor(() => expect(mocks.change).toHaveBeenCalledOnce()); expect(mocks.reset).not.toHaveBeenCalled(); expect(mocks.change.mock.calls[0][1]).toMatchObject({ matchedProductId: 'parent', matchedVariationId: 'variation', linkedProductCode: '100-01' });
    await act(async () => { pending.resolve(true); }); expect(mocks.reset).toHaveBeenCalledOnce(); expect(mocks.variation).not.toHaveBeenCalled();
  });
  it('keeps independent preparation in the resolver and allows an incomplete markup draft', async () => {
    const pending = deferred(); mocks.title.mockReturnValue(pending.promise); render(<Owner markup="" />); fireEvent.click(screen.getByRole('button', { name: /Criar como produto independente/ }));
    await waitFor(() => expect(mocks.title).toHaveBeenCalledOnce()); expect(mocks.open).not.toHaveBeenCalled(); expect(mocks.reset).not.toHaveBeenCalled();
    await act(async () => { pending.resolve({ title: 'Mesa preparada' }); }); await waitFor(() => expect(mocks.open).toHaveBeenCalledWith(true)); expect(mocks.reset).toHaveBeenCalledOnce(); expect(mocks.variation).not.toHaveBeenCalled();
  });
  it('bounds independent preparation and discards a late title without opening the product form', async () => {
    vi.useFakeTimers(); const pending = deferred(); mocks.title.mockReturnValue(pending.promise); render(<Owner />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Criar como produto independente/ })); }); await act(async () => { await vi.advanceTimersByTimeAsync(60_001); });
    expect(screen.getByRole('alert').textContent).toMatch(/prazo/); expect(screen.queryByRole('status')).toBeNull();
    await act(async () => { pending.resolve({ title: 'Mesa tardia' }); }); expect(mocks.open).not.toHaveBeenCalled();
  });
  it('requires a valid supplier and proposal payload before discarding and preparing a new product', async () => {
    render(<Owner supplierId="" />); fireEvent.click(screen.getByRole('button', { name: /Criar como produto independente/ })); await screen.findByRole('alert'); expect(mocks.title).not.toHaveBeenCalled();
  });
  it('discards invalid AI metadata without making it a requirement of the independent draft', async () => {
    render(<Owner proposal={{ ...classification, confidence: 5 }} />); fireEvent.click(screen.getByRole('button', { name: /Criar como produto independente/ })); await waitFor(() => expect(mocks.open).toHaveBeenCalledWith(true)); expect(mocks.variation).not.toHaveBeenCalled();
  });
  it('validates AI metadata before accepting a family link', async () => {
    render(<Owner proposal={{ ...classification, confidence: 5 }} />); confirm(); await screen.findByRole('alert'); expect(mocks.variation).not.toHaveBeenCalled(); expect(mocks.full).not.toHaveBeenCalled();
  });
  it('retains progress for the original item after another item is prepared in the same owner', async () => {
    mocks.change.mockResolvedValue(false); const view = render(<Owner />); confirm(); await screen.findByRole('alert');
    view.rerender(<Owner currentItem={{ ...item, itemNumber: 2, productCode: 'FORN-2' }} />); confirm(); await waitFor(() => expect(mocks.variation).toHaveBeenCalledTimes(2));
    view.rerender(<Owner />); mocks.change.mockResolvedValue(true); confirm(); await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce()); expect(mocks.variation).toHaveBeenCalledTimes(2);
  });
});
