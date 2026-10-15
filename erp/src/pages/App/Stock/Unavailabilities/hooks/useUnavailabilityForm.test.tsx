// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnavailabilityForm } from './useUnavailabilityForm';

const mocks = vi.hoisted(() => ({ create: vi.fn(), error: vi.fn() }));
vi.mock('@/pages/utils/stockUnavailabilityService', () => ({ createStockUnavailability: mocks.create }));
vi.mock('../services/unavailabilitySupplierService', () => ({ fetchSuppliersForProduct: async () => [] }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); mocks.create.mockResolvedValue(undefined); });
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
    let finish!: () => void;
    mocks.create.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    const { result, success } = setup();
    const photo = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
    await act(async () => { await result.current.actions.setPhotos([photo]); });
    let first!: Promise<unknown>;
    await act(async () => { first = result.current.actions.handleSubmit(event); });
    await act(async () => { await result.current.actions.handleSubmit(event); });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ quantity: 1, observation: 'Foto da avaria', physicalLocation: 'Depósito', photos: [photo], treatment: 'Descarte/perda', supplierId: null }));
    await act(async () => { finish(); await first; });
    expect(success).toHaveBeenCalledTimes(1);
    expect(result.current.state.isLoading).toBe(false);
  });
});
