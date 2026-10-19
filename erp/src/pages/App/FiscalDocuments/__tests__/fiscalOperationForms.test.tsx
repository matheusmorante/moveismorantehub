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

  it('keeps preparation locked until creation and loading finish', async () => {
    let finish!: (value: { draftId: string }) => void;
    mocks.create.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useNfeOperationDraft({ sourceDocument: source, mode: 'return', returnOrderId: draftId, onAuthorized: vi.fn() }));
    let first!: Promise<unknown>;
    await act(async () => { first = result.current.prepareDraft(); });
    await act(async () => { await result.current.prepareDraft(); });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    await act(async () => { finish({ draftId }); await first; });
    expect(mocks.load).toHaveBeenCalledTimes(1);
    expect(result.current.payload?.draft.id).toBe(draftId);
    expect(result.current.preparing).toBe(false);
  });

  it('does not transmit while a review save is pending and releases the operation on completion', async () => {
    let finish!: (value: { status: string }) => void;
    mocks.save.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = await loadedDraft('ready');
    act(() => result.current.setProductionConfirmed(true));
    let first!: Promise<unknown>;
    await act(async () => { first = result.current.saveFiscalReview(); });
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    await act(async () => { await result.current.transmitOrReconcile(); });
    expect(mocks.transmit).not.toHaveBeenCalled();
    await act(async () => { finish({ status: 'ready' }); await first; });
    await act(async () => { await result.current.transmitOrReconcile(); });
    expect(mocks.transmit).toHaveBeenCalledTimes(1);
  });

  it('blocks duplicate transmission and review until a pending result returns, without automatic resend', async () => {
    let finish!: (value: { pending: boolean }) => void;
    mocks.transmit.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result, onAuthorized } = await loadedDraft('ready');
    act(() => result.current.setProductionConfirmed(true));
    let first!: Promise<unknown>;
    await act(async () => { first = result.current.transmitOrReconcile(); });
    await waitFor(() => expect(mocks.transmit).toHaveBeenCalledTimes(1));
    await act(async () => { await result.current.transmitOrReconcile(); await result.current.saveFiscalReview(); });
    expect(mocks.transmit).toHaveBeenCalledTimes(1);
    expect(mocks.save).not.toHaveBeenCalled();
    await act(async () => { finish({ pending: true }); await first; });
    expect(result.current.notice).toContain('pendente');
    expect(result.current.retryAllowed).toBe(false);
    expect(onAuthorized).not.toHaveBeenCalled();
    expect(mocks.transmit).toHaveBeenCalledTimes(1);
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

  it('requires a read of the same draft after response loss, without resending or saving review', async () => {
    const { result, onAuthorized } = await loadedDraft('ready');
    act(() => result.current.setProductionConfirmed(true));
    mocks.transmit.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await act(async () => { await result.current.transmitOrReconcile(); });
    expect(result.current.refreshRequired).toBe(true);
    expect(result.current.error).toContain('Atualize a situação fiscal');
    await act(async () => { await result.current.saveFiscalReview(); });
    expect(mocks.save).not.toHaveBeenCalled();
    mocks.load.mockResolvedValueOnce(payload('authorized'));
    act(() => result.current.setProductionConfirmed(false));
    await act(async () => { await result.current.transmitOrReconcile(); });
    expect(mocks.transmit).toHaveBeenCalledTimes(1);
    expect(mocks.load).toHaveBeenLastCalledWith(draftId);
    expect(result.current.refreshRequired).toBe(false);
    expect(result.current.payload?.draft.status).toBe('authorized');
    expect(onAuthorized).toHaveBeenCalledTimes(1);
  });

  it('keeps an inconclusive result locked for refresh if reading fails or returns a different identity', async () => {
    const { result, onAuthorized } = await loadedDraft('ready');
    act(() => result.current.setProductionConfirmed(true));
    await act(async () => { await result.current.transmitOrReconcile(); });
    expect(result.current.refreshRequired).toBe(true);
    mocks.load.mockRejectedValueOnce(new Error('Leitura indisponível'));
    await act(async () => { await result.current.transmitOrReconcile(); });
    expect(result.current.refreshRequired).toBe(true);
    mocks.load.mockResolvedValueOnce({ ...payload('authorized'), draft: { ...payload('authorized').draft, id: lineId } });
    await act(async () => { await result.current.transmitOrReconcile(); });
    expect(result.current.refreshRequired).toBe(true);
    expect(result.current.error).toContain('identidade');
    expect(mocks.transmit).toHaveBeenCalledTimes(1);
    expect(onAuthorized).not.toHaveBeenCalled();
  });

  it('ends an unresponsive transmission at 45 seconds and requires a read before any further action', async () => {
    const { result, onAuthorized } = await loadedDraft('ready');
    act(() => result.current.setProductionConfirmed(true));
    mocks.transmit.mockImplementationOnce(() => new Promise(() => {}));
    vi.useFakeTimers();
    try {
      let operation!: Promise<unknown>;
      await act(async () => { operation = result.current.transmitOrReconcile(); });
      expect(result.current.transmitting).toBe(true);
      await act(async () => { await vi.advanceTimersByTimeAsync(45000); await operation; });
      expect(result.current.transmitting).toBe(false);
      expect(result.current.refreshRequired).toBe(true);
      expect(result.current.retryAllowed).toBe(false);
      expect(mocks.transmit).toHaveBeenCalledTimes(1);
      expect(onAuthorized).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
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
  it('valida a justificativa da NFD sem pedido comercial e encaminha incerteza sem declarar venda cancelada', async () => {
    const onSuccess = vi.fn(async () => {});
    const { result } = renderHook(() => useFiscalCancelModal({ onSuccess, onEstornoTrigger: vi.fn() }));
    const nfd = { ...document, document_type: 'return', ambiente: 2, status: 'homologada', order_id: null } as NfeDocumentRecord;
    act(() => result.current.openCancel(nfd, { canProceed: true, action: 'cancel' }));
    act(() => result.current.setCancelReason('curta'));
    await act(async () => { await result.current.handleConfirmCancel({ canProceed: true, action: 'cancel' }); });
    expect(mocks.cancel).not.toHaveBeenCalled();
    mocks.cancel.mockResolvedValueOnce({ action: 'reconcile', commercialCommitted: false, reconciliationRequired: true });
    act(() => result.current.setCancelReason('  Revisão fiscal da NFD para reemissão.  '));
    await act(async () => { await result.current.handleConfirmCancel({ canProceed: true, action: 'cancel' }); });
    expect(mocks.cancel).toHaveBeenCalledWith({ document: nfd, reason: '  Revisão fiscal da NFD para reemissão.  ', isCancelEvent: true, productionConfirmed: false });
    expect(mocks.toast.warning).toHaveBeenCalledWith('Cancelamento fiscal pendente de confirmação. Consulte a SEFAZ antes de nova ação.');
    expect(mocks.toast.success).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
  it('holds one lock across cancel and estorno while the service is pending and allows retry after failure', async () => {
    let fail!: (reason: Error) => void;
    mocks.cancel.mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
    const onSuccess = vi.fn(async () => {});
    const { result } = renderHook(() => useFiscalCancelModal({ onSuccess, onEstornoTrigger: vi.fn() }));
    act(() => result.current.openCancel(document, { canProceed: true, action: 'cancel' }));
    act(() => { result.current.setCancelReason('Operação não realizada.'); result.current.setProductionCancelConfirmed(true); });
    let first!: Promise<unknown>;
    await act(async () => { first = result.current.handleConfirmCancel({ canProceed: true, action: 'cancel' }); });
    await waitFor(() => expect(mocks.cancel).toHaveBeenCalledTimes(1));
    await act(async () => { await result.current.handleConfirmCancel({ canProceed: true, action: 'estorno' }); });
    expect(mocks.cancel).toHaveBeenCalledTimes(1);
    expect(mocks.cancel).toHaveBeenCalledWith(expect.objectContaining({ document, reason: 'Operação não realizada.', productionConfirmed: true }));
    act(() => result.current.openCancel({ ...document, id: 'another-document' }, { canProceed: true, action: 'cancel' }));
    expect(result.current.selectedDoc?.id).toBe(document.id);
    await act(async () => { fail(new Error('Falha simulada')); await first; });
    expect(mocks.toast.error).toHaveBeenCalledWith('Não foi possível concluir o cancelamento fiscal: Falha simulada');
    expect(result.current.isCanceling).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
    await act(async () => { await result.current.handleConfirmCancel({ canProceed: true, action: 'cancel' }); });
    expect(mocks.cancel).toHaveBeenCalledTimes(2);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

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
