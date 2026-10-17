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
import { nfeEmissionFormSchema } from '../../../../../../../../shared-utils/nfeEmissionFormValidation';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { getSettings } from '@/pages/utils/settingsService';
import type { FiscalFieldError, NfeSequencePreviewState } from '../types/nfeEmission.types';
import { backfillLegacyOrderItemSnapshots } from '../services/nfeSnapshotBackfillService';
import {
  buildFailedEmissionResult,
  createPreviewContextKey,
  notifyEmissionIssue,
} from '../services/nfePreviewContextService';

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
  const lastEmissionProductionConfirmation = useRef(false);
  const persistedLegacySnapshotOrderIds = useRef(new Set<string>());

  const form = useZodForm(nfeEmissionFormSchema, {
    order: order as Order,
    currentModel,
    deliveryMethod,
    recipientTaxId,
    nfeItems,
    isLoadingFiscalData,
    fiscalPreparationError,
    issuerUf: getSettings().companyUF,
  });

  const previewContextKey = createPreviewContextKey({
    order,
    environment,
    currentModel,
    nfeItems,
    finalConsumer,
    recipientTaxId,
    recipientIe,
    recipientIeIndicator,
    resolvedTransport,
    thirdPartyTransporter,
    manualNumberInput,
  });

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
    previewOnly = false,
    existingEmissionRequestId?: string
  ) => {
    if (submissionInProgress.current) {
      toast.info('Já existe uma operação fiscal em andamento. Aguarde a conclusão.');
      return;
    }
    if (!canOperateFiscal) {
      toast.error('Seu perfil não pode operar documentos fiscais.');
      return;
    }
    if (!order) {
      toast.error('O pedido não está disponível para emissão fiscal.');
      return;
    }

    if (isSavingAcquisitionPurpose) {
      toast.info('Aguarde o salvamento da finalidade da compra antes de emitir.');
      return;
    }
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
      notifyEmissionIssue(blockedResult);
      return;
    }

    const retryId =
      isRetry && emissionResult?.hmlConfirmedNotFound && emissionResult.documentId
        ? emissionResult.documentId
        : undefined;
    const shouldStartFreshHmlEmission = freshHmlEmission;

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

    await form.validateAndRun(
      {
        order,
        currentModel,
        deliveryMethod,
        recipientTaxId,
        nfeItems,
        isLoadingFiscalData,
        fiscalPreparationError,
        manualNumber,
        issuerUf: getSettings().companyUF,
      },
      async () => {
        if (!previewOnly) lastEmissionProductionConfirmation.current = productionConfirmed;
        setFiscalFieldError(null);
        submissionInProgress.current = true;
        if (previewOnly) setIsPreparingPreview(true);
        else setIsSubmitting(true);

        try {
          await backfillLegacyOrderItemSnapshots({
            order,
            nfeItems,
            previewOnly,
            isRetry,
            persistedOrderIds: persistedLegacySnapshotOrderIds.current,
          });

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
              ...(existingEmissionRequestId ? { existingEmissionRequestId } : {}),
            }
          );

          if (previewOnly) {
            if (res.success && res.preview && res.xml && res.previewProof) {
              setXmlPreview({
                xml: res.xml,
                proof: res.previewProof,
                contextKey: createPreviewContextKey({
                  order,
                  environment,
                  currentModel,
                  nfeItems,
                  finalConsumer,
                  recipientTaxId,
                  recipientIe,
                  recipientIeIndicator,
                  resolvedTransport,
                  thirdPartyTransporter,
                  manualNumberInput: freshHmlEmission ? null : manualNumberInput,
                }),
                freshHmlEmission,
              });
              setIsXmlPreviewOpen(true);
              toast.success(
                'Prévia pronta. Este XML ainda não foi transmitido nem autorizado pela SEFAZ.'
              );
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
            notifyEmissionIssue(res);
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
          const failedResult = buildFailedEmissionResult(err);
          setEmissionResult(failedResult);
          notifyEmissionIssue(failedResult);
        } finally {
          submissionInProgress.current = false;
          if (previewOnly) setIsPreparingPreview(false);
          else setIsSubmitting(false);
        }
      },
      (errors) => {
        const flat = flattenFormErrors(errors);
        const firstMessage = Object.values(flat)[0];
        if (firstMessage && !validation.toastError) {
          toast.error(firstMessage);
        }
      }
    );
  };

  const handleReconcile = async () => {
    if (!canOperateFiscal) {
      toast.error('Seu perfil não pode operar documentos fiscais.');
      return;
    }
    if (!order) return;
    if (submissionInProgress.current) return;
    if (
      emissionResult?.preparationReconciled &&
      emissionResult.technicalDetails?.apiCode === 'FISCAL_PREPARATION_UNCONFIRMED' &&
      emissionResult.sefazContacted === false
    ) {
      const requestId = emissionResult.emissionRequestId;
      if (
        !requestId ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          requestId
        ) ||
        emissionResult.orderId !== String(order.id) ||
        emissionResult.environment !== environment
      ) {
        toast.error('Não foi possível confirmar a identidade da tentativa fiscal para retomá-la.');
        return;
      }
      await handleEmit(
        lastEmissionProductionConfirmation.current,
        true,
        undefined,
        false,
        false,
        requestId
      );
      return;
    }
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
        return outcome;
      }

      if (outcome.toastError) {
        toast.error(outcome.toastError);
      } else if (outcome.state === 'not_found' || outcome.updatedResult?.hmlConfirmedNotFound) {
        toast.info(
          outcome.updatedResult?.error ||
            'A SEFAZ confirmou que o documento não consta na base. Você pode retransmitir a mesma nota com segurança.'
        );
      } else if (outcome.state === 'rejected') {
        toast.error(outcome.updatedResult?.error || 'Tentativa rejeitada pela SEFAZ.');
      } else if (outcome.updatedResult?.error) {
        toast.warning(outcome.updatedResult.error);
      }
      return outcome;
    } catch {
      toast.error('A consulta não foi concluída. Tente consultar a mesma tentativa novamente.');
      setEmissionResult((previous) =>
        previous
          ? {
              ...previous,
              pending: true,
              error: 'A consulta não foi concluída. Tente consultar a mesma tentativa novamente.',
            }
          : null
      );
      return null;
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
        toast.error(message);
        setEmissionResult((previous) => (previous ? { ...previous, error: message } : null));
      } finally {
        submissionInProgress.current = false;
        setIsSubmitting(false);
      }

      if (readyToEmit) {
        toast.info('Tentativa anterior arquivada com segurança. Iniciando nova emissão fiscal…');
        await handleEmit(false, false, undefined, true);
      }
      return;
    }

    toast.info('Iniciando nova tentativa fiscal…');
    clearFiscalEmissionRequest(String(order.id), environment);
    setManualNumberInput(null);
    setEmissionResult(null);
    await handleEmit(false, false, undefined, true);
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
