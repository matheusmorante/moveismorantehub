import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type Item from '@/pages/types/items.type';
import type Order from '@/pages/types/order.type';
import type { FiscalAcquisitionPurpose } from '@/pages/types/order.type';
import {
  HML_INTERSTATE_MATRIX_NOT_APPROVED,
  isHmlInterstateMatrixBlock,
  safeFiscalIssueMessage,
} from '@/pages/utils/nfe/fiscalIssuePresentation';
import {
  clearFiscalEmissionRequest,
  emitNfeForOrder,
  type NfeEmissionResult,
  type NfeXmlPreviewProof,
  printOrderDanfe,
  updateFiscalNumberPreviewCache,
} from '@/pages/utils/nfe/nfeService';
import type { resolveOrderFiscalModel } from '../../../../../../../../shared-utils/fiscalDocumentModel';
import type {
  DeliveryMethod,
  resolveTransport,
} from '../../../../../../../../shared-utils/fiscalTransportModel';
import {
  getRecipientIeIndicatorConsistencyError,
  resolveEffectiveRecipientIeIndicator,
} from '../../../../../../../../shared-utils/recipientIeIndicator';
import type { NfeItemWithFiscal } from '../NfeItemsSection';
import type { ThirdPartyTransporterForm } from '../NfeTransportSection';
import {
  consultSefazStatus,
  executeAbandonHmlTlsAttempt,
} from '../services/nfeReconciliationService';
import { validateNfeEmission } from '../services/nfeValidationService';
import type { FiscalFieldError, NfeSequencePreviewState } from '../types/nfeEmission.types';

export interface UseNfeEmissionActionsProps {
  order: Order | null;
  environment: 1 | 2;
  canOperateFiscal: boolean;
  modelDecision: ReturnType<typeof resolveOrderFiscalModel> | null;
  currentModel: '55' | '65';
  deliveryMethod: DeliveryMethod;
  requiresExplicitAcquisitionPurpose: boolean;
  isSavingAcquisitionPurpose: boolean;
  acquisitionPurpose: FiscalAcquisitionPurpose | null;
  finalConsumer?: boolean;
  nfeItems: NfeItemWithFiscal[];
  isLoadingFiscalData: boolean;
  fiscalPreparationError: string | null;
  nfeNumberSequence: { model: '55' | '65'; series: string | null; environment: 1 | 2 };
  manualNumberInput: string | null;
  recipientTaxId: string;
  recipientIe?: string;
  recipientIeIndicator?: '1' | '2' | '9';
  resolvedTransport: ReturnType<typeof resolveTransport>;
  thirdPartyTransporter: ThirdPartyTransporterForm;
  onSuccess?: (result: NfeEmissionResult) => void;
  setRecipientTaxIdError: (err: string | null) => void;
  setNumberPreviewState: (state: NfeSequencePreviewState | null) => void;
  setManualNumberInput: (val: string | null) => void;
}

