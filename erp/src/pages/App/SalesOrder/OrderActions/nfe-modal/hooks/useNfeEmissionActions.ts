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
import type { NfeItemWithFiscal } from '../NfeItemsSection';
import type { ThirdPartyTransporterForm } from '../NfeTransportSection';
import {
  consultSefazStatus,
  executeAbandonHmlTlsAttempt,
} from '../services/nfeReconciliationService';
import { validateNfeEmission } from '../services/nfeValidationService';
import { nfeEmissionConsultFormSchema, nfeEmissionFormSchema, nfeHmlRestartFormSchema } from '../../../../../../../../shared-utils/nfeEmissionFormValidation';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { getSettings } from '@/pages/utils/settingsService';
import { withTimeout } from '../../../../../../../../shared-utils/withTimeout';
import type { FiscalFieldError, NfeSequencePreviewState } from '../types/nfeEmission.types';
import { backfillLegacyOrderItemSnapshots } from '../services/nfeSnapshotBackfillService';
import {
  buildFailedEmissionResult,
  createPreviewContextKey,
  notifyEmissionIssue,
} from '../services/nfePreviewContextService';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** Combina os itens fiscais confirmados na UI com os serviços do pedido, sem alterar o original. */
function buildOrderWithFiscalItems(order: Order, nfeItems: NfeItemWithFiscal[]): Order {
  return {
    ...order,
    items: [
      ...nfeItems.map((item): Item => ({ ...item, fiscal: item.fiscal })),
      ...(order.items || []).filter((item) => item.itemType === 'service'),
    ],
  };
}

export interface UseNfeEmissionActionsProps {
  fiscalOperationLock?: { current: boolean };
  canUsePreparation?: () => boolean;
  order: Order | null;
  environment: 1 | 2;
  canOperateFiscal: boolean;
  operatorId?: string;
  modelDecision: ReturnType<typeof resolveOrderFiscalModel> | null;
  currentModel: '55' | '65';
  deliveryMethod: DeliveryMethod;
  requiresExplicitAcquisitionPurpose: boolean;
  isSavingAcquisitionPurpose: boolean;
  isSavingPreparation?: boolean;
  preparationSaveError?: string | null;
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
  fiscalOperationLock,
  canUsePreparation = () => true,
  order,
  environment,
  canOperateFiscal,
  operatorId,
  modelDecision,
  currentModel,
  deliveryMethod,
  requiresExplicitAcquisitionPurpose,
  isSavingAcquisitionPurpose,
  isSavingPreparation = false,
  preparationSaveError = null,
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
  const [isRestartingHml, setIsRestartingHml] = useState(false);
  const [emissionResult, setEmissionResult] = useState<NfeEmissionResult | null>(null);
  const [xmlPreview, setXmlPreview] = useState<{
    xml: string;
    proof: NfeXmlPreviewProof;
    contextKey: string;
    freshHmlEmission: boolean;
  } | null>(null);
  const [isXmlPreviewOpen, setIsXmlPreviewOpen] = useState(false);
  const [fiscalFieldError, setFiscalFieldError] = useState<FiscalFieldError | null>(null);
  const localSubmissionInProgress = useRef(false);
  const submissionInProgress = fiscalOperationLock ?? localSubmissionInProgress;
  const lastEmissionProductionConfirmation = useRef(false);
  const persistedLegacySnapshotOrderIds = useRef(new Set<string>());
  const canOperateFiscalRef = useRef(canOperateFiscal);
  canOperateFiscalRef.current = canOperateFiscal;
  const operationOwner = useRef({ orderId: order?.id, environment, operatorId });
  if (operationOwner.current.orderId !== order?.id || operationOwner.current.environment !== environment || operationOwner.current.operatorId !== operatorId) {
    operationOwner.current = { orderId: order?.id, environment, operatorId };
  }
  const orderId = order?.id;
  useEffect(() => {
    setEmissionResult(null);
    setXmlPreview(null);
    setIsXmlPreviewOpen(false);
    setFiscalFieldError(null);
    setIsRestartingHml(false);
    lastEmissionProductionConfirmation.current = false;
  }, [orderId, environment, operatorId]);
  useEffect(() => () => {
    operationOwner.current = { ...operationOwner.current };
  }, []);

  const emissionValues = {
    order: order as Order,
    currentModel,
    deliveryMethod,
    recipientTaxId,
    recipientIe,
    recipientIeIndicator,
    finalConsumer,
    nfeItems,
    isLoadingFiscalData,
    fiscalPreparationError,
    issuerUf: getSettings().companyUF,
  };
  const form = useZodForm(nfeEmissionFormSchema, emissionValues);

