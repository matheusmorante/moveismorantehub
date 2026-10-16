// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useInboundInvoiceProductCreation, type UseInboundInvoiceProductCreationParams } from './useInboundInvoiceProductCreation';
import type Product from '@/pages/types/product.type';
const mocks = vi.hoisted(() => ({ full: vi.fn(), save: vi.fn(), find: vi.fn(), toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/pages/utils/productService', () => ({ getFullProduct: mocks.full, saveVariation: vi.fn() }));
vi.mock('@/pages/utils/productSupplierCodesService', () => ({ saveProductSupplierCode: mocks.save, findProductSupplierCodes: mocks.find }));
vi.mock('@/pages/utils/categoryService', () => ({ fetchGroupsAndCategories: vi.fn() }));
vi.mock('@/pages/utils/categoryResolutionService', () => ({ resolveAutoCategory: vi.fn() }));
vi.mock('@/pages/utils/aiService', () => ({ aiService: {} }));
vi.mock('@/pages/utils/inboundNfe/inboundItemProductResolver', () => ({ resolveLinkedProductDetails: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: mocks.toast }));
const product = { id: 'product-1', name: 'Mesa', variations: [{ id: 'variation-1', sku: '101-01', name: 'Mesa Azul' }] } as Product;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
function setup(overrides: Partial<UseInboundInvoiceProductCreationParams> = {}) {
  const params: UseInboundInvoiceProductCreationParams = {
    items: [{ itemNumber: 1, productCode: ' FORN-1 ', productDescription: ' Mesa ', quantity: 1, unitCost: 10, totalCost: 10, unit: 'UN', ncm: '', cfop: '' }],
    supplierId: ' supplier-1 ', onChange: vi.fn(), creatingItemNumber: 1, creatingVariationId: ' variation-1 ',
    setCreatingItemNumber: vi.fn(), setCreatingVariationId: vi.fn(), setIsPreparingProduct: vi.fn(), setSuggestedCategory: vi.fn(), setInitialProductData: vi.fn(), setIsProductModalOpen: vi.fn(),
    aiClassification: null, setAiClassification: vi.fn(), classifyingItem: null, classifyWithAI: vi.fn(), resetClassification: vi.fn(), effectiveMarkup: '', setIndividualMarkup: vi.fn(), ...overrides,
  };
  return { params, ...renderHook((props) => useInboundInvoiceProductCreation(props), { initialProps: params }) };
}
beforeEach(() => { vi.clearAllMocks(); mocks.full.mockReset().mockResolvedValue(product); mocks.save.mockReset().mockResolvedValue(undefined); mocks.find.mockReset().mockResolvedValue(new Map([['FORN-1', { productId: 'product-1', productVariationId: 'variation-1' }]])); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('resolver aguarda recarga, gravação, confirmação e aplicação antes de limpar o alvo', async () => {
  const save = deferred<void>(), apply = deferred<boolean>(); mocks.save.mockReturnValueOnce(save.promise); const change = vi.fn(() => apply.promise);
  const { result, params } = setup({ onChange: change }); let pending!: Promise<boolean>;
  await act(async () => { pending = result.current.handleCreatedProductFromModal({ ...product, id: ' product-1 ' }); });
  expect(mocks.full).toHaveBeenCalledWith('product-1'); expect(mocks.save).toHaveBeenCalledWith({ supplierId: 'supplier-1', productId: 'product-1', productVariationId: 'variation-1', supplierProductCode: 'FORN-1', supplierDescription: 'Mesa' });
  expect(params.setIsProductModalOpen).not.toHaveBeenCalled();
  await act(async () => { expect(await result.current.handleCreatedProductFromModal(product)).toBe(false); }); expect(mocks.save).toHaveBeenCalledOnce();
  await act(async () => { save.resolve(); }); expect(change).toHaveBeenCalledWith(1, { matchedProductId: 'product-1', matchedVariationId: 'variation-1', linkedProductCode: '101-01', productErpName: 'Mesa Azul' });
  expect(params.setCreatingItemNumber).not.toHaveBeenCalled(); await act(async () => { apply.resolve(true); expect(await pending).toBe(true); });
  expect(params.setCreatingItemNumber).toHaveBeenCalledWith(null); expect(params.setIsProductModalOpen).toHaveBeenCalledWith(false);
});
it.each(['productId', 'supplier', 'code', 'item'] as const)('resolver impede %s inválido antes da recarga', async (kind) => {
  const { result, params } = setup(kind === 'supplier' ? { supplierId: '' } : kind === 'code' ? { items: [{ itemNumber: 1, productCode: '', productDescription: 'Mesa' } as any] } : kind === 'item' ? { items: [] } : {});
  await act(async () => { expect(await result.current.handleCreatedProductFromModal(kind === 'productId' ? { ...product, id: '' } : product)).toBe(false); });
  expect(mocks.full).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled(); expect(params.setCreatingItemNumber).not.toHaveBeenCalled(); expect(mocks.toast.error).toHaveBeenCalled();
});
it.each([null, { ...product, id: 'other' }, { ...product, variations: [] }])('recarga sem produto/variação não usa fallback e preserva alvo', async (reloaded) => {
  mocks.full.mockResolvedValueOnce(reloaded); const { result, params } = setup();
  await act(async () => { expect(await result.current.handleCreatedProductFromModal(product)).toBe(false); });
  expect(mocks.save).not.toHaveBeenCalled(); expect(params.onChange).not.toHaveBeenCalled(); expect(params.setCreatingItemNumber).not.toHaveBeenCalled();
  await act(async () => { expect(await result.current.handleCreatedProductFromModal(product)).toBe(true); });
});
it.each(['missingAck', 'wrongVariation', 'applyFailed', 'saveFailed'] as const)('falha %s conserva alvo e bloqueia repetição da escrita', async (stage) => {
  if (stage === 'missingAck') mocks.find.mockResolvedValueOnce(new Map());
  if (stage === 'wrongVariation') mocks.find.mockResolvedValueOnce(new Map([['FORN-1', { productId: 'product-1', productVariationId: 'other' }]]));
  if (stage === 'saveFailed') mocks.save.mockRejectedValueOnce(new Error('Conexão'));
  const { result, params } = setup(stage === 'applyFailed' ? { onChange: vi.fn().mockResolvedValue(false) } : {});
  await act(async () => { expect(await result.current.handleCreatedProductFromModal(product)).toBe(false); });
  expect(params.setCreatingItemNumber).not.toHaveBeenCalled(); expect(mocks.toast.success).not.toHaveBeenCalled();
  await act(async () => { expect(await result.current.handleCreatedProductFromModal(product)).toBe(false); }); expect(mocks.save).toHaveBeenCalledOnce();
});
it('troca de fornecedor durante recarga impede iniciar gravação', async () => {
  const full = deferred<Product>(); mocks.full.mockReturnValueOnce(full.promise); const { result, rerender, params } = setup(); let pending!: Promise<boolean>;
  await act(async () => { pending = result.current.handleCreatedProductFromModal(product); }); rerender({ ...params, supplierId: 'supplier-2' });
  await act(async () => { full.resolve(product); expect(await pending).toBe(false); }); expect(mocks.save).not.toHaveBeenCalled(); expect(params.setCreatingItemNumber).not.toHaveBeenCalled();
});
it('timeout de gravação não aplica resposta tardia nem limpa o formulário', async () => {
  vi.useFakeTimers(); const save = deferred<void>(); mocks.save.mockReturnValueOnce(save.promise); const { result, params } = setup(); let pending!: Promise<boolean>;
  await act(async () => { pending = result.current.handleCreatedProductFromModal(product); });
  await act(async () => { await vi.advanceTimersByTimeAsync(20001); expect(await pending).toBe(false); });
  await act(async () => { save.resolve(); }); expect(params.onChange).not.toHaveBeenCalled(); expect(params.setCreatingItemNumber).not.toHaveBeenCalled(); expect(mocks.find).not.toHaveBeenCalled();
});
