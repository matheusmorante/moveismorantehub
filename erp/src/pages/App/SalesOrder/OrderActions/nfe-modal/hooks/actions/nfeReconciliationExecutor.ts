import { toast } from 'react-toastify';
import type Order from '@/pages/types/order.type';
import {
  clearFiscalEmissionRequest,
  type NfeEmissionResult,
} from '@/pages/utils/nfe/nfeService';
import {
  consultSefazStatus,
  executeAbandonHmlTlsAttempt,
} from '../../services/nfeReconciliationService';
import { withTimeout } from '../../../../../../../../../shared-utils/withTimeout';
import type { NfeItemWithFiscal } from '../../NfeItemsSection';

export interface ExecuteReconcileParams {
  orderId: string;
  environment: 1 | 2;
  documentId?: string;
  emissionRequestId?: string;
  emissionResult: NfeEmissionResult | null;
  isCurrent: () => boolean;
  setEmissionResult: React.Dispatch<React.SetStateAction<NfeEmissionResult | null>>;
  onSuccess?: (result: NfeEmissionResult) => void;
}

export async function executeReconcileOperation({
  orderId,
  environment,
  documentId,
  emissionRequestId,
  emissionResult,
  isCurrent,
  setEmissionResult,
  onSuccess,
}: ExecuteReconcileParams): Promise<unknown> {
  try {
    const outcome = await withTimeout(
      consultSefazStatus(orderId, environment, {
        ...emissionResult,
        documentId,
        emissionRequestId,
      }),
      30_000,
      null,
      'nfe:consultar-tentativa'
    );
    if (!isCurrent()) return null;
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
    if (!isCurrent()) return null;
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
  }
}

export interface ExecuteHmlRestartParams {
  kind: 'tls_untransmitted' | 'confirmed_not_found';
  order: Order;
  environment: 1 | 2;
  documentId?: string;
  emissionRequestId?: string;
  nfeItems: NfeItemWithFiscal[];
  isCurrent: () => boolean;
  setManualNumberInput: (val: string | null) => void;
  setEmissionResult: React.Dispatch<React.SetStateAction<NfeEmissionResult | null>>;
}

export async function executeHmlRestartOperation({
  kind,
  order,
  environment,
  documentId,
  emissionRequestId,
  nfeItems,
  isCurrent,
  setManualNumberInput,
  setEmissionResult,
}: ExecuteHmlRestartParams): Promise<boolean> {
  let readyToEmit = false;
  try {
    if (kind === 'tls_untransmitted') {
      readyToEmit = await executeAbandonHmlTlsAttempt(
        order,
        environment,
        documentId!,
        emissionRequestId!,
        nfeItems,
        isCurrent
      );
    } else {
      clearFiscalEmissionRequest(String(order.id), environment);
      readyToEmit = true;
    }
    if (!isCurrent() || !readyToEmit) return false;
    setManualNumberInput(null);
    setEmissionResult(null);
    return true;
  } catch (error) {
    if (!isCurrent()) return false;
    const message =
      error instanceof Error
        ? error.message
        : 'Não foi possível confirmar o encerramento da tentativa anterior. Consulte a situação fiscal.';
    toast.error(message);
    setEmissionResult((previous) =>
      previous
        ? {
            ...previous,
            error: message,
            pending: true,
            hmlCanAbandonTlsFailure: false,
            hmlNewEmissionRequired: false,
          }
        : null
    );
    return false;
  }
}
