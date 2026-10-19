import { useCallback, useEffect, useRef, useState } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import {
  fiscalOperationPreparationFormSchema,
  createFiscalOperationReviewFormSchema,
  createFiscalOperationTransmissionFormSchema,
} from '../../../../../../shared-utils/fiscalOperationFormSchemas';
import type {
  DraftPayload,
  OperationDraftPreviewResult,
  ReviewData,
  ReviewedLine,
  SourceDocument,
  ReturnOrderOption,
} from '../types/fiscalOperationDraft.types';
import {
  createFiscalOperationDraft,
  fetchLinkedReturnOrders,
  loadFiscalOperationDraft,
  previewFiscalOperationDraft,
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
  const [operationDidNotOccur, setOperationDidNotOccur] = useState(() => mode === 'estorno');
  const [goodsDidNotCirculate, setGoodsDidNotCirculate] = useState(() => mode === 'estorno');
  const [draftId, setDraftId] = useState('');
  const [payload, setPayload] = useState<DraftPayload | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [reviewedLines, setReviewedLines] = useState<ReviewedLine[]>([]);
  const [productionConfirmed, setProductionConfirmed] = useState(false);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [transmitting, setTransmitting] = useState(false);
  const [xmlPreview, setXmlPreview] = useState<OperationDraftPreviewResult | null>(null);
  const [isXmlPreviewOpen, setIsXmlPreviewOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retryAllowed, setRetryAllowed] = useState(false);
  const [refreshRequired, setRefreshRequired] = useState(false);

  const preparationValues = {
    kind,
    originalDocumentId: sourceDocument?.id || '',
    returnOrderId: kind === 'return' ? fixedReturnOrderId || returnOrderId || null : null,
    environment: sourceDocument?.ambiente || 2,
    reason: review?.reason || payload?.draft.reason || reason,
    operationDidNotOccur,
    goodsDidNotCirculate,
  };
  const preparationForm = useZodForm(fiscalOperationPreparationFormSchema, preparationValues);
  const reviewValues = {
    draftId,
    reviewData: review ? { ...review } : {
      nature_of_operation: '', reason: '', recipient_xml: '', totals_xml: '', transport_xml: '',
      payment_xml: '', item_taxes_confirmed: false, totals_confirmed: false,
      apportionment_review_confirmed: false, period_adjustment_text: '',
    },
    lines: reviewedLines.map((line) => ({ ...line })),
  };
  const reviewForm = useZodForm(
    createFiscalOperationReviewFormSchema(payload?.draft.operation_kind || kind, payload?.lines.map((line) => line.id) || []),
    reviewValues,
  );
  const transmissionValues = { draftId, productionConfirmed };
  const transmissionForm = useZodForm(createFiscalOperationTransmissionFormSchema({
    environment: payload?.draft.environment || sourceDocument?.ambiente || 2,
    status: refreshRequired ? 'unknown' : payload?.draft.status || '',
    retryAllowed: refreshRequired ? false : retryAllowed,
  }), transmissionValues);

  useEffect(() => {
    if (mode) {
      setKind(mode);
      if (mode === 'estorno') {
        setOperationDidNotOccur(true);
        setGoodsDidNotCirculate(true);
      }
    }
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
    if (data.draft.operation_kind === 'estorno') {
      setKind('estorno');
      setOperationDidNotOccur(true);
      setGoodsDidNotCirculate(true);
      if (data.draft.reason) setReason(data.draft.reason);
    }
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

  const operationInFlight = useRef(false);

  const prepareDraft = async () => {
    if (operationInFlight.current) return;
    if (!sourceDocument) return;
    operationInFlight.current = true;
    try {
      return await preparationForm.validateAndRun(preparationValues, async (validated) => {
        setPreparing(true);
        setError('');
        setNotice('');
        try {
          const created = await createFiscalOperationDraft(validated);
          const loaded = await loadFiscalOperationDraft(created.draftId);
          applyDraft(loaded);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Não foi possível preparar o rascunho.');
        } finally {
          setPreparing(false);
        }
      }, (errors) => setError(Object.values(flattenFormErrors(errors))[0] || 'Preparação fiscal inválida.'));
    } finally {
      operationInFlight.current = false;
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
    if (operationInFlight.current || refreshRequired) return;
    if (!review || !draftId) return;
    operationInFlight.current = true;
    try {
      return await reviewForm.validateAndRun(reviewValues, async (validated) => {
        setSavingReview(true);
        setError('');
        setNotice('');
        try {
          const result = await saveFiscalOperationDraftReview(validated);
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
      }, (errors) => setError(Object.values(flattenFormErrors(errors))[0] || 'Revisão fiscal inválida.'));
    } finally {
      operationInFlight.current = false;
    }
  };

  const hasUnresolvedCfop = Boolean(
    payload &&
      (reviewedLines.length === 0 ||
        reviewedLines.some((line) => !line.cfop || !/^\d{4}$/.test(line.cfop)))
  );

  const closeXmlPreview = useCallback(() => {
    setIsXmlPreviewOpen(false);
  }, []);

  const handlePreviewXml = async () => {
    if (operationInFlight.current || refreshRequired) return;
    if (!draftId) return;

    if (hasUnresolvedCfop) {
      setError(
        'A prévia do XML e a transmissão estão bloqueadas porque há itens sem CFOP válido determinado.'
      );
      return;
    }

    operationInFlight.current = true;
    try {
      setLoadingPreview(true);
      setError('');
      setNotice('');

      if (review) {
        const isValid = await reviewForm.validateAndRun(
          reviewValues,
          async (validated) => {
            const result = await saveFiscalOperationDraftReview(validated);
            setPayload((current) =>
              current ? { ...current, draft: { ...current.draft, status: result.status } } : current
            );
            return true;
          },
          (errors) => {
            setError(Object.values(flattenFormErrors(errors))[0] || 'Revisão fiscal inválida.');
            return false;
          }
        );
        if (!isValid) return;
      }

      const result = await withTimeout(
        previewFiscalOperationDraft({ draftId }),
        30000,
        null,
        'geração da prévia do XML fiscal'
      );
      if (!result) {
        throw new Error('A geração da prévia do XML excedeu o tempo limite.');
      }
      setXmlPreview(result);
      setIsXmlPreviewOpen(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível gerar a prévia do XML fiscal.'
      );
    } finally {
      setLoadingPreview(false);
      operationInFlight.current = false;
    }
  };

  const transmitOrReconcile = async () => {
    if (operationInFlight.current) return;
    if (!draftId) return;
    if (hasUnresolvedCfop) {
      setError('A transmissão está bloqueada porque há itens sem CFOP válido determinado.');
      return;
    }
    operationInFlight.current = true;
    try {
      return await transmissionForm.validateAndRun(transmissionValues, async (validated) => {
        setTransmitting(true);
        setError('');
        setNotice('');
        try {
          if (refreshRequired) {
            const loaded = await withTimeout(loadFiscalOperationDraft(validated.draftId), 15000, null, 'atualização da situação fiscal');
            if (!loaded) throw new Error('Não foi possível atualizar a situação fiscal. Consulte novamente antes de transmitir.');
            if (loaded.draft.id !== validated.draftId || loaded.source.id !== sourceDocument?.id || loaded.draft.environment !== sourceDocument?.ambiente) {
              throw new Error('A atualização fiscal retornou identidade incompatível com esta operação.');
            }
            applyDraft(loaded);
            setRetryAllowed(false);
            setRefreshRequired(false);
            if (loaded.draft.status === 'authorized') onAuthorized();
            return;
          }
          const result = await withTimeout(transmitFiscalOperationDraft(validated), 45000, null, 'transmissão ou consulta fiscal');
          if (!result) throw new Error('A operação fiscal excedeu o prazo de confirmação.');
          if (result.retryAllowed) {
            setRetryAllowed(true);
            setNotice(result.error || 'A consulta confirmou que a chave não está localizada.');
          } else if (result.pending) {
            setRetryAllowed(false);
            setRefreshRequired(true);
            setNotice(result.error || 'Situação pendente. Consulte novamente; não retransmita.');
          } else if (result.success) {
            setRefreshRequired(result.reconciliationRequired === true);
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
          setRetryAllowed(false);
          setRefreshRequired(true);
          setError(
            refreshRequired && cause instanceof Error
              ? cause.message
              : 'Não foi possível confirmar o resultado da operação. Atualize a situação fiscal antes de tentar novamente; a nota pode ter sido autorizada.'
          );
        } finally {
          setTransmitting(false);
        }
      }, (errors) => setError(Object.values(flattenFormErrors(errors))[0] || 'Operação fiscal inválida.'));
    } finally {
      operationInFlight.current = false;
    }
  };

  const canPrepare = fiscalOperationPreparationFormSchema.safeParse(preparationValues).success;
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
    xmlPreview,
    isXmlPreviewOpen,
    loadingPreview,
    hasUnresolvedCfop,
    error,
    notice,
    retryAllowed,
    refreshRequired,
    prepareDraft,
    updateLineCfop,
    updateReview,
    saveFiscalReview,
    handlePreviewXml,
    closeXmlPreview,
    transmitOrReconcile,
    canPrepare,
  };
}
