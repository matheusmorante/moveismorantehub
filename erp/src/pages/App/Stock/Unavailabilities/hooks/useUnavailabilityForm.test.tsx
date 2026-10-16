// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnavailabilityForm } from './useUnavailabilityForm';

const mocks = vi.hoisted(() => ({ create: vi.fn(), error: vi.fn(), suppliers: vi.fn() }));
vi.mock('@/pages/utils/stockUnavailabilityService', () => ({ createStockUnavailability: mocks.create }));
vi.mock('../services/unavailabilitySupplierService', () => ({ fetchSuppliersForProductResult: mocks.suppliers }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); mocks.create.mockReset().mockResolvedValue({ id: 'saved' }); mocks.suppliers.mockReset().mockResolvedValue({ data: [], error: null }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
function setup() {
  const success = vi.fn();
  const hook = renderHook(() => useUnavailabilityForm({ isOpen: true, onSuccess: success }));
  act(() => {
    hook.result.current.actions.setSelectedProduct({ id: 'product' } as never);
    hook.result.current.actions.setSelectedVariation({ id: 'variation', stock: 3 } as never);
    hook.result.current.actions.setTreatment('Descarte/perda');
    hook.result.current.actions.setObservation('Foto da avaria');
  });
  return { ...hook, success };
}
const event = { preventDefault: vi.fn() } as never;
describe('unavailability form owner', () => {
  it('does not report missing confirmation as success or allow an immediate repeat', async () => {
    mocks.create.mockResolvedValue(undefined); const s = setup();
    await act(async () => { await s.result.current.actions.handleSubmit(event); });
    expect(s.success).not.toHaveBeenCalled(); expect(s.result.current.state.operationBlocked).toBe(true);
    await act(async () => { await s.result.current.actions.handleSubmit(event); }); expect(mocks.create).toHaveBeenCalledOnce();
  });
  it('rejects an unlinked supplier in the real resolver before the service', async () => {
    mocks.suppliers.mockResolvedValue({ data: [{ id: 'linked', fantasy_name: 'Fornecedor' }], error: null }); const s = setup();
    await act(async () => { await Promise.resolve(); });
    act(() => s.result.current.actions.setSupplierId('unlinked'));
    await act(async () => { await s.result.current.actions.handleSubmit(event); });
    expect(s.result.current.state.formError).toContain('vinculado'); expect(mocks.create).not.toHaveBeenCalled();
  });
  it('keeps the latest photo selection and validates clearing photos through the same queue', async () => {
    const s = setup(); const photo = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' });
    await act(async () => { const first = s.result.current.actions.setPhotos([photo]); const last = s.result.current.actions.setPhotos([]); await Promise.all([first, last]); });
    expect(s.result.current.state.photos).toEqual([]); expect(mocks.error).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
  });
  it('does not apply queued photos after unmounting', async () => {
    const s = setup(); const photo = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' }); let pending!: Promise<void>;
    act(() => { pending = s.result.current.actions.setPhotos([photo]); }); s.unmount(); await act(async () => { await pending; });
    expect(mocks.error).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
  });
  it('does not overwrite suppliers of a new product with an old query response', async () => {
    let finish!: (value: unknown) => void;
    mocks.suppliers.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }))
      .mockResolvedValueOnce({ data: [{ id: 'new-supplier', fantasy_name: 'Novo' }], error: null });
    const s = setup(); await act(async () => { await Promise.resolve(); }); expect(mocks.suppliers).toHaveBeenCalledOnce();
    act(() => { s.result.current.actions.setSelectedProduct({ id: 'new-product' } as never); });
    await act(async () => { await Promise.resolve(); }); expect(s.result.current.state.supplierId).toBe('new-supplier');
    await act(async () => { finish({ data: [{ id: 'old-supplier', fantasy_name: 'Antigo' }], error: null }); });
    expect(s.result.current.state.supplierId).toBe('new-supplier'); expect(s.result.current.state.suppliers.map((row) => row.id)).toEqual(['new-supplier']);
  });
  it('bounds the entire callback and invalidates its guard after 60s without publishing a late success', async () => {
    vi.useFakeTimers(); let finish!: (value: { id: string }) => void;
    mocks.create.mockReturnValue(new Promise((resolve) => { finish = resolve; })); const s = setup(); let pending!: Promise<unknown>;
    await act(async () => { pending = s.result.current.actions.handleSubmit(event); });
    const guard = mocks.create.mock.calls[0][1]; expect(guard()).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); await pending; });
    expect(guard()).toBe(false); expect(s.result.current.state.isLoading).toBe(false); expect(s.result.current.state.operationBlocked).toBe(true);
    await act(async () => { finish({ id: 'late' }); await Promise.resolve(); }); expect(s.success).not.toHaveBeenCalled();
  });
  it('blocks invalid photos before preview or storage and preserves contextual stock limits', async () => {
    const { result } = setup();
    await act(async () => { await result.current.actions.setPhotos([new File(['bad'], 'bad.txt', { type: 'text/plain' })]); });
    expect(result.current.state.photos).toEqual([]);
    expect(mocks.error).toHaveBeenCalledWith('Selecione um arquivo de imagem.');
    expect(mocks.create).not.toHaveBeenCalled();
    act(() => { result.current.actions.setQuantity('4'); });
    await act(async () => { await result.current.actions.handleSubmit(event); });
    expect(mocks.error).toHaveBeenLastCalledWith(expect.stringContaining('maior que o estoque atual'));
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('passes photos and observations through the resolver and blocks duplicate pending saves', async () => {
    let finish!: (value: { id: string }) => void;
    mocks.create.mockImplementationOnce(() => new Promise<{ id: string }>((resolve) => { finish = resolve; }));
    const { result, success } = setup();
    const photo = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
    await act(async () => { await result.current.actions.setPhotos([photo]); });
    let first!: Promise<unknown>;
    await act(async () => { first = result.current.actions.handleSubmit(event); });
    await act(async () => { await result.current.actions.handleSubmit(event); });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ quantity: 1, observation: 'Foto da avaria', physicalLocation: 'Depósito', photos: [photo], treatment: 'Descarte/perda', supplierId: null }), expect.any(Function));
    await act(async () => { finish({ id: 'saved' }); await first; });
    expect(success).toHaveBeenCalledTimes(1);
    expect(result.current.state.isLoading).toBe(false);
  });
});