  const consultForm = useZodForm(nfeEmissionConsultFormSchema, { orderId: String(order?.id || ''), environment });
  const restartForm = useZodForm(nfeHmlRestartFormSchema, {
    identity: { orderId: String(order?.id || ''), environment },
    emission: emissionValues, kind: 'confirmed_not_found', previousSuccess: false,
    previousPending: false, canAbandonTls: false, needsNewEmission: false,
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
    const owner = operationOwner.current;
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

    if (!canUsePreparation() || isSavingAcquisitionPurpose || isSavingPreparation || preparationSaveError) {
      toast.info(preparationSaveError || 'Aguarde a confirmação do salvamento dos dados fiscais antes de emitir.');
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
      recipientIe,
      recipientIeIndicator,
      finalConsumer,
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
    if (!validation.valid) return;

    await form.validateAndRun(
      {
        order,
        currentModel,
        deliveryMethod,
        recipientTaxId,
        recipientIe,
        recipientIeIndicator,
        finalConsumer,
        nfeItems,
        isLoadingFiscalData,
        fiscalPreparationError,
        manualNumber,
        issuerUf: getSettings().companyUF,
      },
      async (validated) => {
        if (operationOwner.current !== owner || submissionInProgress.current || !canOperateFiscalRef.current || !canUsePreparation()) return;
        const { order, nfeItems, recipientTaxId, recipientIe, recipientIeIndicator, finalConsumer, manualNumber, currentModel } = validated;
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
          if (operationOwner.current !== owner) return;

          const orderWithFiscalItems = buildOrderWithFiscalItems(order, nfeItems);

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

          if (operationOwner.current !== owner) return;

          if (previewOnly) {
            console.log('[handlePreviewXml result]', res);
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
          if (operationOwner.current !== owner) return;
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
        if (operationOwner.current !== owner) return;
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
        !isUuid(requestId) ||
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

    const owner = operationOwner.current;
    const reconciled = await consultForm.validateAndRun({
      orderId: String(order.id), environment,
      documentId: emissionResult.documentId,
      emissionRequestId: emissionResult.emissionRequestId,
      resultOrderId: emissionResult.orderId,
      resultEnvironment: emissionResult.environment,
    }, async (values) => {
      if (operationOwner.current !== owner || submissionInProgress.current || !canOperateFiscalRef.current) return;
      submissionInProgress.current = true;
      setIsSubmitting(true);
      try {
        const outcome = await withTimeout(consultSefazStatus(values.orderId, values.environment, {
          ...emissionResult,
          documentId: values.documentId,
          emissionRequestId: values.emissionRequestId,
        }), 30_000, null, 'nfe:consultar-tentativa');
        if (operationOwner.current !== owner) return;
        if (!outcome) throw new Error('Consulta fiscal não confirmada dentro do prazo.');
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
        if (operationOwner.current !== owner) return;
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
    }, (errors) => {
      if (operationOwner.current === owner) toast.error(Object.values(flattenFormErrors(errors))[0]);
    });
    return reconciled === false ? null : reconciled;
  };

  const handleStartFreshHmlEmission = async () => {
    if (!order || environment !== 2 || !emissionResult || submissionInProgress.current) return;
    if (!canOperateFiscal || !canUsePreparation() || isSavingPreparation || isSavingAcquisitionPurpose || preparationSaveError || modelDecision?.status !== 'ready') {
      toast.error(preparationSaveError || 'Confirme os dados e o salvamento da operação fiscal antes de iniciar outra tentativa.');
      return;
    }
    const owner = operationOwner.current;
    const isCurrent = () => operationOwner.current === owner && canOperateFiscalRef.current;
    await restartForm.validateAndRun({
      identity: {
        orderId: String(order.id), environment,
        documentId: emissionResult.documentId, emissionRequestId: emissionResult.emissionRequestId,
        resultOrderId: emissionResult.orderId, resultEnvironment: emissionResult.environment,
      },
      emission: emissionValues,
      kind: emissionResult.hmlCanAbandonTlsFailure ? 'tls_untransmitted' : 'confirmed_not_found',
      previousSuccess: emissionResult.success, previousPending: emissionResult.pending ?? true,
      canAbandonTls: emissionResult.hmlCanAbandonTlsFailure ?? false,
      needsNewEmission: emissionResult.hmlNewEmissionRequired ?? false,
    }, async (values) => {
      if (!isCurrent() || submissionInProgress.current || !canUsePreparation()) return;
      submissionInProgress.current = true;
      setIsSubmitting(true);
      setIsRestartingHml(true);
      let readyToEmit = false;
      try {
        if (values.kind === 'tls_untransmitted') {
          readyToEmit = await executeAbandonHmlTlsAttempt(
            values.emission.order, values.identity.environment,
            values.identity.documentId!, values.identity.emissionRequestId!,
            values.emission.nfeItems, isCurrent
          );
        } else {
          clearFiscalEmissionRequest(values.identity.orderId, values.identity.environment);
          readyToEmit = true;
        }
        if (!isCurrent() || !readyToEmit) return;
        setManualNumberInput(null);
        setEmissionResult(null);
      } catch (error) {
        if (!isCurrent()) return;
        const message = error instanceof Error ? error.message : 'Não foi possível confirmar o encerramento da tentativa anterior. Consulte a situação fiscal.';
        toast.error(message);
        setEmissionResult((previous) => previous ? {
          ...previous, error: message, pending: true,
          hmlCanAbandonTlsFailure: false, hmlNewEmissionRequired: false,
        } : null);
      } finally {
        submissionInProgress.current = false;
        setIsSubmitting(false);
        setIsRestartingHml(false);
      }
      if (readyToEmit && isCurrent()) {
        toast.info('Tentativa anterior conferida. Iniciando nova emissão fiscal em homologação…');
        await handleEmit(false, false, undefined, true);
      }
    }, (errors) => {
      if (isCurrent()) toast.error(Object.values(flattenFormErrors(errors))[0]);
    });
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
    isRestartingHml,
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
