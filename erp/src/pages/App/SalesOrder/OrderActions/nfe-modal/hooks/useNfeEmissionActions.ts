import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type Order from '@/pages/types/order.type';
import {
  type NfeEmissionResult,
  printOrderDanfe,
} from '@/pages/utils/nfe/nfeService';
import { nfeEmissionFormSchema } from '../../../../../../../../shared-utils/nfeEmissionFormValidation';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { getSettings } from '@/pages/utils/settingsService';
import type { FiscalFieldError } from '../types/nfeEmission.types';
import { backfillLegacyOrderItemSnapshots } from '../services/nfeSnapshotBackfillService';
import {
  buildFailedEmissionResult,
  createPreviewContextKey,
  notifyEmissionIssue,
} from '../services/nfePreviewContextService';
import type {
  UseNfeEmissionActionsProps,
  UseNfeEmissionActionsReturn,
} from './actions/actions.types';
import { useNfeAttemptRestoration } from './actions/useNfeAttemptRestoration';
import { useNfeXmlPreviewState } from './actions/useNfeXmlPreviewState';
import { executeEmissionPipeline } from './actions/nfeEmissionExecutor';
import { checkEmissionPreflight } from './actions/nfeEmissionPreflight';
import { useNfeReconciliationAction } from './actions/useNfeReconciliationAction';
import { useNfeHmlRestartAction } from './actions/useNfeHmlRestartAction';

