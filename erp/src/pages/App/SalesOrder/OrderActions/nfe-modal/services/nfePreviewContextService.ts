import { toast } from 'react-toastify';
import type Order from '@/pages/types/order.type';
import { getFiscalIssuePresentation } from '@/pages/utils/nfe/fiscalIssuePresentation';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import type { resolveTransport } from '../../../../../../../../shared-utils/fiscalTransportModel';
import type { NfeItemWithFiscal } from '../NfeItemsSection';
import type { ThirdPartyTransporterForm } from '../NfeTransportSection';

export function notifyEmissionIssue(result: NfeEmissionResult) {
  const issue = getFiscalIssuePresentation(result);
  const message = `${issue.title}. ${issue.description}`;

  if (issue.tone === 'attention') {
    toast.warning(message);
  } else if (issue.tone === 'info') {
    toast.info(message);
  } else {
    toast.error(message);
  }
}

export function createPreviewContextKey(params: {
  order: Order | null;
  environment: 1 | 2;
  currentModel: '55' | '65';
  nfeItems: NfeItemWithFiscal[];
  finalConsumer?: boolean;
  recipientTaxId: string;
  recipientIe?: string;
  recipientIeIndicator?: '1' | '2' | '9';
  resolvedTransport: ReturnType<typeof resolveTransport>;
  thirdPartyTransporter: ThirdPartyTransporterForm;
  manualNumberInput: string | null;
}): string {
  const {
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
  } = params;

  return JSON.stringify({
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
    manualNumberInput,
  });
}

export function buildFailedEmissionResult(err: unknown): NfeEmissionResult {
  const errObj = err as Record<string, unknown>;
  return {
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
}
