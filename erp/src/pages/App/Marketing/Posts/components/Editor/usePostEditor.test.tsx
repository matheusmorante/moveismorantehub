// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ products: vi.fn(), product: vi.fn(), bounds: vi.fn(), templates: vi.fn(), save: vi.fn(), compose: vi.fn(), user: { id: 'operator' } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/pages/utils/productService', () => ({ fetchProductsPage: mocks.products, getFullProduct: mocks.product }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: () => { const query = { select: () => query, eq: async () => ({ data: [], error: null }) }; return query; } } }));
vi.mock('../../services/imageSubjectBounds', () => ({ detectImageSubjectBounds: mocks.bounds }));
vi.mock('../../services/templateService', () => ({ templateService: { getAll: mocks.templates, save: mocks.save } }));
vi.mock('../../services/compositionAi', () => ({ composeWithAi: mocks.compose }));
import { usePostEditor } from './usePostEditor';
import { PreviewProductPicker } from '../PreviewProductPicker';
import { compositionTemplate } from '../../services/compositionDefaults';
const product = { id: 'product', name: 'Mesa', unitPrice: 100, images: ['https://images.example/photo.png'] };
const preference = 'morante_post_creator_default_preview_product_id';
const deferred = () => { let resolve!: (value: any) => void; const promise = new Promise<any>((yes) => { resolve = yes; }); return { promise, resolve }; };
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear(); mocks.user = { id: 'operator' }; mocks.products.mockResolvedValue({ data: [product], total: 1 }); mocks.product.mockResolvedValue(product); mocks.bounds.mockResolvedValue(undefined); mocks.templates.mockResolvedValue([]);
  mocks.save.mockImplementation(async (values) => ({ ...values, campaignId: values.campaignId || null, persistedRemotely: true })); mocks.compose.mockResolvedValue({ layers: compositionTemplate.layers, slogan: 'Sua mesa', validation: { valid: true, score: 100 }, repaired: false }); vi.stubGlobal('prompt', vi.fn(() => ' Modelo '));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('post editor owner', () => {
  it('parses the search and composes the real product picker with confirmed selection', async () => {
    function Owner() { const editor = usePostEditor(); return <><PreviewProductPicker search={editor.search} products={editor.products} selected={editor.product} loading={editor.loading} onSearch={editor.setSearch} onSelect={editor.selectProduct} />{editor.message && <p role="alert">{editor.message}</p>}</>; }
    render(<Owner />); fireEvent.focus(screen.getByPlaceholderText('Buscar produto')); fireEvent.change(screen.getByPlaceholderText('Buscar produto'), { target: { value: ' Mesa ' } });
    await screen.findByRole('button', { name: 'Mesa' }); expect(mocks.products).toHaveBeenLastCalledWith(1, 30, { activeOnly: true, isDraft: false, search: 'Mesa' });
    fireEvent.click(screen.getByRole('button', { name: 'Mesa' })); await screen.findByText('Produto selecionado'); expect(localStorage.getItem(preference)).toBe('product');
  });
  it('ignores a stale search and rejects invalid pagination before dispatch', async () => {
    vi.useFakeTimers(); const pending = deferred(); mocks.products.mockReturnValueOnce(pending.promise).mockResolvedValue({ data: [], total: 0 }); const { result } = renderHook(() => usePostEditor());
    await act(async () => { await vi.advanceTimersByTimeAsync(250); }); act(() => result.current.setSearch('Other'));
    await act(async () => { await vi.advanceTimersByTimeAsync(250); pending.resolve({ data: [product], total: 1 }); }); expect(result.current.products).toEqual([]);
    act(() => result.current.setPage(0)); await act(async () => { await vi.advanceTimersByTimeAsync(250); }); expect(mocks.products).toHaveBeenCalledTimes(2); expect(result.current.message).toBeTruthy();
  });
  it('bounds a product read and preserves the existing selection after failure', async () => {
    const { result } = renderHook(() => usePostEditor()); await act(async () => { await result.current.selectProduct(' product '); }); expect(result.current.product?.id).toBe('product');
    await waitFor(() => expect(result.current.loading).toBe(false)); vi.useFakeTimers(); mocks.product.mockReturnValue(new Promise(() => {})); let pending: any; act(() => { pending = result.current.selectProduct('other'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(20_001); await pending; }); expect(result.current.product?.id).toBe('product'); expect(result.current.loading).toBe(false); expect(result.current.message).toMatch(/não foi confirmado/);
  });
  it('never selects a mismatched product receipt or clears a failed local preference', async () => {
    const { result } = renderHook(() => usePostEditor()); await act(async () => { expect(await result.current.selectProduct('other')).toBe(false); }); expect(result.current.product).toBeNull();
    await act(async () => { await result.current.selectProduct('product'); }); vi.stubGlobal('localStorage', { getItem: () => 'product', removeItem: () => {} });
    await act(async () => { expect(await result.current.selectProduct('')).toBe(false); }); expect(result.current.product?.id).toBe('product');
  });
  it('discards a previous product response when a newer selection was requested', async () => {
    const pending = deferred(); mocks.product.mockReturnValueOnce(pending.promise).mockResolvedValueOnce({ ...product, id: 'other', name: 'Sofá' }); const { result } = renderHook(() => usePostEditor()); let first: any, second: any;
    act(() => { first = result.current.selectProduct('product'); }); await waitFor(() => expect(mocks.product).toHaveBeenCalledOnce()); act(() => { second = result.current.selectProduct('other'); });
    await act(async () => { pending.resolve(product); await first; await second; }); expect(result.current.product?.id).toBe('other');
  });
  it('requires a valid template and awaits its actual receipt before replacing state', async () => {
    const pending = deferred(); mocks.save.mockReturnValue(pending.promise); const { result } = renderHook(() => usePostEditor()); let save: any;
    act(() => { save = result.current.save(); }); await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce()); expect(result.current.busy).toBe('save'); expect(mocks.save.mock.calls[0][0].name).toBe('Modelo');
    act(() => { void result.current.save(); }); expect(mocks.save).toHaveBeenCalledOnce();
    await act(async () => { pending.resolve({ ...mocks.save.mock.calls[0][0], campaignId: null, persistedRemotely: true }); await save; }); expect(result.current.message).toBe('Template salvo.');
    vi.mocked(prompt).mockReturnValue('  '); await act(async () => { await result.current.save(); }); expect(mocks.save).toHaveBeenCalledOnce(); expect(result.current.message).toBe('Informe o nome do template.');
  });
  it('retries a known refusal using the same preallocated template id', async () => {
    mocks.save.mockRejectedValueOnce(Object.assign(new Error('Recusado'), { knownFailure: true })); const { result } = renderHook(() => usePostEditor());
    await act(async () => { await result.current.save(); }); await act(async () => { await result.current.save(); }); expect(mocks.save.mock.calls[0][0].id).toBe(mocks.save.mock.calls[1][0].id);
  });
  it('blocks a replay after an uncertain template save', async () => {
    mocks.save.mockRejectedValue(Object.assign(new Error('Sem confirmação'), { uncertain: true })); const { result } = renderHook(() => usePostEditor());
    await act(async () => { await result.current.save(); }); await act(async () => { await result.current.save(); }); expect(mocks.save).toHaveBeenCalledOnce(); expect(result.current.message).toMatch(/sem confirmação/);
  });
  it('labels an explicitly confirmed local-only template honestly', async () => {
    mocks.save.mockImplementation(async (values) => ({ ...values, campaignId: null, persistedRemotely: false })); const { result } = renderHook(() => usePostEditor());
    await act(async () => { await result.current.save(); }); expect(result.current.message).toMatch(/somente neste navegador/);
  });
  it('does not publish a saved template from a previous operator', async () => {
    const pending = deferred(); mocks.save.mockReturnValue(pending.promise); const { result, rerender } = renderHook(() => usePostEditor()); let save: any; act(() => { save = result.current.save(); }); await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    mocks.user = { id: 'other' }; rerender(); await act(async () => { pending.resolve({ ...mocks.save.mock.calls[0][0], campaignId: null, persistedRemotely: true }); await save; }); expect(result.current.template.id).toBe(compositionTemplate.id); expect(result.current.message).not.toBe('Template salvo.');
  });
  it('keeps composition under its resolver and rejects an invalid result', async () => {
    const { result } = renderHook(() => usePostEditor()); await act(async () => { await result.current.selectProduct('product'); });
    await act(async () => { await result.current.run('layout'); }); expect(mocks.compose).toHaveBeenCalledOnce(); expect(result.current.slogan).toBe('Sua mesa');
    mocks.compose.mockResolvedValue({ layers: [], slogan: 'Bad', validation: { valid: false }, repaired: false }); await act(async () => { await result.current.run('layout'); }); expect(result.current.slogan).toBe('Sua mesa'); expect(result.current.message).toMatch(/não é válida/);
  });
  it('validates a template selection and campaign lookup before using their data', async () => {
    const { result } = renderHook(() => usePostEditor()); await act(async () => { await result.current.selectTemplate({ ...compositionTemplate, targetWidth: 0 }); }); expect(result.current.template.targetWidth).toBe(compositionTemplate.targetWidth);
    await act(async () => { await result.current.selectCampaign({ id: '', name: 'Invalid' } as any); }); expect(mocks.templates).not.toHaveBeenCalled();
    await act(async () => { await result.current.selectCampaign({ id: ' campaign ', name: 'Campanha' } as any); }); expect(result.current.campaign?.id).toBe('campaign');
  });
});
