// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InboundInvoiceItemsReview } from './InboundInvoiceItemsReview';
import { prepareExistingParentNewVariation, prepareNewParentWithVariation } from '../services/inboundProductPreparationService';
import type Product from '@/pages/types/product.type';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';

const mocks = vi.hoisted(() => ({
  full: vi.fn(), code: vi.fn(), categories: vi.fn(), category: vi.fn(), change: vi.fn(),
  productModal: vi.fn(), save: vi.fn(), toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {}, isTestEnvironment: false }));
vi.mock('@/pages/utils/personService', () => ({ fetchPersons: vi.fn().mockResolvedValue([]) }));
vi.mock('@/pages/utils/productService', () => ({ getFullProduct: mocks.full, saveProduct: mocks.save, saveVariation: mocks.save }));
vi.mock('@/pages/utils/productService/productSkuService', () => ({ getNextSequentialProductCode: mocks.code, generateVariationSku: (code: string) => `${code}-01` }));
vi.mock('@/pages/utils/categoryService', () => ({ fetchGroupsAndCategories: mocks.categories }));
vi.mock('@/pages/utils/categoryResolutionService', () => ({ resolveAutoCategory: mocks.category }));
vi.mock('@/pages/utils/aiService', () => ({ aiService: {} }));
vi.mock('@/pages/utils/productSupplierCodesService', () => ({ findProductSupplierCodes: vi.fn().mockResolvedValue(new Map()), saveProductSupplierCode: mocks.save, deleteProductSupplierCode: mocks.save }));
vi.mock('@/pages/utils/inboundNfe/inboundSupplierProductContext', () => ({ fetchSupplierProductsForContext: vi.fn().mockResolvedValue([]), buildSupplierContextSummary: vi.fn() }));
vi.mock('../hooks/useInboundInvoiceSuggestions', () => ({ useInboundInvoiceSuggestions: () => ({ suggestionFor: () => undefined, rejectSuggestion: vi.fn(), isProcessingSuggestions: false, isItemProcessing: () => false, retrySuggestions: vi.fn() }) }));
vi.mock('react-toastify', () => ({ toast: mocks.toast }));
vi.mock('@/pages/App/Products/modals/ProductFormModal', () => ({ default: (props: { isOpen: boolean; product?: Product; initialData?: Partial<Product> }) => {
  mocks.productModal(props);
  return props.isOpen ? <output aria-label="Produto aberto">{JSON.stringify(props.product || props.initialData)}</output> : null;
} }));
vi.mock('@/components/ProductAutocomplete', () => ({ default: (props: { disabled?: boolean; onSelect: (product: Partial<Product>) => void; onChange?: (value: string) => void }) => <>
  <input aria-label="Buscar produto pai" disabled={props.disabled} onChange={(event) => props.onChange?.(event.target.value)} />
  <button type="button" disabled={props.disabled} onClick={() => props.onSelect({ id: ' parent-1 ', name: 'Pai' })}>Selecionar pai</button>
</> }));

