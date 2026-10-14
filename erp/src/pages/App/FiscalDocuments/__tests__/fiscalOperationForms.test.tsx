// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNfeOperationDraft } from '../hooks/useNfeOperationDraft';
import { useFiscalCancelModal } from '../hooks/useFiscalCancelModal';
import type { DraftPayload, ReviewData, SourceDocument } from '../types/fiscalOperationDraft.types';
import type { NfeDocumentRecord } from '../types/fiscalDocuments.types';

const mocks = vi.hoisted(() => ({
  create: vi.fn(), load: vi.fn(), save: vi.fn(), transmit: vi.fn(), returns: vi.fn(),
  cancel: vi.fn(), toast: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));
vi.mock('../services/fiscalOperationDraftService', () => ({
  createFiscalOperationDraft: mocks.create, loadFiscalOperationDraft: mocks.load,
  saveFiscalOperationDraftReview: mocks.save, transmitFiscalOperationDraft: mocks.transmit,
  fetchLinkedReturnOrders: mocks.returns,
}));
vi.mock('../services/fiscalCancellationService', () => ({ executeFiscalCancellation: mocks.cancel }));
vi.mock('react-toastify', () => ({ toast: mocks.toast }));
vi.mock('../utils/fiscalOperationDraftReview', () => ({
  buildFiscalOperationDraftReviewState: (payload: DraftPayload) => ({
    reviewedLines: payload.lines.map((line) => ({
      draft_line_id: line.id, cfop: '1202', product_xml: '<prod/>', taxes_xml: '<imposto/>',
    })), review: payload.draft.review_data, error: null, notice: '',
  }),
  buildFiscalOperationDraftProductXml: () => '<prod/>',
}));

const draftId = 'b1234567-1234-4123-8123-123456789012';
const lineId = 'c1234567-1234-4123-8123-123456789012';
const source: SourceDocument = {
  id: 'a1234567-1234-4123-8123-123456789012', order_id: 'order-1',
  modelo: '55', ambiente: 1, numero_nfe: 1, serie: '1', chave_acesso: '1'.repeat(44),
};
const review: ReviewData = {
  nature_of_operation: 'Nota Fiscal de Estorno', reason: 'Operação não realizada e sem circulação.',
  recipient_xml: '<dest/>', totals_xml: '<total/>', transport_xml: '<transp/>', payment_xml: '<pag/>',
  item_taxes_confirmed: true, totals_confirmed: true, apportionment_review_confirmed: true,
  period_adjustment_text: '',
};
function payload(status = 'ready'): DraftPayload {
  return {
    draft: { id: draftId, operation_kind: 'estorno', environment: 1, status,
      original_access_key: source.chave_acesso, review_data: { ...review } },
    source,
    lines: [{ id: lineId }] as DraftPayload['lines'],
    reviewTemplate: { recipient_xml: '<dest/>', totals_xml: '<total/>', transport_xml: '<transp/>', payment_xml: '<pag/>' },
  };
}
async function loadedDraft(status: string) {
  mocks.load.mockResolvedValue(payload(status));
  const onAuthorized = vi.fn();
  const hook = renderHook(() => useNfeOperationDraft({ sourceDocument: source, mode: 'estorno', initialDraftId: draftId, onAuthorized }));
  await waitFor(() => expect(hook.result.current.payload?.draft.status).toBe(status));
  return { ...hook, onAuthorized };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.create.mockResolvedValue({ draftId });
  mocks.load.mockResolvedValue(payload());
  mocks.save.mockResolvedValue({ status: 'ready' });
  mocks.transmit.mockResolvedValue({ pending: true });
  mocks.returns.mockResolvedValue([]);
  mocks.cancel.mockResolvedValue({ action: 'cancel', commercialCommitted: true });
});
afterEach(cleanup);

