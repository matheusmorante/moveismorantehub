import { supabase } from '@/pages/utils/supabaseConfig';
import {
  abandonUntransmittedHmlAttempt,
  buildFiscalItemSelectionPayload,
  clearFiscalEmissionRequest,
  findFiscalDocumentForRequest,
  setFiscalEmissionReplacementSource,
  type NfeEmissionResult,
} from '@/pages/utils/nfe/nfeService';
import type Order from '@/pages/types/order.type';
import type Item from '@/pages/types/items.type';
import type { NfeItemWithFiscal } from '../NfeItemsSection';

export interface SefazConsultOutcome {
  state: 'authorized' | 'rejected' | 'not_found' | 'error' | 'pending';
  updatedResult: Partial<NfeEmissionResult>;
  toastSuccess?: string;
  toastError?: string;
}

export async function consultSefazStatus(
  orderId: string,
  environment: 1 | 2,
  currentResult: NfeEmissionResult
): Promise<SefazConsultOutcome> {
  const documentId =
    currentResult.documentId ||
    (await findFiscalDocumentForRequest(orderId, environment, currentResult.emissionRequestId!));

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('Faça login novamente.');
  }

  const response = await fetch('/api/nfe/consult', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({ documentId }),
  });

  const result = await response.json();
  const confirmedNotFound =
    ['HML_CONFIRMED_NOT_FOUND', 'HML_NEW_EMISSION_REQUIRED'].includes(result.code) &&
    result.state === 'not_found' &&
    result.pending === false;

  const confirmedRejection =
    result.pending === false &&
    [
      'HML_SEFAZ_REJECTED',
      'HML_SERIES_CORRECTION_REQUIRED',
      'HML_ISSUER_IE_CORRECTION_REQUIRED',
      'NFE_NUMBER_ALREADY_USED',
    ].includes(result.code);

  if (confirmedRejection) {
    clearFiscalEmissionRequest(orderId, environment);
    return {
      state: 'rejected',
      updatedResult: {
        documentId,
        pending: false,
        hmlConfirmedNotFound: false,
        databaseReason: undefined,
        cStat: result.cStat,
        sefazMessage: result.xMotivo,
        error: result.error || result.xMotivo || 'Tentativa rejeitada pela SEFAZ.',
        technicalDetails: {
          ...currentResult.technicalDetails,
          ...(typeof result.code === 'string' ? { apiCode: result.code } : {}),
          ...(typeof result.cStat === 'string' ? { sefazCode: result.cStat } : {}),
          ...(typeof result.diagnosticId === 'string' ? { diagnosticId: result.diagnosticId } : {}),
          httpStatus: response.status,
        },
      },
    };
  }

  if ((!response.ok && !confirmedNotFound) || (!result.success && !confirmedNotFound)) {
    return {
      state: 'error',
      updatedResult: {
        documentId,
        pending: result.pending !== false,
        hmlConfirmedNotFound: false,
        error:
          typeof result.error === 'string'
            ? result.error
            : typeof result.xMotivo === 'string'
              ? result.xMotivo
              : 'A consulta não confirmou o estado da nota. Consulte novamente antes de emitir.',
        technicalDetails: {
          ...currentResult.technicalDetails,
          ...(typeof result.code === 'string' ? { apiCode: result.code } : {}),
          ...(typeof result.diagnosticStage === 'string'
            ? { diagnosticStage: result.diagnosticStage }
            : {}),
          ...(typeof result.diagnosticId === 'string' ? { diagnosticId: result.diagnosticId } : {}),
          ...(typeof result.transportDiagnostic?.code === 'string'
            ? { transportCode: result.transportDiagnostic.code }
            : {}),
          ...(typeof result.cStat === 'string' ? { sefazCode: result.cStat } : {}),
          httpStatus: response.status,
        },
      },
    };
  }

  if (result.state === 'authorized') {
    return {
      state: 'authorized',
      toastSuccess: 'SEFAZ confirmou a autorização do documento! Protocolo recuperado.',
      updatedResult: {
        documentId,
        success: true,
        pending: false,
        protocolNumber: result.protocolNumber,
        protocolDate: result.protocolDate,
        error: undefined,
      },
    };
  }

  if (result.state === 'not_found') {
    const needsNewEmission =
      result.code === 'HML_NEW_EMISSION_REQUIRED' && result.safeNewEmission === true;
    return {
      state: 'not_found',
      updatedResult: {
        documentId,
        pending: false,
        hmlConfirmedNotFound: !needsNewEmission,
        hmlNewEmissionRequired: needsNewEmission,
        error: result.error || result.xMotivo || 'NF-e não consta na SEFAZ. Emita novamente.',
      },
    };
  }

  return {
    state: 'pending',
    updatedResult: {
      documentId,
      pending: result.pending !== false,
      hmlConfirmedNotFound: false,
      error:
        typeof result.error === 'string'
          ? result.error
          : 'A consulta não confirmou o estado da nota. Consulte novamente antes de emitir.',
      cStat: typeof result.cStat === 'string' ? result.cStat : currentResult.cStat,
      sefazMessage:
        typeof result.xMotivo === 'string' ? result.xMotivo : currentResult.sefazMessage,
      technicalDetails: {
        ...currentResult.technicalDetails,
        ...(typeof result.code === 'string' ? { apiCode: result.code } : {}),
        httpStatus: response.status,
      },
    },
  };
}

export async function executeAbandonHmlTlsAttempt(
  order: Order,
  environment: 1 | 2,
  documentId: string,
  emissionRequestId: string,
  nfeItems: NfeItemWithFiscal[]
): Promise<void> {
  const orderWithFiscalItems: Order = {
    ...order,
    items: [
      ...nfeItems.map((item): Item => ({ ...item, fiscal: item.fiscal })),
      ...(order.items || []).filter((item) => item.itemType === 'service'),
    ],
  };

  const fiscalChoices = buildFiscalItemSelectionPayload(orderWithFiscalItems);
  const result = await abandonUntransmittedHmlAttempt(
    String(order.id),
    documentId,
    emissionRequestId,
    fiscalChoices
  );

  if (!result.success) {
    throw new Error(result.error);
  }

  clearFiscalEmissionRequest(String(order.id), environment);
  setFiscalEmissionReplacementSource(String(order.id), environment, documentId);
}
