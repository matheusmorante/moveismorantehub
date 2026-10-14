// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useReceiptForm } from './useReceiptForm';

const mocks = vi.hoisted(() => ({ saveDraft: vi.fn(), finalize: vi.fn(), markReceived: vi.fn(), error: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: vi.fn(), info: vi.fn() } }));
vi.mock('@/pages/utils/personService', () => ({ subscribeToPeople: (_collection: string, callback: (people: unknown[]) => void) => { callback([{ id: 'supplier', fullName: 'Fornecedor', type: 'suppliers' }]); return () => {}; } }));
vi.mock('@/pages/utils/goodsReceiptService', () => ({ saveGoodsReceiptDraft: mocks.saveDraft, finalizeGoodsReceipt: mocks.finalize }));
vi.mock('@/pages/utils/inboundNfe/inboundInvoicesService', () => ({ markInvoiceAsReceived: mocks.markReceived }));
vi.mock('@/pages/utils/productSupplierCodesService', () => ({ saveProductSupplierCode: vi.fn() }));
vi.mock('../utils/inboundInvoiceToReceiptAdapter', () => ({ adaptInboundInvoiceToReceiptState: vi.fn() }));
beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); mocks.saveDraft.mockResolvedValue({ id: 'draft', receiptIndex: 10 }); mocks.finalize.mockResolvedValue(undefined); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const options = { isOpen: true, onClose: vi.fn() };
const item = { productId: 'product', description: 'Mesa', quantity: 1, unitCost: 10, totalCost: 10 };

describe('receipt form resolver and persistence', () => {
  it('does not remain blocked after a draft service failure', async () => {
    mocks.saveDraft.mockRejectedValueOnce(new Error('Falha no rascunho'));
    const { result } = renderHook(() => useReceiptForm(options));
    act(() => { result.current.setSupplierId('supplier'); result.current.setItems([item]); });
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(result.current.isDraftSaved).toBe(false);
    expect(mocks.error).toHaveBeenCalledWith('Não foi possível salvar o rascunho do recebimento.', expect.anything());
    await act(async () => { await result.current.handleFinalize(); });
    expect(mocks.finalize).toHaveBeenCalledTimes(1);
    expect(result.current.isSaving).toBe(false);
  });
  it('blocks costs outside the previous partial schema and saves the parsed fiscal key and full fields', async () => {
    const { result } = renderHook(() => useReceiptForm(options));
    act(() => { result.current.setSupplierId('supplier'); result.current.setItems([item]); result.current.setNonFiscalFreightValue(-1); });
    await act(async () => { await result.current.handleFinalize(); });
    expect(mocks.finalize).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalled();
    act(() => { result.current.setNonFiscalFreightValue(0); result.current.setFiscalKey(' 41260802216300000138550010000040201276092641 '); result.current.setAttachments(['arquivo.xml']); });
    await act(async () => { await result.current.handleFinalize(); });
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ supplierId: 'supplier', fiscalKey: '41260802216300000138550010000040201276092641', attachments: ['arquivo.xml'], nonFiscalFreightValue: 0 }));
    expect(mocks.markReceived).toHaveBeenCalledWith('41260802216300000138550010000040201276092641', expect.any(String));
  });

  it('waits for the draft and reuses its identity when finalizing, suppressing simultaneous final submissions', async () => {
    let finishDraft!: (draft: unknown) => void;
    mocks.saveDraft.mockImplementationOnce(() => new Promise((resolve) => { finishDraft = resolve; }));
    const { result } = renderHook(() => useReceiptForm(options));
    act(() => { result.current.setSupplierId('supplier'); result.current.setItems([item]); });
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(mocks.saveDraft).toHaveBeenCalledTimes(1);
    let pending!: Promise<void>;
    act(() => { pending = result.current.handleFinalize(); });
    await act(async () => { await result.current.handleFinalize(); });
    expect(mocks.finalize).not.toHaveBeenCalled();
    await act(async () => { finishDraft({ id: 'draft-persisted', receiptIndex: 10 }); await pending; });
    expect(mocks.finalize).toHaveBeenCalledTimes(1);
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ id: 'draft-persisted' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(mocks.saveDraft).toHaveBeenCalledTimes(1);
  });
});