export function useNfeEmissionActions({
  order,
  environment,
  canOperateFiscal,
  modelDecision,
  currentModel,
  deliveryMethod,
  requiresExplicitAcquisitionPurpose,
  isSavingAcquisitionPurpose,
  acquisitionPurpose,
  finalConsumer,
  nfeItems,
  isLoadingFiscalData,
  fiscalPreparationError,
  nfeNumberSequence,
  manualNumberInput,
  recipientTaxId,
  recipientIe,
  recipientIeIndicator,
  resolvedTransport,
  thirdPartyTransporter,
  onSuccess,
  setRecipientTaxIdError,
  setNumberPreviewState,
  setManualNumberInput,
}: UseNfeEmissionActionsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreparingPreview, setIsPreparingPreview] = useState(false);
  const [emissionResult, setEmissionResult] = useState<NfeEmissionResult | null>(null);
  const [xmlPreview, setXmlPreview] = useState<{
    xml: string;
    proof: NfeXmlPreviewProof;
    contextKey: string;
    freshHmlEmission: boolean;
  } | null>(null);
  const [isXmlPreviewOpen, setIsXmlPreviewOpen] = useState(false);
  const [fiscalFieldError, setFiscalFieldError] = useState<FiscalFieldError | null>(null);
  const submissionInProgress = useRef(false);

  const getPreviewContextKey = (numberInput: string | null) => JSON.stringify({
    order: order
      ? {
          id: order.id,
          updatedAt: (order as Order & { updatedAt?: string }).updatedAt,
          version: (order as Order & { version?: number }).version,
          customerData: order.customerData,
          shipping: order.shipping,
          paymentsSummary: order.paymentsSummary,
          items: order.items,
          fiscalContext: order.fiscalContext,
        }
      : null,
    environment,
    currentModel,
    nfeItems,
    finalConsumer,
    recipientTaxId,
    recipientIe,
    recipientIeIndicator,
    resolvedTransport,
    thirdPartyTransporter,
    manualNumberInput: numberInput,
  });
  const previewContextKey = getPreviewContextKey(manualNumberInput);
  const hasCurrentXmlPreview = Boolean(xmlPreview && xmlPreview.contextKey === previewContextKey);
  useEffect(() => {
    if (xmlPreview && xmlPreview.contextKey !== previewContextKey) {
      setXmlPreview(null);
      setIsXmlPreviewOpen(false);
    }
  }, [previewContextKey, xmlPreview]);

  const handleEmit = async (
    productionConfirmed = false,
    isRetry = false,
    retryNumber?: number,
    freshHmlEmission = false,
    previewOnly = false
  ) => {
    if (submissionInProgress.current) return;
    if (!canOperateFiscal) {
      toast.error('Seu perfil não pode operar documentos fiscais.');
      return;
    }
    if (!order) return;

    if (!previewOnly && !isRetry && !hasCurrentXmlPreview) {
      toast.error('Gere uma nova prévia do XML com as escolhas atuais antes de transmitir.');
      return;
    }

    if (isSavingAcquisitionPurpose) return;
    if (
      (requiresExplicitAcquisitionPurpose && !acquisitionPurpose) ||
      typeof finalConsumer !== 'boolean'
    ) {
      toast.error('Registre a finalidade da compra no pedido antes de preparar a emissão.');
      return;
    }

    if (modelDecision?.status !== 'ready') {
      toast.error(modelDecision?.reason || 'Confirme os dados da operação fiscal.');
      return;
    }

    if (isHmlInterstateMatrixBlock(fiscalPreparationError)) {
      const blockedResult: NfeEmissionResult = {
        success: false,
        model: currentModel,
        environment,
        error: fiscalPreparationError,
        numberReserved: false,
        sefazContacted: false,
        technicalDetails: { apiCode: HML_INTERSTATE_MATRIX_NOT_APPROVED },
      };
      setEmissionResult(blockedResult);
      return;
    }

    const retryId =
      isRetry && emissionResult?.hmlConfirmedNotFound && emissionResult.documentId
        ? emissionResult.documentId
        : undefined;
    const shouldStartFreshHmlEmission =
      freshHmlEmission ||
      (!previewOnly &&
        !isRetry &&
        hasCurrentXmlPreview &&
        xmlPreview?.freshHmlEmission === true);

    const manualNumber =
      retryId || shouldStartFreshHmlEmission
        ? undefined
        : (retryNumber ?? (manualNumberInput !== null ? Number(manualNumberInput) : undefined));

    const validation = validateNfeEmission({
      order,
      currentModel,
      deliveryMethod,
      recipientTaxId,
      nfeItems,
      isLoadingFiscalData,
      fiscalPreparationError,
      manualNumber,
    });

    if (validation.recipientTaxIdError !== undefined) {
      setRecipientTaxIdError(validation.recipientTaxIdError);
    }
    if (validation.fiscalFieldError) {
      setFiscalFieldError(validation.fiscalFieldError);
    }
    if (validation.toastError) {
      toast.error(
        fiscalPreparationError
          ? safeFiscalIssueMessage(fiscalPreparationError, validation.toastError)
          : validation.toastError
      );
    }
    if (currentModel === '55') {
      const effectiveIeIndicator = resolveEffectiveRecipientIeIndicator({
        selected: recipientIeIndicator,
        persisted: order.fiscalContext?.recipientIeIndicator,
        customer: order.customerData?.ieIndicator,
        ie: recipientIe || order.customerData?.ie,
      });
      const recipientIeError = getRecipientIeIndicatorConsistencyError(
        effectiveIeIndicator,
        recipientIe
      );
      if (recipientIeError) {
        toast.error(recipientIeError);
        return;
      }
    }

    if (!validation.valid) return;

    setFiscalFieldError(null);
    submissionInProgress.current = true;
    if (previewOnly) setIsPreparingPreview(true);
    else setIsSubmitting(true);

    try {
      const orderWithFiscalItems: Order = {
        ...order,
        items: [
          ...nfeItems.map((item): Item => ({ ...item, fiscal: item.fiscal })),
          ...(order.items || []).filter((item) => item.itemType === 'service'),
        ],
      };

      const res = await emitNfeForOrder(
        orderWithFiscalItems,
        environment,
        productionConfirmed,
        retryId,
        manualNumber,
        (order.items || [])
          .filter((item) => item.itemType !== 'service')
          .map((item) => String(item.fiscal?.ncm || '')),
        recipientTaxId,
        finalConsumer,
        resolvedTransport.isEmitterTransporter,
        true,
        resolvedTransport.requiresTransporterData ? thirdPartyTransporter : undefined,
        resolvedTransport.modFrete,
        resolvedTransport.hasTransport,
        resolvedTransport.transportResponsible !== 'NONE'
          ? resolvedTransport.transportResponsible
          : undefined,
        resolvedTransport.freightContractResponsible,
        shouldStartFreshHmlEmission,
        recipientIe,
          recipientIeIndicator,
          {
            previewOnly,
            ...(!previewOnly && !isRetry && xmlPreview ? { previewProof: xmlPreview.proof } : {}),
          }
      );

      if (previewOnly) {
        if (res.success && res.preview && res.xml && res.previewProof) {
          setXmlPreview({
            xml: res.xml,
            proof: res.previewProof,
            contextKey: getPreviewContextKey(freshHmlEmission ? null : manualNumberInput),
            freshHmlEmission,
          });
          setIsXmlPreviewOpen(true);
          toast.success('Prévia pronta. Este XML ainda não foi transmitido nem autorizado pela SEFAZ.');
        } else {
          setXmlPreview(null);
          setIsXmlPreviewOpen(false);
          toast.error(res.error || 'Não foi possível preparar a prévia do XML.');
        }
        return;
      }

      setXmlPreview(null);
      setIsXmlPreviewOpen(false);

      if (!res.success) {
        setEmissionResult(res);
        if (res.numberConflict?.nextNumber) {
          if (nfeNumberSequence.series) {
            updateFiscalNumberPreviewCache(
              nfeNumberSequence.model,
              environment,
              nfeNumberSequence.series,
              res.numberConflict.nextNumber
            );
          }
          setNumberPreviewState({
            number: String(res.numberConflict.nextNumber),
            model: nfeNumberSequence.model,
            series: nfeNumberSequence.series || '',
            environment,
          });
        }
        return;
      }

      setEmissionResult(res);
      if (res.nfeNumber && nfeNumberSequence.series) {
        updateFiscalNumberPreviewCache(
          nfeNumberSequence.model,
          environment,
          nfeNumberSequence.series,
          res.nfeNumber + 1
        );
        setNumberPreviewState({
          number: String(res.nfeNumber),
          model: nfeNumberSequence.model,
          series: nfeNumberSequence.series,
          environment,
        });
      }
      toast.success(
        res.environment === 2
          ? 'Documento autorizado pela SEFAZ em homologação (sem valor fiscal).'
          : 'Documento autorizado pela SEFAZ em produção.'
      );
      if (onSuccess) onSuccess(res);
    } catch (err: unknown) {
      console.error(err);
      if (!previewOnly) setXmlPreview(null);
      const errObj = err as Record<string, unknown>;
      const failedResult: NfeEmissionResult = {
        success: false,
        pending: errObj?.pending === true,
        error:
          (typeof errObj?.message === 'string' ? errObj.message : '') ||
          'Ocorreu um erro ao processar a emissão fiscal.',
        ...(typeof errObj?.documentId === 'string' ? { documentId: errObj.documentId } : {}),
        ...(typeof errObj?.emissionRequestId === 'string'
          ? { emissionRequestId: errObj.emissionRequestId }
          : {}),
        technicalDetails: {
          ...(typeof errObj?.code === 'string' ? { apiCode: errObj.code } : {}),
          ...(typeof errObj?.status === 'number' ? { httpStatus: errObj.status } : {}),
          ...(typeof errObj?.diagnosticStage === 'string'
            ? { diagnosticStage: errObj.diagnosticStage }
            : {}),
          ...(typeof errObj?.diagnosticId === 'string'
            ? { diagnosticId: errObj.diagnosticId }
            : {}),
          ...(typeof (errObj?.transportDiagnostic as Record<string, unknown>)?.code === 'string'
            ? {
                transportCode: (errObj?.transportDiagnostic as Record<string, unknown>)
                  .code as string,
              }
            : {}),
        },
      };
      setEmissionResult(failedResult);
    } finally {
      submissionInProgress.current = false;
      if (previewOnly) setIsPreparingPreview(false);
      else setIsSubmitting(false);
    }
  };

  const handleReconcile = async () => {
    if (!canOperateFiscal) {
      toast.error('Seu perfil não pode operar documentos fiscais.');
      return;
    }
    if (!order) return;
    if (submissionInProgress.current) return;
    if (emissionResult?.reservationRecoveryRequired) {
      await handleEmit(false, true);
      return;
    }
    if (!emissionResult?.documentId && !emissionResult?.emissionRequestId) return;

    submissionInProgress.current = true;
    setIsSubmitting(true);
    try {
      const outcome = await consultSefazStatus(String(order.id), environment, emissionResult);
      setEmissionResult((prev) => (prev ? { ...prev, ...outcome.updatedResult } : null));

      if (outcome.toastSuccess) {
        toast.success(outcome.toastSuccess);
        const authorizedResult: NfeEmissionResult = {
          ...emissionResult,
          ...outcome.updatedResult,
          success: true,
          pending: false,
        };
        if (onSuccess) onSuccess(authorizedResult);
      }
    } catch {
      setEmissionResult((previous) =>
        previous
          ? {
              ...previous,
              pending: true,
              error: 'A consulta não foi concluída. Tente consultar a mesma tentativa novamente.',
            }
          : null
      );
    } finally {
      submissionInProgress.current = false;
      setIsSubmitting(false);
    }
  };

  const handleStartFreshHmlEmission = async () => {
    if (
      !order ||
      environment !== 2 ||
      (!emissionResult?.hmlNewEmissionRequired && !emissionResult?.hmlCanAbandonTlsFailure) ||
      submissionInProgress.current
    ) {
      return;
    }

    if (emissionResult.hmlCanAbandonTlsFailure) {
      if (!emissionResult.documentId || !emissionResult.emissionRequestId) return;
      if (!canOperateFiscal) {
        setEmissionResult((previous) =>
          previous
            ? { ...previous, error: 'Seu perfil não pode iniciar uma nova tentativa fiscal.' }
            : null
        );
        return;
      }

      submissionInProgress.current = true;
      setIsSubmitting(true);
      let readyToEmit = false;
      try {
        await executeAbandonHmlTlsAttempt(
          order,
          environment,
          emissionResult.documentId,
          emissionResult.emissionRequestId,
          nfeItems
        );
        setManualNumberInput(null);
        setEmissionResult(null);
        readyToEmit = true;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Não foi possível iniciar a nova tentativa fiscal.';
        setEmissionResult((previous) => (previous ? { ...previous, error: message } : null));
      } finally {
        submissionInProgress.current = false;
        setIsSubmitting(false);
      }

      if (readyToEmit) await handleEmit(false, false, undefined, true, true);
      return;
    }

    clearFiscalEmissionRequest(String(order.id), environment);
    setManualNumberInput(null);
    setEmissionResult(null);
    await handleEmit(false, false, undefined, true, true);
  };

  const handleAbandonHmlTlsAttempt = async () => {
    await handleStartFreshHmlEmission();
  };

  const handlePrintDanfe = () => {
    if (!order) return;
    if (emissionResult?.danfeData) {
      import('@/pages/utils/nfe/danfeGenerator').then((m) => {
        m.openDanfePrintWindow(emissionResult.danfeData!);
      });
    } else if ((order as unknown as { nfeData?: unknown }).nfeData) {
      printOrderDanfe(order);
    }
  };

  return {
    isSubmitting,
    isPreparingPreview,
    emissionResult,
    xmlPreview: hasCurrentXmlPreview ? xmlPreview : null,
    isXmlPreviewOpen: hasCurrentXmlPreview && isXmlPreviewOpen,
    hasCurrentXmlPreview,
    closeXmlPreview: () => setIsXmlPreviewOpen(false),
    fiscalFieldError,
    clearFiscalFieldError: () => setFiscalFieldError(null),
    handleEmit,
    handlePreviewXml: (productionConfirmed = false) =>
      handleEmit(productionConfirmed, false, undefined, false, true),
    handleReconcile,
    handleStartFreshHmlEmission,
    handleAbandonHmlTlsAttempt,
    handlePrintDanfe,
  };
}