const item: InboundInvoiceItem = { itemNumber: 1, productDescription: ' Mesa ', productCode: ' FORN-1 ', unit: ' UN ', quantity: 2, unitCost: 10, totalCost: 20, ncm: '94036000', cfop: '1102' };
const parent = { id: 'parent-1', name: 'Pai', code: '100', unitPrice: 50, supplierId: 'supplier-1', itemType: 'product', variations: [] } as unknown as Product;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
function Page({ items = [item], supplierId = ' supplier-1 ' }: { items?: InboundInvoiceItem[]; supplierId?: string }) {
  return <InboundInvoiceItemsReview items={items} supplierId={supplierId} suppliers={[]} onChange={mocks.change} suggestionsEnabled={false} />;
}
function open(mode: 'new' | 'existing' = 'new') {
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));
  if (mode === 'new') fireEvent.click(screen.getByRole('button', { name: /Novo Produto Pai/ }));
  else fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Selecionar pai' }));
}
function submit() { fireEvent.click(screen.getByRole('button', { name: 'Abrir Cadastramento' })); }
function prepared() { return JSON.parse(screen.getByLabelText('Produto aberto').textContent!); }
beforeEach(() => {
  vi.clearAllMocks(); mocks.full.mockReset().mockResolvedValue(parent); mocks.code.mockReset().mockResolvedValue('101');
  mocks.categories.mockReset().mockResolvedValue({ categories: [] }); mocks.category.mockReset().mockResolvedValue(null);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('cadastro rápido pela linha e proprietário reais, RHF e serviços de preparação reais', () => {
  it('exibe erro do resolver sem consultar quando falta selecionar pai', async () => {
    render(<Page />); fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' })); submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Selecione o produto pai'));
    expect(mocks.full).not.toHaveBeenCalled(); expect(mocks.code).not.toHaveBeenCalled();
  });
  it.each(['new', 'existing'] as const)('aguarda preparação %s, bloqueia repetição/fechamento e abre produto só após resultado', async (mode) => {
    const pending = deferred<unknown>();
    if (mode === 'new') mocks.code.mockReturnValueOnce(pending.promise); else mocks.full.mockReturnValueOnce(pending.promise);
    render(<Page />); open(mode); submit();
    await waitFor(() => expect(mode === 'new' ? mocks.code : mocks.full).toHaveBeenCalledOnce());
    expect(screen.getByRole('status').textContent).toContain('Preparando'); expect(screen.queryByLabelText('Produto aberto')).toBeNull();
    const dialog = screen.getByRole('dialog'); expect(dialog.querySelector('form')?.getAttribute('aria-busy')).toBe('true');
    for (const button of within(dialog).getAllByRole('button')) expect((button as HTMLButtonElement).disabled || (button.closest('fieldset') as HTMLFieldSetElement | null)?.disabled).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' }); fireEvent.click(screen.getByText('Cancelar')); submit();
    expect(screen.getByRole('dialog')).toBeTruthy(); expect(mode === 'new' ? mocks.code : mocks.full).toHaveBeenCalledOnce();
    await act(async () => { pending.resolve(mode === 'new' ? '101' : parent); });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(prepared()).toMatchObject({ variations: [expect.objectContaining({ costPrice: 10, stock: 0 })] });
    if (mode === 'new') expect(prepared()).toMatchObject({ supplierId: 'supplier-1', name: 'Mesa', supplierRef: 'FORN-1' });
    else expect(mocks.full).toHaveBeenCalledWith('parent-1');
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.change).not.toHaveBeenCalled();
  });
  it.each(['quantity', 'cost', 'description'] as const)('payload inválido %s é bloqueado antes do I/O', async (kind) => {
    const invalid = { ...item, ...(kind === 'quantity' ? { quantity: 0 } : kind === 'cost' ? { unitCost: -1 } : { productDescription: ' ' }) };
    render(<Page items={[invalid]} />); open(); submit();
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy()); expect(mocks.code).not.toHaveBeenCalled(); expect(mocks.full).not.toHaveBeenCalled();
  });
  it.each([null, { ...parent, id: 'other' }, { ...parent, deleted: true }, { ...parent, isVariation: true }, { ...parent, active: false }])('pai ausente ou indisponível não abre produto', async (value) => {
    mocks.full.mockResolvedValueOnce(value); render(<Page />); open('existing'); submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Produto pai não encontrado'));
    expect(screen.queryByLabelText('Produto aberto')).toBeNull(); submit();
    await waitFor(() => expect(screen.getByLabelText('Produto aberto')).toBeTruthy());
  });
  it('erro preserva modal e seleção para repetição explícita', async () => {
    mocks.code.mockRejectedValueOnce(new Error('Consulta indisponível')); render(<Page />); open(); submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Consulta indisponível'));
    expect((screen.getByRole('button', { name: 'Abrir Cadastramento' }) as HTMLButtonElement).disabled).toBe(false);
    submit(); await waitFor(() => expect(screen.getByLabelText('Produto aberto')).toBeTruthy());
  });
  it('digitar após selecionar invalida o pai anterior', async () => {
    render(<Page />); open('existing'); fireEvent.change(within(screen.getByRole('dialog')).getByLabelText('Buscar produto pai'), { target: { value: 'Outro' } }); submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Selecione o produto pai')); expect(mocks.full).not.toHaveBeenCalled();
  });
  it('pai que deixou o fornecedor não é usado; vínculo secundário continua aceito', async () => {
    mocks.full.mockResolvedValueOnce({ ...parent, supplierId: 'supplier-2' }).mockResolvedValueOnce({ ...parent, supplierId: 'supplier-2', supplierIds: ['supplier-1'] });
    render(<Page />); open('existing'); submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('não pertence mais ao fornecedor'));
    expect(screen.queryByLabelText('Produto aberto')).toBeNull(); submit();
    await waitFor(() => expect(screen.getByLabelText('Produto aberto')).toBeTruthy());
  });
  it('trava o fechamento desde o início da validação do resolver', async () => {
    const pending = deferred<string>(); mocks.code.mockReturnValueOnce(pending.promise);
    render(<Page />); open(); submit(); fireEvent.keyDown(window, { key: 'Escape' }); fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.getByRole('dialog')).toBeTruthy(); await waitFor(() => expect(mocks.code).toHaveBeenCalledOnce());
    await act(async () => { pending.resolve('101'); }); await waitFor(() => expect(screen.getByLabelText('Produto aberto')).toBeTruthy());
  });
  it('desmontagem impede continuar consultas da preparação', async () => {
    const pending = deferred<string>(); mocks.code.mockReturnValueOnce(pending.promise);
    const view = render(<Page />); open(); submit(); await waitFor(() => expect(mocks.code).toHaveBeenCalledOnce());
    view.unmount(); await act(async () => { pending.resolve('101'); }); expect(mocks.categories).not.toHaveBeenCalled();
  });
  it('troca de fornecedor e retorno ao anterior não revive a resposta antiga', async () => {
    const pending = deferred<string>(); mocks.code.mockReturnValueOnce(pending.promise);
    const view = render(<Page />); open(); submit(); await waitFor(() => expect(mocks.code).toHaveBeenCalledOnce());
    view.rerender(<Page supplierId="supplier-2" />); view.rerender(<Page />);
    await act(async () => { pending.resolve('101'); });
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull()); expect(screen.queryByLabelText('Produto aberto')).toBeNull(); expect(mocks.categories).not.toHaveBeenCalled();
  });
  it.each(['supplier', 'item', 'removed'] as const)('mudança de %s descarta resultado e impede próximas etapas', async (kind) => {
    const pending = deferred<string>(); mocks.code.mockReturnValueOnce(pending.promise);
    const view = render(<Page />); open(); submit(); await waitFor(() => expect(mocks.code).toHaveBeenCalledOnce());
    view.rerender(<Page supplierId={kind === 'supplier' ? 'supplier-2' : ' supplier-1 '} items={kind === 'removed' ? [] : kind === 'item' ? [{ ...item, quantity: 3 }] : [item]} />);
    await act(async () => { pending.resolve('101'); });
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull()); expect(screen.queryByLabelText('Produto aberto')).toBeNull(); expect(mocks.categories).not.toHaveBeenCalled();
  });
  it.each(['code', 'categories', 'full'] as const)('prazo em %s libera formulário e impede publicação/continuação tardia', async (stage) => {
    const pending = deferred<unknown>(); mocks[stage].mockReturnValueOnce(pending.promise);
    vi.useFakeTimers();
    render(<Page />); open(stage === 'full' ? 'existing' : 'new'); submit();
    await act(async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); });
    expect(mocks[stage]).toHaveBeenCalledOnce();
    await act(async () => { await vi.advanceTimersByTimeAsync(20001); });
    expect(screen.getByRole('alert').textContent).toContain('demorou demais');
    await act(async () => { pending.resolve(stage === 'full' ? parent : stage === 'code' ? '101' : { categories: [] }); });
    expect(screen.queryByLabelText('Produto aberto')).toBeNull(); expect(mocks.category).not.toHaveBeenCalled();
  });
  it.each(['new', 'existing'] as const)('preparação %s preserva custo final zero mesmo com custo base positivo', async (mode) => {
    const payload = { productDescription: 'Mesa', unitCost: 10, finalCost: 0 };
    const result = mode === 'new' ? await prepareNewParentWithVariation(payload, 'supplier-1') : await prepareExistingParentNewVariation(parent, payload);
    expect(result.variations?.[0].costPrice).toBe(0);
  });
});
