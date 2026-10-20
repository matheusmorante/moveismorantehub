import type Order from '@/pages/types/order.type';
import { isFiscalNumber } from '../../../../../shared-utils/fiscalNumbering';
import { canIssueCce } from './nfeCce';
import { DEFAULT_NFE_ENVIRONMENT } from './nfeEnvironment';
import {
  clearFiscalEmissionRequest,
  setFiscalEmissionReplacementSource,
  buildFiscalItemSelectionPayload,
  findFiscalDocumentForRequest,
} from './nfeEmissionRequestState';
import {
  FISCAL_NUMBER_PREVIEW_TTL_MS,
  updateFiscalNumberPreviewCache,
  getCachedFiscalNumberPreview,
  getNextNfeNumberPreview,
} from './nfeNumberPreviewService';
import { printOrderDanfe } from './orderDanfePrintService';
import {
  canCancelFiscalDocument,
  processOrderCancellationFiscalEffects,
  type OrderCancellationFiscalEffectsResult,
} from './orderCancellationFiscalService';
import type { NfeEmissionResult, NfeXmlPreviewProof } from './services/nfeService.types';
import { abandonUntransmittedHmlAttempt } from './services/nfeHmlAbandonService';
import { dispatchNfeRetry } from './services/nfeRetryDispatcher';
import { dispatchOrderEmission } from './services/nfeOrderEmissionDispatcher';

// Re-exports para manter 100% de retrocompatibilidade com a API de módulos e testes existentes
export {
  canIssueCce,
  clearFiscalEmissionRequest,
  setFiscalEmissionReplacementSource,
  buildFiscalItemSelectionPayload,
  findFiscalDocumentForRequest,
  FISCAL_NUMBER_PREVIEW_TTL_MS,
  updateFiscalNumberPreviewCache,
  getCachedFiscalNumberPreview,
  getNextNfeNumberPreview,
  printOrderDanfe,
  canCancelFiscalDocument,
  processOrderCancellationFiscalEffects,
  abandonUntransmittedHmlAttempt,
};

export type { NfeEmissionResult, NfeXmlPreviewProof, OrderCancellationFiscalEffectsResult };

/**
 * Solicita a emissão ao Fiscal Core do backend; o navegador não monta o documento.
 */
export async function emitNfeForOrder(
  order: Order,
  customEnvironment?: 1 | 2,
  productionConfirmed = false,
  retryDocumentId?: string,
  requestedNumber?: number,
  _originalItemNcms: string[] = [],
  recipientTaxId?: string,
  finalConsumer?: boolean,
  deliveryByIssuer?: boolean,
  cardNotIntegrated?: boolean,
  transporter?: {
    cnpj?: string;
    cpf?: string;
    name: string;
    ie?: string;
    address?: string;
    city?: string;
    uf?: string;
  },
  freightMode?: '0' | '1' | '2' | '3' | '4' | '9',
  hasTransport?: boolean,
  transportResponsible?: 'OWN_COMPANY' | 'CUSTOMER' | 'THIRD_PARTY',
  freightContractResponsible?: 'SENDER' | 'RECIPIENT' | 'THIRD_PARTY',
  _forceNewIntent = false,
  recipientIe?: string,
  recipientIeIndicator?: '1' | '2' | '9',
  previewOptions: {
    previewOnly?: boolean;
    previewProof?: NfeXmlPreviewProof;
    existingEmissionRequestId?: string;
  } = {}
): Promise<NfeEmissionResult> {
  const environment: 1 | 2 = customEnvironment ?? DEFAULT_NFE_ENVIRONMENT;
  const previewOnly = previewOptions.previewOnly === true;
  const existingEmissionRequestId = previewOptions.existingEmissionRequestId;

  if (
    existingEmissionRequestId !== undefined &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      existingEmissionRequestId
    )
  )
    return { success: false, environment, error: 'Identificador da tentativa fiscal inválido.' };

  if (requestedNumber !== undefined && (!isFiscalNumber(requestedNumber) || retryDocumentId))
    return { success: false, environment, error: 'Informe um número de nota fiscal válido.' };

  if (!previewOnly && !retryDocumentId && environment === 1 && !productionConfirmed) {
    return {
      success: false,
      error: 'Confirme explicitamente a transmissão em Produção antes de emitir.',
    };
  }

  if (retryDocumentId) {
    return dispatchNfeRetry(retryDocumentId, productionConfirmed);
  }

  return dispatchOrderEmission({
    order,
    environment,
    productionConfirmed,
    recipientTaxId,
    finalConsumer,
    deliveryByIssuer,
    cardNotIntegrated,
    transporter,
    freightMode,
    hasTransport,
    transportResponsible,
    freightContractResponsible,
    recipientIe,
    recipientIeIndicator,
    requestedNumber,
    previewOptions,
  });
}
