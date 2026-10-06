import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type Item from '@/pages/types/items.type';
import type Order from '@/pages/types/order.type';
import {
  clearFiscalEmissionRequest,
  emitNfeForOrder,
  type NfeEmissionResult,
  printOrderDanfe,
  updateFiscalNumberPreviewCache,
} from '@/pages/utils/nfe/nfeService';
import { getFiscalIssuePresentation } from '@/pages/utils/nfe/fiscalIssuePresentation';
import type { DeliveryMethod } from '../../../../../../../../shared-utils/fiscalTransportModel';
import type { resolveOrderFiscalModel } from '../../../../../../../../shared-utils/fiscalDocumentModel';
import type { resolveTransport } from '../../../../../../../../shared-utils/fiscalTransportModel';
import type { NfeItemWithFiscal } from '../NfeItemsSection';
import type { ThirdPartyTransporterForm } from '../NfeTransportSection';
import {
  emissionContexts,
  type FiscalFieldError,
  type NfeSequencePreviewState,
} from '../types/nfeEmission.types';
import { validateNfeEmission } from '../services/nfeValidationService';
import {
  consultSefazStatus,
  executeAbandonHmlTlsAttempt,
} from '../services/nfeReconciliationService';

function notifyEmissionFailure(result: NfeEmissionResult) {
  const issue = getFiscalIssuePresentation(result);
  toast.error(`${issue.title}. ${issue.description}`);
}

export interface UseNfeEmissionActionsProps {
  order: Order | null;
  environment: 1 | 2;
  canOperateFiscal: boolean;
  modelDecision: ReturnType<typeof resolveOrderFiscalModel> | null;
  currentModel: '55' | '65';
  deliveryMethod: DeliveryMethod;
  finalConsumer: boolean;
  contextKey: string;
  nfeItems: NfeItemWithFiscal[];
  isLoadingFiscalData: boolean;
  fiscalPreparationError: string | null;
  nfeNumberSequence: { model: '55' | '65'; series: string | null; environment: 1 | 2 };
  manualNumberInput: string | null;
  recipientTaxId: string;
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
  finalConsumer,
  contextKey,
  nfeItems,
  isLoadingFiscalData,
  fiscalPreparationError,
  nfeNumberSequence,
  manualNumberInput,
  recipientTaxId,
  resolvedTransport,
  thirdPartyTransporter,
  onSuccess,
  setRecipientTaxIdError,
  setNumberPreviewState,
  setManualNumberInput,
}: UseNfeEmissionActionsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emissionResult, setEmissionResult] = useState<NfeEmissionResult | null>(null);
  const [fiscalFieldError, setFiscalFieldError] = useState<FiscalFieldError | null>(null);
  const submissionInProgress = useRef(false);

  const handleEmit = async (
    productionConfirmed = false,
    isRetry = false,
    retryNumber?: number,
    freshHmlEmission = false
  ) => {
    if (submissionInProgress.current) return;
    if (!canOperateFiscal) {
      toast.error('Seu perfil não pode operar documentos fiscais.');
      return;
    }
    if (!order) return;

    if (modelDecision?.status !== 'ready') {
      toast.error(modelDecision?.reason || 'Confirme os dados da operação fiscal.');
      return;
    }

    const retryId =
      isRetry && emissionResult?.hmlConfirmedNotFound && emissionResult.documentId
        ? emissionResult.documentId
        : undefined;

    const manualNumber =
      retryId || freshHmlEmission
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
      toast.error(validation.toastError);
    }
    if (!validation.valid) return;

    setFiscalFieldError(null);
    emissionContexts.set(contextKey, { finalConsumer });
    submissionInProgress.current = true;
    setIsSubmitting(true);

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
        freshHmlEmission
      );

      if (!res.success) {
        setEmissionResult(res);
        if (res.pending !== true) notifyEmissionFailure(res);
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
      const errObj = err as Record<string, unknown>;
      const failedResult: NfeEmissionResult = {
        success: false,
        pending: errObj?.pending === true,
        error: (typeof errObj?.message === 'string' ? errObj.message : '') || 'Ocorreu um erro ao processar a emissão fiscal.',
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
            ? { transportCode: (errObj?.transportDiagnostic as Record<string, unknown>).code as string }
            : {}),
        },
      };
      setEmissionResult(failedResult);
      if (failedResult.pending !== true) notifyEmissionFailure(failedResult);
    } finally {
      submissionInProgress.current = false;
      setIsSubmitting(false);
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
          error instanceof Error ? error.message : 'Não foi possível iniciar a nova tentativa fiscal.';
        setEmissionResult((previous) => (previous ? { ...previous, error: message } : null));
      } finally {
        submissionInProgress.current = false;
        setIsSubmitting(false);
      }

      if (readyToEmit) await handleEmit(false, false, undefined, true);
      return;
    }

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
    emissionResult,
    fiscalFieldError,
    clearFiscalFieldError: () => setFiscalFieldError(null),
    handleEmit,
    handleReconcile,
    handleStartFreshHmlEmission,
    handleAbandonHmlTlsAttempt,
    handlePrintDanfe,
  };
}
