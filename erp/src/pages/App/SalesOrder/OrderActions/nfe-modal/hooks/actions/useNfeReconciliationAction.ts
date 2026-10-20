import { toast } from 'react-toastify';
import type React from 'react';
import type Order from '@/pages/types/order.type';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { nfeEmissionConsultFormSchema } from '../../../../../../../../../shared-utils/nfeEmissionFormValidation';
import { executeReconcileOperation } from './nfeReconciliationExecutor';
import type { FiscalOperationOwner } from './actions.types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

interface UseNfeReconciliationActionParams {
  order: Order | null;
  environment: 1 | 2;
  canOperateFiscal: boolean;
  canOperateFiscalRef: React.MutableRefObject<boolean>;
  submissionInProgress: React.MutableRefObject<boolean>;
  operationOwner: React.MutableRefObject<FiscalOperationOwner>;
  emissionResult: NfeEmissionResult | null;
  lastEmissionProductionConfirmation: React.MutableRefObject<boolean>;
  setIsSubmitting: (submitting: boolean) => void;
  setEmissionResult: React.Dispatch<React.SetStateAction<NfeEmissionResult | null>>;
  onSuccess?: (result: NfeEmissionResult) => void;
  handleEmit: (
    productionConfirmed?: boolean,
    isRetry?: boolean,
    retryNumber?: number,
    freshHmlEmission?: boolean,
    previewOnly?: boolean,
    existingEmissionRequestId?: string
  ) => Promise<void>;
}

export function useNfeReconciliationAction({
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
}: UseNfeReconciliationActionParams) {
  const consultForm = useZodForm(nfeEmissionConsultFormSchema, {
    orderId: String(order?.id || ''),
    environment,
  });

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
    const reconciled = await consultForm.validateAndRun(
      {
        orderId: String(order.id),
        environment,
        documentId: emissionResult.documentId,
        emissionRequestId: emissionResult.emissionRequestId,
        resultOrderId: emissionResult.orderId,
        resultEnvironment: emissionResult.environment,
      },
      async (values) => {
        if (
          operationOwner.current !== owner ||
          submissionInProgress.current ||
          !canOperateFiscalRef.current
        )
          return;

        submissionInProgress.current = true;
        setIsSubmitting(true);
        try {
          return await executeReconcileOperation({
            orderId: values.orderId,
            environment: values.environment as 1 | 2,
            documentId: values.documentId,
            emissionRequestId: values.emissionRequestId,
            emissionResult,
            isCurrent: () => operationOwner.current === owner && canOperateFiscalRef.current,
            setEmissionResult,
            onSuccess,
          });
        } finally {
          submissionInProgress.current = false;
          setIsSubmitting(false);
        }
      },
      (errors) => {
        if (operationOwner.current === owner)
          toast.error(Object.values(flattenFormErrors(errors))[0]);
      }
    );
    return reconciled === false ? null : reconciled;
  };

  return { handleReconcile };
}