export type { UseNfeEmissionActionsProps, UseNfeEmissionActionsReturn };

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
  recipientIe = '',
  recipientIeIndicator,
  resolvedTransport,
  thirdPartyTransporter,
  onSuccess,
  setRecipientTaxIdError,
  setNumberPreviewState,
  setManualNumberInput,
}: UseNfeEmissionActionsProps): UseNfeEmissionActionsReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreparingPreview, setIsPreparingPreview] = useState(false);
  const [isRestartingHml, setIsRestartingHml] = useState(false);
  const [emissionResult, setEmissionResult] = useState<NfeEmissionResult | null>(null);
  const [fiscalFieldError, setFiscalFieldError] = useState<FiscalFieldError | null>(null);

  const localSubmissionInProgress = useRef(false);
  const submissionInProgress = fiscalOperationLock ?? localSubmissionInProgress;
  const lastEmissionProductionConfirmation = useRef(false);
  const persistedLegacySnapshotOrderIds = useRef(new Set<string>());
  const canOperateFiscalRef = useRef(canOperateFiscal);
  canOperateFiscalRef.current = canOperateFiscal;

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

  const {
    xmlPreview,
    setXmlPreview,
    isXmlPreviewOpen,
    setIsXmlPreviewOpen,
    hasCurrentXmlPreview,
    clearXmlPreview,
    closeXmlPreview,
  } = useNfeXmlPreviewState(previewContextKey);

  const { operationOwner, isRestoringAttempt, attemptRestorationError } =
    useNfeAttemptRestoration({
      order,
      environment,
      operatorId,
      canOperateFiscal,
      onAttemptFound: setEmissionResult,
      onClearState: () => {
        setEmissionResult(null);
        clearXmlPreview();
        setFiscalFieldError(null);
        setIsRestartingHml(false);
        lastEmissionProductionConfirmation.current = false;
      },
    });

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

    const retryId =
      isRetry && emissionResult?.hmlConfirmedNotFound && emissionResult.documentId
        ? emissionResult.documentId
        : undefined;
    const shouldStartFreshHmlEmission = freshHmlEmission;

    const manualNumber =
      retryId || shouldStartFreshHmlEmission
        ? undefined
        : retryNumber ?? (manualNumberInput !== null ? Number(manualNumberInput) : undefined);

    const preflightPassed = checkEmissionPreflight({
      order,
      canOperateFiscal,
      canUsePreparation,
      isSavingAcquisitionPurpose,
      isSavingPreparation,
      preparationSaveError,
      requiresExplicitAcquisitionPurpose,
      acquisitionPurpose,
      finalConsumer,
      modelDecision,
      currentModel,
      environment,
      fiscalPreparationError,
      isRestoringAttempt,
      attemptRestorationError: attemptRestorationError ?? null,
      emissionResult,
      isRetry,
      deliveryMethod,
      recipientTaxId,
      recipientIe,
      recipientIeIndicator,
      nfeItems,
      isLoadingFiscalData,
      manualNumber,
      setRecipientTaxIdError,
      setFiscalFieldError,
      setEmissionResult,
    });

    if (!preflightPassed || !order) return;

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
        if (
          operationOwner.current !== owner ||
          submissionInProgress.current ||
          !canOperateFiscalRef.current ||
          !canUsePreparation()
        )
          return;

        const {
          order: validatedOrder,
          nfeItems: validatedItems,
          recipientTaxId: validatedTaxId,
          recipientIe: validatedIe,
          recipientIeIndicator: validatedIeIndicator,
          finalConsumer: validatedConsumer,
          manualNumber: validatedManualNumber,
        } = validated;

        if (!previewOnly) lastEmissionProductionConfirmation.current = productionConfirmed;
        setFiscalFieldError(null);
        submissionInProgress.current = true;
        if (previewOnly) setIsPreparingPreview(true);
        else setIsSubmitting(true);

        try {
          await backfillLegacyOrderItemSnapshots({
            order: validatedOrder,
            nfeItems: validatedItems,
            previewOnly,
            isRetry,
            persistedOrderIds: persistedLegacySnapshotOrderIds.current,
          });
          if (operationOwner.current !== owner) return;

          await executeEmissionPipeline({
            order: validatedOrder,
            nfeItems: validatedItems,
            environment,
            productionConfirmed,
            retryId,
            manualNumber: validatedManualNumber,
            recipientTaxId: validatedTaxId,
            recipientIe: validatedIe,
            recipientIeIndicator: validatedIeIndicator,
            finalConsumer: validatedConsumer,
            resolvedTransport,
            thirdPartyTransporter,
            shouldStartFreshHmlEmission,
            previewOnly,
            xmlPreview,
            existingEmissionRequestId,
            nfeNumberSequence,
            manualNumberInput,
            freshHmlEmission,
            // Permission is checked before dispatch. A permission/profile refresh while the
            // request is in flight must not discard its authoritative fiscal outcome.
            isCurrent: () => operationOwner.current === owner,
            setXmlPreview,
            setIsXmlPreviewOpen,
            setEmissionResult,
            setNumberPreviewState,
            onSuccess,
          });
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
        if (firstMessage) {
          toast.error(firstMessage);
        }
      }
    );
  };

  const { handleReconcile } = useNfeReconciliationAction({
    order,
    environment,
    canOperateFiscal,
    canOperateFiscalRef,
    submissionInProgress,
    operationOwner,
    emissionResult,
    lastEmissionProductionConfirmation,
    setIsSubmitting,
    setEmissionResult,
    onSuccess,
    handleEmit,
  });

  const { handleStartFreshHmlEmission, handleAbandonHmlTlsAttempt } = useNfeHmlRestartAction({
    order,
    environment,
    canOperateFiscal,
    canOperateFiscalRef,
    submissionInProgress,
    operationOwner,
    emissionResult,
    canUsePreparation,
    isSavingPreparation,
    isSavingAcquisitionPurpose,
    preparationSaveError,
    modelDecision,
    emissionValues,
    setIsSubmitting,
    setIsRestartingHml,
    setManualNumberInput,
    setEmissionResult,
    handleEmit,
  });

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
    isRestoringAttempt,
    attemptRestorationError,
    isPreparingPreview,
    isRestartingHml,
    emissionResult,
    xmlPreview: hasCurrentXmlPreview ? xmlPreview : null,
    isXmlPreviewOpen: hasCurrentXmlPreview && isXmlPreviewOpen,
    hasCurrentXmlPreview,
    closeXmlPreview,
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
