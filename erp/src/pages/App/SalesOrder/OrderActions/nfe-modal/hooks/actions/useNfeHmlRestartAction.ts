import { toast } from 'react-toastify';
import type React from 'react';
import type Order from '@/pages/types/order.type';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { nfeHmlRestartFormSchema } from '../../../../../../../../../shared-utils/nfeEmissionFormValidation';
import { executeHmlRestartOperation } from './nfeReconciliationExecutor';

interface UseNfeHmlRestartActionParams {
  order: Order | null;
  environment: 1 | 2;
  canOperateFiscal: boolean;
  canOperateFiscalRef: React.MutableRefObject<boolean>;
  submissionInProgress: React.MutableRefObject<boolean>;
  operationOwner: React.MutableRefObject<symbol>;
  emissionResult: NfeEmissionResult | null;
  canUsePreparation: () => boolean;
  isSavingPreparation: boolean;
  isSavingAcquisitionPurpose: boolean;
  preparationSaveError: string | null;
  modelDecision: any;
  emissionValues: any;
  setIsSubmitting: (submitting: boolean) => void;
  setIsRestartingHml: (restarting: boolean) => void;
  setManualNumberInput: (value: string | null) => void;
  setEmissionResult: (res: NfeEmissionResult | null) => void;
  handleEmit: (
    productionConfirmed?: boolean,
    isRetry?: boolean,
    retryNumber?: number,
    freshHmlEmission?: boolean,
    previewOnly?: boolean,
    existingEmissionRequestId?: string
  ) => Promise<void>;
}

export function useNfeHmlRestartAction({
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
}: UseNfeHmlRestartActionParams) {
  const restartForm = useZodForm(nfeHmlRestartFormSchema, {
    identity: { orderId: String(order?.id || ''), environment },
    emission: emissionValues,
    kind: 'confirmed_not_found',
    previousSuccess: false,
    previousPending: false,
    canAbandonTls: false,
    needsNewEmission: false,
  });

  const handleStartFreshHmlEmission = async () => {
    if (!order || environment !== 2 || !emissionResult || submissionInProgress.current) return;
    if (
      !canOperateFiscal ||
      !canUsePreparation() ||
      isSavingPreparation ||
      isSavingAcquisitionPurpose ||
      preparationSaveError ||
      modelDecision?.status !== 'ready'
    ) {
      toast.error(
        preparationSaveError ||
          'Confirme os dados e o salvamento da operação fiscal antes de iniciar outra tentativa.'
      );
      return;
    }

    const owner = operationOwner.current;
    const isCurrent = () => operationOwner.current === owner && canOperateFiscalRef.current;

    await restartForm.validateAndRun(
      {
        identity: {
          orderId: String(order.id),
          environment,
          documentId: emissionResult.documentId,
          emissionRequestId: emissionResult.emissionRequestId,
          resultOrderId: emissionResult.orderId,
          resultEnvironment: emissionResult.environment,
        },
        emission: emissionValues,
        kind: emissionResult.hmlCanAbandonTlsFailure ? 'tls_untransmitted' : 'confirmed_not_found',
        previousSuccess: emissionResult.success,
        previousPending: emissionResult.pending ?? true,
        canAbandonTls: emissionResult.hmlCanAbandonTlsFailure ?? false,
        needsNewEmission: emissionResult.hmlNewEmissionRequired ?? false,
      },
      async (values) => {
        if (!isCurrent() || submissionInProgress.current || !canUsePreparation()) return;
        submissionInProgress.current = true;
        setIsSubmitting(true);
        setIsRestartingHml(true);
        let readyToEmit = false;

        try {
          readyToEmit = await executeHmlRestartOperation({
            kind: values.kind as 'tls_untransmitted' | 'confirmed_not_found',
            order: values.emission.order,
            environment: values.identity.environment as 1 | 2,
            documentId: values.identity.documentId,
            emissionRequestId: values.identity.emissionRequestId,
            nfeItems: values.emission.nfeItems,
            isCurrent,
            setManualNumberInput,
            setEmissionResult,
          });
        } finally {
          submissionInProgress.current = false;
          setIsSubmitting(false);
          setIsRestartingHml(false);
        }

        if (readyToEmit && isCurrent()) {
          toast.info('Tentativa anterior conferida. Iniciando nova emissão fiscal em homologação…');
          await handleEmit(false, false, undefined, true);
        }
      },
      (errors) => {
        if (isCurrent()) toast.error(Object.values(flattenFormErrors(errors))[0]);
      }
    );
  };

  const handleAbandonHmlTlsAttempt = async () => {
    await handleStartFreshHmlEmission();
  };

  return {
    handleStartFreshHmlEmission,
    handleAbandonHmlTlsAttempt,
  };
}
