// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PostCreatorModelModal } from '@/pages/App/Marketing/Posts/components/PostCreatorModelModal';
import { PurchaseReceiptCheckModal } from '@/pages/App/Stock/Purchases/modals/PurchaseReceiptCheckModal';
import type Purchase from '@/pages/types/purchase.type';

const mocks = vi.hoisted(() => ({ updatePurchase: vi.fn(), getProducts: vi.fn(), error: vi.fn(), success: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock('@/pages/utils/purchaseService', () => ({ updatePurchase: mocks.updatePurchase }));
vi.mock('@/pages/utils/productService', () => ({ getProductsByIds: mocks.getProducts }));
vi.mock('@/components/shared/QRScannerModal', () => ({ default: () => null }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('remaining submit owners', () => {
  it('blocks incomplete badge data and invalid references, then passes parsed model data to save', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<PostCreatorModelModal elementType="BADGE" opportunities={[{ id: 'opportunity', name: 'Oferta' }]} onClose={vi.fn()} onSave={save} onSavingChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Identificação / Nome'), { target: { value: ' Selo ' } });
    await act(async () => fireEvent.submit(container.querySelector('form')!));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/oportunidade/);
    fireEvent.change(container.querySelector('select')!, { target: { value: 'opportunity' } });
    await act(async () => fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [new File(['x'], 'document.txt', { type: 'text/plain' })] } }));
    expect(screen.getByRole('alert').textContent).toMatch(/imagem/);
    await act(async () => fireEvent.submit(container.querySelector('form')!));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Selo', elementType: 'BADGE', opportunityId: 'opportunity', referenceFiles: [] }));
  });

  it('shows an automatic model save error and releases the form for retry', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('Falha ao salvar')).mockResolvedValueOnce(undefined);
    const { container } = render(<PostCreatorModelModal elementType="TITLE" opportunities={[]} onClose={vi.fn()} onSave={save} onSavingChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Identificação / Nome'), { target: { value: 'Título' } });
    await act(async () => fireEvent.submit(container.querySelector('form')!));
    expect(screen.getByRole('alert').textContent).toBe('Falha ao salvar');
    await act(async () => fireEvent.submit(container.querySelector('form')!));
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('blocks a negative purchase invoice quantity before updating and keeps received counts in the valid payload', async () => {
    mocks.getProducts.mockResolvedValue([]);
    mocks.updatePurchase.mockResolvedValue(undefined);
    const purchase: Purchase = { id: 'purchase', supplierId: 'supplier', supplierName: 'Fornecedor', date: '2026-10-14', totalValue: 20, status: 'ordered', items: [{ productId: 'product', description: 'Mesa', quantity: 2, unitCost: 10, totalCost: 20 }] };
    const close = vi.fn();
    render(<PurchaseReceiptCheckModal isOpen purchase={purchase} onClose={close} />);
    await waitFor(() => expect(mocks.getProducts).toHaveBeenCalled());
    const [invoiced, received] = screen.getAllByRole('spinbutton');
    fireEvent.change(invoiced, { target: { value: '-1' } });
    await act(async () => fireEvent.click(screen.getByText('Finalizar Conferência')));
    expect(mocks.updatePurchase).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/negativa/);
    fireEvent.change(invoiced, { target: { value: '2' } });
    fireEvent.change(received, { target: { value: '2' } });
    await act(async () => fireEvent.click(screen.getByText('Finalizar Conferência')));
    expect(mocks.updatePurchase).toHaveBeenCalledWith('purchase', expect.objectContaining({ status: 'fulfilled', invoiceStatus: 'received', items: [expect.objectContaining({ productId: 'product', quantity: 2, receivedQuantity: 2 })] }));
    expect(close).toHaveBeenCalledOnce();
  });
});
