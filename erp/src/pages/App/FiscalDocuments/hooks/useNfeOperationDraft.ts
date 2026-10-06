import { useCallback, useEffect, useState } from 'react';
import type {
  DraftPayload,
  ReviewData,
  ReviewedLine,
  SourceDocument,
  ReturnOrderOption,
} from '../types/fiscalOperationDraft.types';
import {
  createFiscalOperationDraft,
  fetchLinkedReturnOrders,
  loadFiscalOperationDraft,
  saveFiscalOperationDraftReview,
  transmitFiscalOperationDraft,
} from '../services/fiscalOperationDraftService';
import {
  buildFiscalOperationDraftProductXml,
  buildFiscalOperationDraftReviewState,
} from '../utils/fiscalOperationDraftReview';

interface UseNfeOperationDraftParams {
  sourceDocument: SourceDocument | null;
  initialDraftId?: string | null;
  mode?: 'estorno' | 'return';
  returnOrderId?: string | null;
  onAuthorized: () => void;
}

export function useNfeOperationDraft({
  sourceDocument,
  initialDraftId,
  mode,
  returnOrderId: fixedReturnOrderId,
  onAuthorized,
}: UseNfeOperationDraftParams) {
  const [kind, setKind] = useState<'return' | 'estorno'>(mode || 'return');
  const [returnOrders, setReturnOrders] = useState<ReturnOrderOption[]>([]);
  const [returnOrderId, setReturnOrderId] = useState('');
  const [reason, setReason] = useState('');
  const [operationDidNotOccur, setOperationDidNotOccur] = useState(false);
  const [goodsDidNotCirculate, setGoodsDidNotCirculate] = useState(false);
  const [draftId, setDraftId] = useState('');
  const [payload, setPayload] = useState<DraftPayload | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [reviewedLines, setReviewedLines] = useState<ReviewedLine[]>([]);
  const [productionConfirmed, setProductionConfirmed] = useState(false);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [transmitting, setTransmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retryAllowed, setRetryAllowed] = useState(false);

  useEffect(() => {
    if (mode) setKind(mode);
    if (fixedReturnOrderId) setReturnOrderId(fixedReturnOrderId);
  }, [mode, fixedReturnOrderId]);

  useEffect(() => {
    if (!sourceDocument || fixedReturnOrderId || mode) return;
    let active = true;
    setLoadingReturns(true);
    void fetchLinkedReturnOrders(sourceDocument.order_id)
      .then((matching) => {
        if (active) setReturnOrders(matching);
      })
      .catch(() => {
        if (active) {
          setReturnOrders([]);
          setError('Não foi possível carregar devoluções atendidas para esta venda.');
        }
      })
      .finally(() => {
        if (active) setLoadingReturns(false);
      });
    return () => {
      active = false;
    };
  }, [sourceDocument, fixedReturnOrderId, mode]);

  const applyDraft = useCallback((data: DraftPayload) => {
    const reviewState = buildFiscalOperationDraftReviewState(data);
    setPayload(data);
    setDraftId(data.draft.id);
    setReviewedLines(reviewState.reviewedLines);
    setReview(reviewState.review);
    if (reviewState.error) setError(reviewState.error);
    setNotice(reviewState.notice);
  }, []);

  useEffect(() => {
    if (!sourceDocument || !initialDraftId) return;
    let active = true;
    setPreparing(true);
    setError('');
    void loadFiscalOperationDraft(initialDraftId)
      .then((loaded) => {
        if (active) applyDraft(loaded);
      })
      .catch((cause) => {
        if (active)
          setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o estorno.');
      })
      .finally(() => {
        if (active) setPreparing(false);
      });
    return () => {
      active = false;
    };
  }, [sourceDocument, initialDraftId, applyDraft]);

  const prepareDraft = async () => {
    if (!sourceDocument) return;
    setPreparing(true);
    setError('');
    setNotice('');
    try {
      const created = await createFiscalOperationDraft({
        kind,
        originalDocumentId: sourceDocument.id,
        returnOrderId: kind === 'return' ? fixedReturnOrderId || returnOrderId : null,
        environment: sourceDocument.ambiente,
        reason: review?.reason || reason,
        operationDidNotOccur,
        goodsDidNotCirculate,
      });
      const loaded = await loadFiscalOperationDraft(created.draftId);
      applyDraft(loaded);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível preparar o rascunho.');
    } finally {
      setPreparing(false);
    }
  };

  const updateLineCfop = (index: number, cfop: string) => {
    const line = payload?.lines[index];
    if (!line) return;
    setReviewedLines((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        let productXml = item.product_xml;
        if (/^\d{4}$/.test(cfop)) {
          try {
            productXml = buildFiscalOperationDraftProductXml(line, cfop);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'CFOP ou dados do item inválidos.');
          }
        }
        return { ...item, cfop, product_xml: productXml };
      })
    );
  };

  const updateReview = (key: keyof ReviewData, value: string | boolean) => {
    setReview((current) => (current ? { ...current, [key]: value } : current));
  };

  const saveFiscalReview = async () => {
    if (!review || !draftId) return;
    setSavingReview(true);
    setError('');
    setNotice('');
    try {
      const result = await saveFiscalOperationDraftReview({
        draftId,
        reviewData: review,
        lines: reviewedLines,
      });
      setPayload((current) =>
        current ? { ...current, draft: { ...current.draft, status: result.status } } : current
      );
      setNotice(
        'Revisão fiscal registrada. O XML será gerado e validado novamente no servidor antes da transmissão.'
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a revisão.');
    } finally {
      setSavingReview(false);
    }
  };

  const transmitOrReconcile = async () => {
    if (!draftId) return;
    setTransmitting(true);
    setError('');
    setNotice('');
    try {
      const result = await transmitFiscalOperationDraft({
        draftId,
        productionConfirmed,
      });
      if (result.retryAllowed) {
        setRetryAllowed(true);
        setNotice(result.error || 'A consulta confirmou que a chave não está localizada.');
      } else if (result.pending) {
        setRetryAllowed(false);
        setNotice(result.error || 'Situação pendente. Consulte novamente; não retransmita.');
      } else if (result.success) {
        setNotice(
          result.reconciliationRequired
            ? result.error || 'Documento autorizado; a situação local precisa ser reconciliada.'
            : `Documento autorizado pela SEFAZ. Protocolo ${result.protocolNumber}.`
        );
        if (!result.reconciliationRequired) onAuthorized();
      } else {
        setError(result.xMotivo || result.error || 'A SEFAZ não autorizou o documento.');
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Falha de rede. Consulte a situação antes de tentar novamente.'
      );
    } finally {
      setTransmitting(false);
    }
  };

  const canPrepare =
    kind === 'return'
      ? Boolean(fixedReturnOrderId || returnOrderId)
      : operationDidNotOccur && goodsDidNotCirculate && reason.trim().length >= 15;
  return {
    kind,
    setKind,
    returnOrders,
    returnOrderId,
    setReturnOrderId,
    reason,
    setReason,
    operationDidNotOccur,
    setOperationDidNotOccur,
    goodsDidNotCirculate,
    setGoodsDidNotCirculate,
    payload,
    review,
    reviewedLines,
    setReviewedLines,
    productionConfirmed,
    setProductionConfirmed,
    loadingReturns,
    preparing,
    savingReview,
    transmitting,
    error,
    notice,
    retryAllowed,
    prepareDraft,
    updateLineCfop,
    updateReview,
    saveFiscalReview,
    transmitOrReconcile,
    canPrepare,
  };
}
