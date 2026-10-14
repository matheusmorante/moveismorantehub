// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PurchaseFormModal } from './PurchaseFormModal';

const mocks = vi.hoisted(() => ({ save: vi.fn(), update: vi.fn(), upload: vi.fn(), error: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: vi.fn(), info: vi.fn(), warning: vi.fn() } }));
vi.mock('@/pages/utils/purchaseService', () => ({ savePurchase: mocks.save, updatePurchase: mocks.update }));
vi.mock('@/pages/utils/productService', () => ({ subscribeToProducts: (callback: (products: unknown[]) => void) => { callback([{ id: 'product', name: 'Mesa', itemType: 'product', supplierId: 'supplier' }]); return () => {}; } }));
vi.mock('@/pages/utils/personService', () => ({ subscribeToPeople: (_collection: string, callback: (people: unknown[]) => void) => { callback([{ id: 'supplier', fullName: 'Fornecedor', type: 'suppliers' }]); return () => {}; } }));
vi.mock('@/components/SupplierAutocomplete', () => ({ default: ({ onSelect }: { onSelect: (id: string) => void }) => <button onClick={() => onSelect('supplier')}>Selecionar fornecedor</button> }));
vi.mock('../components/PurchaseAttachmentsSection', () => ({ PurchaseAttachmentsSection: ({ onUpload }: any) => <input type="file" aria-label="Anexos" onChange={onUpload} /> }));
vi.mock('../../components/PurchaseItemsSection', () => ({ PurchaseItemsSection: ({ onAddItem, onUpdateItem, items }: any) => <><button onClick={() => onAddItem({ productId: 'product', description: 'Mesa', quantity: 1, unitCost: 10, totalCost: 10 })}>Adicionar Mesa</button><button onClick={() => onUpdateItem(0, { ...items[0], quantity: 2 })}>Quantidade 2</button></> }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { storage: { from: () => ({ upload: mocks.upload }) } } }));
vi.mock('browser-image-compression', () => ({ default: vi.fn() }));
beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); mocks.save.mockResolvedValue('draft'); mocks.update.mockResolvedValue(undefined); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const fill = () => { fireEvent.click(screen.getByText('Selecionar fornecedor')); fireEvent.click(screen.getByText('Adicionar Mesa')); };

describe('purchase submit owners', () => {
  it('waits for draft creation and confirms the latest items using the same identity', async () => {
    let finishDraft!: (id: string) => void;
    mocks.save.mockImplementationOnce(() => new Promise<string>((resolve) => { finishDraft = resolve; }));
    const close = vi.fn();
    render(<PurchaseFormModal isOpen onClose={close} />);
    fill();
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Quantidade 2'));
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    act(() => { fireEvent.click(screen.getByText('Confirmar Pedido')); fireEvent.click(screen.getByText('Confirmar Pedido')); });
    expect(mocks.update).not.toHaveBeenCalled();
    await act(async () => { finishDraft('persisted'); });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith('persisted', expect.objectContaining({ items: [expect.objectContaining({ productId: 'product', quantity: 2 })] }));
    expect(close).toHaveBeenCalledOnce();
    await act(async () => { await vi.advanceTimersByTimeAsync(1400); });
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it('uses current fields when Escape closes the form and preserves it if saving fails', async () => {
    mocks.save.mockRejectedValueOnce(new Error('Falha'));
    const close = vi.fn();
    render(<PurchaseFormModal isOpen onClose={close} />);
    fill();
    await act(async () => { fireEvent.keyDown(window, { key: 'Escape' }); });
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ supplierId: 'supplier', items: [expect.objectContaining({ productId: 'product' })] }));
    expect(close).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalled();
    await act(async () => { fireEvent.keyDown(window, { key: 'Escape' }); });
    expect(close).toHaveBeenCalledOnce();
  });

  it('blocks non-document uploads before accessing storage', async () => {
    render(<PurchaseFormModal isOpen onClose={vi.fn()} />);
    await act(async () => fireEvent.change(screen.getByLabelText('Anexos'), { target: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] } }));
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith('Selecione arquivos PDF ou imagens.');
  });
});