describe('Fiscal operation RHF submission paths', () => {
  it('requires the linked commercial return while preserving return preparation without estorno confirmations', async () => {
    const { result } = renderHook(() => useNfeOperationDraft({ sourceDocument: source, mode: 'return', onAuthorized: vi.fn() }));
    await act(async () => { await result.current.prepareDraft(); });
    expect(mocks.create).not.toHaveBeenCalled();
    act(() => result.current.setReturnOrderId(draftId));
    await act(async () => { await result.current.prepareDraft(); });
    expect(mocks.create).toHaveBeenCalledWith({
      kind: 'return', originalDocumentId: source.id, returnOrderId: draftId, environment: 1,
      reason: '', operationDidNotOccur: false, goodsDidNotCirculate: false,
    });
  });

  it('blocks estorno preparation until the reason and non-circulation confirmations are valid', async () => {
    const { result } = renderHook(() => useNfeOperationDraft({ sourceDocument: source, mode: 'estorno', onAuthorized: vi.fn() }));
    await act(async () => { await result.current.prepareDraft(); });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
    act(() => {
      result.current.setOperationDidNotOccur(true);
      result.current.setGoodsDidNotCirculate(true);
      result.current.setReason('😀'.repeat(15));
    });
    await act(async () => { await result.current.prepareDraft(); });
    expect(mocks.create).toHaveBeenCalledWith({
      kind: 'estorno', originalDocumentId: source.id, returnOrderId: null, environment: 1,
      reason: '😀'.repeat(15), operationDidNotOccur: true, goodsDidNotCirculate: true,
    });
  });

  it('validates review XML, CFOP and complete item coverage before saving, preserving the supplied blocks', async () => {
    const { result } = await loadedDraft('draft');
    const originalLine = result.current.reviewedLines[0];
    act(() => result.current.setReviewedLines([{ ...originalLine, cfop: '12' }]));
    await act(async () => { await result.current.saveFiscalReview(); });
    expect(mocks.save).not.toHaveBeenCalled();
    act(() => result.current.setReviewedLines([originalLine, originalLine]));
    await act(async () => { await result.current.saveFiscalReview(); });
    expect(mocks.save).not.toHaveBeenCalled();
    act(() => result.current.setReviewedLines([{ ...originalLine, taxes_xml: '<prod/>' }]));
    await act(async () => { await result.current.saveFiscalReview(); });
    expect(mocks.save).not.toHaveBeenCalled();
    const unchangedLine = { ...originalLine, product_xml: '<prod> </prod>' };
    act(() => result.current.setReviewedLines([unchangedLine]));
    await act(async () => { await result.current.saveFiscalReview(); });
    expect(mocks.save).toHaveBeenCalledWith({ draftId, reviewData: review, lines: [unchangedLine] });
  });

  it('requires saved estorno confirmations before persisting a review', async () => {
    const { result } = await loadedDraft('draft');
    act(() => result.current.updateReview('apportionment_review_confirmed', false));
    await act(async () => { await result.current.saveFiscalReview(); });
    expect(mocks.save).not.toHaveBeenCalled();
    expect(result.current.error).toContain('Confirme');
  });

  it('keeps uncertain reconciliation unconfirmed, but requires explicit production confirmation for a subsequent retry', async () => {
    const { result, onAuthorized } = await loadedDraft('unknown');
    mocks.transmit.mockResolvedValueOnce({ retryAllowed: true });
    await act(async () => { await result.current.transmitOrReconcile(); });
    expect(mocks.transmit).toHaveBeenCalledWith({ draftId, productionConfirmed: false });
    expect(result.current.retryAllowed).toBe(true);
    await act(async () => { await result.current.transmitOrReconcile(); });
    expect(mocks.transmit).toHaveBeenCalledTimes(1);
    expect(result.current.error).toContain('Produção');
    expect(onAuthorized).not.toHaveBeenCalled();
    act(() => result.current.setProductionConfirmed(true));
    await act(async () => { await result.current.transmitOrReconcile(); });
    expect(mocks.transmit).toHaveBeenLastCalledWith({ draftId, productionConfirmed: true });
  });

  it('blocks a fresh production transmission without confirmation and preserves the pending result', async () => {
    const { result, onAuthorized } = await loadedDraft('ready');
    await act(async () => { await result.current.transmitOrReconcile(); });
    expect(mocks.transmit).not.toHaveBeenCalled();
    act(() => result.current.setProductionConfirmed(true));
    await act(async () => { await result.current.transmitOrReconcile(); });
    expect(mocks.transmit).toHaveBeenCalledTimes(1);
    expect(result.current.notice).toContain('pendente');
    expect(onAuthorized).not.toHaveBeenCalled();
  });
});

describe('Fiscal cancellation RHF submission paths', () => {
  const document = { ...source, status: 'autorizada', created_at: '', updated_at: '' } as NfeDocumentRecord;
  it.each([{ length: 14, valid: false }, { length: 15, valid: true }, { length: 255, valid: true }, { length: 256, valid: false }])(
    'counts $length Unicode characters for cancellation (valid=$valid)', async ({ length, valid }) => {
      const { result } = renderHook(() => useFiscalCancelModal({ onSuccess: vi.fn(async () => {}), onEstornoTrigger: vi.fn() }));
      act(() => result.current.openCancel({ ...document, ambiente: 2 }, { canProceed: true, action: 'cancel' }));
      act(() => result.current.setCancelReason('😀'.repeat(length)));
      await act(async () => { await result.current.handleConfirmCancel({ canProceed: true, action: 'cancel' }); });
      expect(mocks.cancel).toHaveBeenCalledTimes(valid ? 1 : 0);
      if (valid) expect(mocks.cancel.mock.calls[0][0].reason).toBe('😀'.repeat(length));
      else expect(mocks.toast.error).toHaveBeenCalledWith('A justificativa deve ter entre 15 e 255 caracteres.');
    },
  );
  it('requires explicit production confirmation only for the cancellation event', async () => {
    const onEstornoTrigger = vi.fn();
    const { result } = renderHook(() => useFiscalCancelModal({ onSuccess: vi.fn(async () => {}), onEstornoTrigger }));
    act(() => result.current.openCancel(document, { canProceed: true, action: 'cancel' }));
    act(() => result.current.setCancelReason(review.reason));
    await act(async () => { await result.current.handleConfirmCancel({ canProceed: true, action: 'cancel' }); });
    expect(mocks.cancel).not.toHaveBeenCalled();
    mocks.cancel.mockResolvedValueOnce({ action: 'estorno', draftId, commercialCommitted: true });
    act(() => result.current.setCancelReason(''));
    await act(async () => { await result.current.handleConfirmCancel({ canProceed: true, action: 'estorno' }); });
    expect(mocks.cancel).toHaveBeenCalledWith({ document, reason: '', isCancelEvent: false, productionConfirmed: false });
    expect(onEstornoTrigger).toHaveBeenCalledWith(document, draftId);
  });
  it('passes an explicitly confirmed production cancellation through the existing service', async () => {
    const onSuccess = vi.fn(async () => {});
    const { result } = renderHook(() => useFiscalCancelModal({ onSuccess, onEstornoTrigger: vi.fn() }));
    act(() => result.current.openCancel(document, { canProceed: true, action: 'cancel' }));
    act(() => {
      result.current.setCancelReason(review.reason);
      result.current.setProductionCancelConfirmed(true);
    });
    await act(async () => { await result.current.handleConfirmCancel({ canProceed: true, action: 'cancel' }); });
    expect(mocks.cancel).toHaveBeenCalledWith({ document, reason: review.reason, isCancelEvent: true, productionConfirmed: true });
    expect(onSuccess).toHaveBeenCalledOnce();
  });
});
