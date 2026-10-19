import { ACCESS_KEY_PATTERN } from '../../../../../shared-utils/fiscalIdentifiers.js';
import type Order from '@/pages/types/order.type';
import {
  isFiscalNumber,
  parseFiscalNumberConflict,
  type FiscalNumberConflict,
} from '../../../../../shared-utils/fiscalNumbering';
import { withNfeEmissionStage } from '../../../../../src/telemetry/nfeEmissionPerformance';
import { supabase } from '../supabaseConfig';
import { canIssueCce } from './nfeCce';
import { DEFAULT_NFE_ENVIRONMENT } from './nfeEnvironment';
import type { NfeValidationResult } from './nfeValidator';
import {
  fiscalEmissionRequestIds,
  fiscalReplacementSources,
  fiscalSupersedingDocuments,
  fiscalRequestStorageKey,
  fiscalReplacementSourceStorageKey,
  fiscalSupersedingStorageKey,
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
};
export type { OrderCancellationFiscalEffectsResult };

export interface NfeEmissionResult {
  success: boolean;
  preview?: boolean;
  previewProof?: NfeXmlPreviewProof;
  emissionRequestId?: string;
  documentId?: string;
  orderId?: string;
  accessKey?: string;
  nfeNumber?: number;
  series?: string;
  model?: '55' | '65';
  environment?: 1 | 2;
  protocolNumber?: string;
  protocolDate?: string;
  xml?: string;
  danfeData?: import('./danfeGenerator').DanfeData;
  danfeUnavailableReason?: string;
  error?: string;
  pending?: boolean;
  hmlConfirmedNotFound?: boolean;
  hmlNewEmissionRequired?: boolean;
  hmlCanAbandonTlsFailure?: boolean;
  preparationReconciled?: boolean;
  fiscalMismatchFields?: Array<{
    field: string;
    snapshotValue?: string;
    currentValue?: string;
  }>;
  supersedesDocumentId?: string;
  cStat?: string;
  diagnosticId?: string;
  diagnosticStage?: string;
  databaseCode?: string;
  databaseReason?: string;
  transportDiagnostic?: { code: string; httpStatus?: number; tlsReason?: string };
  reservationRecoveryRequired?: boolean;
  diagnosticCategory?: string;
  diagnosticHint?: string;
  retryDocumentId?: string;
  numberReserved?: boolean;
  sefazContacted?: boolean;
  sefazMessage?: string;
  validation?: NfeValidationResult;
  numberConflict?: FiscalNumberConflict;
  technicalDetails?: {
    apiCode?: string;
    httpStatus?: number;
    transportCode?: string;
    diagnosticStage?: string;
    diagnosticId?: string;
    databaseCode?: string;
    sefazCode?: string;
  };
}

export type NfeXmlPreviewProof = {
  fingerprint: string;
  capturedAt: string;
  issuedAt: string;
  model: '55' | '65';
  series: string;
  number: number;
  accessKey: string;
};

export async function abandonUntransmittedHmlAttempt(
  orderId: string,
  documentId: string,
  emissionRequestId: string,
  currentFiscalChoices: ReturnType<typeof buildFiscalItemSelectionPayload>
): Promise<{ success: true; alreadyAbandoned: boolean } | { success: false; error: string }> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token)
    return { success: false, error: 'Faça login novamente para encerrar a tentativa fiscal.' };

  const response = await fetch('/api/nfe/abandon-hml-attempt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({
      orderId,
      documentId,
      emissionRequestId,
      environment: 2,
      ...currentFiscalChoices,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success !== true)
    return {
      success: false,
      error:
        typeof result.error === 'string'
          ? result.error
          : 'Não foi possível encerrar a tentativa anterior com segurança.',
    };
  return { success: true, alreadyAbandoned: result.alreadyAbandoned === true };
}

function requiresReconciliation(
  status: number,
  result: {
    pending?: boolean;
    code?: string;
    numberReserved?: boolean;
    sefazContacted?: boolean;
  }
): boolean {
  if (
    result.pending ||
    [
      'HML_TRANSMISSION_UNCERTAIN',
      'HML_RECONCILIATION_REQUIRED',
      'SEFAZ_TRANSPORT_FAILED',
    ].includes(result.code || '')
  )
    return true;
  if (result.numberReserved === false && result.sefazContacted === false) return false;
  return status >= 500;
}

const EMISSION_CODE_MESSAGES: ReadonlyArray<{ codes: readonly string[]; message: string }> = [
  {
    codes: ['HML_TRANSMISSION_UNCERTAIN', 'FISCAL_TRANSMISSION_UNCERTAIN'],
    message:
      'Houve falha de conexão e a SEFAZ não respondeu. Consulte a tentativa para verificar se a nota foi autorizada.',
  },
  {
    codes: ['HML_CONFIRMED_NOT_FOUND', 'FISCAL_CONFIRMED_NOT_FOUND'],
    message:
      'A consulta retornou 217: a nota não consta na SEFAZ. Você pode retransmitir o mesmo documento.',
  },
  {
    codes: ['HML_RECONCILIATION_REQUIRED', 'FISCAL_RECONCILIATION_REQUIRED'],
    message:
      'Existe uma tentativa anterior sem confirmação da SEFAZ. Consulte a situação antes de emitir novamente.',
  },
  {
    codes: ['HML_NEW_EMISSION_REQUIRED'],
    message:
      'A NFC-e original não consta, mas seu horário de emissão expirou. Gere uma nova tentativa com horário e numeração atuais.',
  },
];

/** Resolve a mensagem exibida ao operador a partir da resposta da API interna de emissão. */
function resolveEmissionErrorMessage(
  result: {
    code?: string;
    error?: unknown;
    xMotivo?: unknown;
    blockers?: unknown;
    reservationRecoveryRequired?: boolean;
  },
  activeAttemptConflict: boolean
): string {
  if (activeAttemptConflict) {
    return result.reservationRecoveryRequired
      ? 'Já existe uma reserva fiscal para este pedido. Retome a reserva existente para preservar a numeração.'
      : 'Já existe uma tentativa fiscal em andamento para este pedido. Consulte o status antes de emitir novamente.';
  }
  const known = EMISSION_CODE_MESSAGES.find(({ codes }) => codes.includes(result.code ?? ''));
  if (known) return known.message;

  const blockersDetail =
    Array.isArray(result.blockers) && result.blockers.length
      ? result.blockers
          .map((b: { message?: string; code?: string }) => b.message || b.code)
          .filter(Boolean)
          .join('; ')
      : undefined;
  if (blockersDetail) return blockersDetail;
  if (typeof result.error === 'string') return result.error;
  if (typeof result.xMotivo === 'string') return result.xMotivo;
  return 'A SEFAZ não confirmou a emissão fiscal.';
}

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
    let requestDispatched = false;
    let retryResult: {
      success?: boolean;
      documentId?: string;
      orderId?: string;
      accessKey?: string;
      nfeNumber?: number | string;
      series?: string;
      model?: string;
      environment?: 1 | 2;
      signedXml?: string;
      pending?: boolean;
      cStat?: string;
      xMotivo?: string;
      protocolNumber?: string;
      protocolDate?: string;
      error?: string;
      code?: string;
      numberConflict?: unknown;
      transportDiagnostic?: { code?: string; httpStatus?: number; tlsReason?: string };
    } = {};
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token)
        throw new Error('Faça login novamente para retransmitir o documento fiscal.');
      requestDispatched = true;
      const response = await fetch('/api/nfe/emit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ retryDocumentId, productionConfirmed }),
      });
      retryResult = await response.json().catch(() => ({}));

      const retryMetadata = {
        documentId:
          typeof retryResult.documentId === 'string' ? retryResult.documentId : retryDocumentId,
        orderId: typeof retryResult.orderId === 'string' ? retryResult.orderId : undefined,
        accessKey: typeof retryResult.accessKey === 'string' ? retryResult.accessKey : undefined,
        nfeNumber: Number.isFinite(Number(retryResult.nfeNumber))
          ? Number(retryResult.nfeNumber)
          : undefined,
        series: typeof retryResult.series === 'string' ? retryResult.series : undefined,
        model: (retryResult.model === '55' || retryResult.model === '65'
          ? retryResult.model
          : undefined) as '55' | '65' | undefined,
        environment:
          retryResult.environment === 1 || retryResult.environment === 2
            ? retryResult.environment
            : undefined,
      };
      const resultFields = {
        ...retryMetadata,
        xml: typeof retryResult.signedXml === 'string' ? retryResult.signedXml : undefined,
        pending: requiresReconciliation(response.status, retryResult),
        cStat: retryResult.cStat,
        sefazMessage: retryResult.xMotivo,
        numberConflict:
          retryResult.code === 'NFE_NUMBER_ALREADY_USED'
            ? parseFiscalNumberConflict(retryResult.numberConflict)
            : undefined,
        hmlNewEmissionRequired: retryResult.code === 'HML_NEW_EMISSION_REQUIRED',
        hmlConfirmedNotFound:
          typeof retryResult.code === 'string' &&
          ['HML_CONFIRMED_NOT_FOUND', 'FISCAL_CONFIRMED_NOT_FOUND'].includes(retryResult.code),
        transportDiagnostic: retryResult.transportDiagnostic
          ? {
              ...retryResult.transportDiagnostic,
              code: retryResult.transportDiagnostic.code || 'UNKNOWN_TRANSPORT_ERROR',
            }
          : undefined,
      };

      if (!response.ok || !retryResult.success)
        return {
          success: false,
          ...resultFields,
          error:
            retryResult.error ||
            retryResult.xMotivo ||
            'A SEFAZ não confirmou a retransmissão do documento.',
        };

      if (
        !retryMetadata.accessKey ||
        !ACCESS_KEY_PATTERN.test(retryMetadata.accessKey) ||
        !retryMetadata.nfeNumber ||
        !retryMetadata.series ||
        !retryMetadata.model ||
        !retryMetadata.environment
      )
        return {
          success: false,
          ...resultFields,
          pending: true,
          error:
            'A SEFAZ confirmou a retransmissão, mas a resposta não trouxe os dados fiscais originais. Consulte o documento antes de qualquer nova tentativa.',
        };

      return {
        success: true,
        ...resultFields,
        accessKey: retryMetadata.accessKey,
        nfeNumber: retryMetadata.nfeNumber,
        series: retryMetadata.series,
        model: retryMetadata.model as '55' | '65',
        environment: retryMetadata.environment,
        protocolNumber: retryResult.protocolNumber,
        protocolDate: retryResult.protocolDate,
        danfeUnavailableReason:
          'A retransmissão preserva o XML fiscal original; o DANFE precisa ser gerado diretamente do documento armazenado.',
      };
    } catch (error) {
      return {
        success: false,
        documentId: retryDocumentId,
        pending: requestDispatched || Boolean(retryResult?.pending),
        error: error instanceof Error ? error.message : 'Falha ao retransmitir documento fiscal.',
      };
    }
  }

  let dispatchedRequestId: string | undefined;
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.access_token)
      throw new Error('Sessão fiscal expirada.');
    const requestKey = `${String(order.id || '')}:outbound:${environment}`;
    const storageKey = fiscalRequestStorageKey(requestKey);
    const replacementSourceKey = fiscalReplacementSourceStorageKey(requestKey);
    let storedRequestId: string | null = null;
    try {
      storedRequestId =
        typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
    } catch {
      /* storage indisponível */
    }
    let hasReplacementSource = Boolean(fiscalReplacementSources.get(requestKey));
    if (!hasReplacementSource) {
      try {
        hasReplacementSource = Boolean(
          typeof window !== 'undefined' && window.localStorage.getItem(replacementSourceKey)
        );
      } catch {
        /* sem storage, a fonte pode permanecer em memória */
      }
    }
    const emissionRequestId =
      existingEmissionRequestId ||
      (hasReplacementSource
        ? crypto.randomUUID()
        : fiscalEmissionRequestIds.get(requestKey) ||
          (storedRequestId && /^[0-9a-f-]{36}$/i.test(storedRequestId) ? storedRequestId : null) ||
          crypto.randomUUID());
    fiscalEmissionRequestIds.set(requestKey, emissionRequestId);
    try {
      if (typeof window !== 'undefined')
        window.localStorage.setItem(storageKey, emissionRequestId);
    } catch {
      /* storage indisponível */
    }
    const perRequestSupersedesKey = fiscalSupersedingStorageKey(requestKey, emissionRequestId);
    let supersedesDocumentId = fiscalSupersedingDocuments.get(perRequestSupersedesKey) || null;
    try {
      if (!supersedesDocumentId && typeof window !== 'undefined')
        supersedesDocumentId = window.localStorage.getItem(perRequestSupersedesKey);
      if (!supersedesDocumentId) {
        const replacementSource =
          fiscalReplacementSources.get(requestKey) ||
          (typeof window !== 'undefined'
            ? window.localStorage.getItem(replacementSourceKey)
            : null);
        if (replacementSource) {
          supersedesDocumentId = replacementSource;
          fiscalReplacementSources.delete(requestKey);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(perRequestSupersedesKey, replacementSource);
            window.localStorage.removeItem(replacementSourceKey);
          }
        }
      }
      if (supersedesDocumentId)
        fiscalSupersedingDocuments.set(perRequestSupersedesKey, supersedesDocumentId);
    } catch {
      /* sem armazenamento local, a API ainda valida a linhagem no banco */
    }
    dispatchedRequestId = emissionRequestId;
    const requestBody = await withNfeEmissionStage(
      'payload_prepare',
      () => {
        const { itemCsosnOverrides, itemFiscalSelections } =
          buildFiscalItemSelectionPayload(order);
        const requestedFinalConsumer = finalConsumer ?? order.fiscalContext?.finalConsumer;
        return JSON.stringify({
          orderId: String(order.id || ''),
          environment,
          productionConfirmed,
          emissionRequestId,
          ...(supersedesDocumentId ? { supersedesDocumentId } : {}),
          ...(Object.keys(itemCsosnOverrides).length ? { itemCsosnOverrides } : {}),
          ...(Object.keys(itemFiscalSelections).length ? { itemFiscalSelections } : {}),
          ...(recipientTaxId === undefined ? {} : { recipientTaxId }),
          ...(recipientIe === undefined ? {} : { recipientIe }),
          ...(recipientIeIndicator === undefined ? {} : { recipientIeIndicator }),
          ...(requestedFinalConsumer === undefined
            ? {}
            : { finalConsumer: requestedFinalConsumer }),
          ...(deliveryByIssuer === undefined ? {} : { deliveryByIssuer }),
          ...(transporter ? { transporter } : {}),
          ...(freightMode ? { freightMode } : {}),
          ...(hasTransport === undefined ? {} : { hasTransport }),
          ...(transportResponsible === undefined ? {} : { transportResponsible }),
          ...(freightContractResponsible === undefined ? {} : { freightContractResponsible }),
          ...(cardNotIntegrated === undefined ? {} : { cardNotIntegrated }),
          ...(requestedNumber === undefined ? {} : { requestedNumber }),
          ...(previewOnly ? { previewOnly: true } : {}),
          ...(previewOptions.previewProof ? { previewProof: previewOptions.previewProof } : {}),
        });
      },
      { environment }
    );
    const response = await withNfeEmissionStage(
      'backend_request',
      () =>
        fetch('/api/nfe/emit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: requestBody,
        }),
      { environment }
    );
    const result = await response.json().catch(() => ({}));
    if (response.ok && result.success === true && result.preview === true) {
      const proof = result.previewProof;
      if (
        typeof proof?.fingerprint !== 'string' ||
        typeof proof?.capturedAt !== 'string' ||
        typeof proof?.issuedAt !== 'string' ||
        (proof?.model !== '55' && proof?.model !== '65') ||
        typeof proof?.series !== 'string' ||
        !Number.isInteger(proof?.number) ||
        typeof proof?.accessKey !== 'string' ||
        typeof result.signedXml !== 'string'
      )
        return {
          success: false,
          environment,
          error: 'O servidor não retornou uma prévia fiscal completa.',
        };
      return {
        success: true,
        preview: true,
        previewProof: proof as NfeXmlPreviewProof,
        emissionRequestId,
        orderId: String(order.id || ''),
        accessKey: proof.accessKey,
        nfeNumber: proof.number,
        series: proof.series,
        model: proof.model,
        environment,
        xml: result.signedXml,
        numberReserved: false,
        sefazContacted: false,
      };
    }
    const numberConflict =
      result.code === 'NFE_NUMBER_ALREADY_USED'
        ? parseFiscalNumberConflict(result.numberConflict)
        : undefined;
    const activeAttemptConflict = result.databaseReason === 'ALREADY_ACTIVE_FISCAL_ATTEMPT';
    if (
      activeAttemptConflict &&
      typeof result.emissionRequestId === 'string' &&
      /^[0-9a-f-]{36}$/i.test(result.emissionRequestId)
    ) {
      fiscalEmissionRequestIds.set(requestKey, result.emissionRequestId);
      try {
        if (typeof window !== 'undefined')
          window.localStorage.setItem(storageKey, result.emissionRequestId);
      } catch {
        /* armazenamento indisponível */
      }
    }
    const freshIntentionRequired = Boolean(numberConflict) && !activeAttemptConflict;
    if (freshIntentionRequired) {
      // Um conflito de numeração confirmado autoriza uma intenção corrigida; reservas ativas não.
      fiscalEmissionRequestIds.delete(requestKey);
      try {
        if (typeof window !== 'undefined') window.localStorage.removeItem(storageKey);
      } catch {
        /* storage indisponível */
      }
    }
    if (
      result.success === false &&
      !activeAttemptConflict &&
      result.pending !== true &&
      ((Boolean(result.cStat) &&
        !['100', '101', '102', '103', '104', '105', '204', '217'].includes(result.cStat)) ||
        result.code === 'HML_SEFAZ_REJECTED')
    ) {
      // Rejeição confirmada encerra a tentativa. O próximo clique usará um novo request ID.
      fiscalEmissionRequestIds.delete(requestKey);
      try {
        if (typeof window !== 'undefined') window.localStorage.removeItem(storageKey);
      } catch {
        /* storage indisponível */
      }
    }
    const metadata = {
      emissionRequestId:
        typeof result.emissionRequestId === 'string'
          ? result.emissionRequestId
          : emissionRequestId,
      documentId: typeof result.documentId === 'string' ? result.documentId : undefined,
      orderId: typeof result.orderId === 'string' ? result.orderId : undefined,
      accessKey: typeof result.accessKey === 'string' ? result.accessKey : undefined,
      nfeNumber: Number.isInteger(result.nfeNumber) ? result.nfeNumber : undefined,
      series: typeof result.series === 'string' ? result.series : undefined,
      model: result.model === '55' || result.model === '65' ? result.model : undefined,
      environment,
      xml: typeof result.signedXml === 'string' ? result.signedXml : undefined,
      protocolNumber:
        typeof result.protocolNumber === 'string' ? result.protocolNumber : undefined,
      protocolDate: typeof result.protocolDate === 'string' ? result.protocolDate : undefined,
      pending: activeAttemptConflict || requiresReconciliation(response.status, result),
      hmlConfirmedNotFound: ['HML_CONFIRMED_NOT_FOUND', 'FISCAL_CONFIRMED_NOT_FOUND'].includes(
        result.code
      ),
      hmlNewEmissionRequired: result.code === 'HML_NEW_EMISSION_REQUIRED',
      hmlCanAbandonTlsFailure: result.hmlCanAbandonTlsFailure === true,
      fiscalMismatchFields: Array.isArray(result.fiscalMismatchFields)
        ? result.fiscalMismatchFields.filter(
            (field: unknown) =>
              field &&
              typeof field === 'object' &&
              typeof (field as { field?: unknown }).field === 'string'
          )
        : undefined,
      reservationRecoveryRequired: result.reservationRecoveryRequired === true,
      numberReserved:
        typeof result.numberReserved === 'boolean' ? result.numberReserved : undefined,
      sefazContacted:
        typeof result.sefazContacted === 'boolean' ? result.sefazContacted : undefined,
      cStat: typeof result.cStat === 'string' ? result.cStat : undefined,
      transportDiagnostic:
        result.transportDiagnostic && typeof result.transportDiagnostic === 'object'
          ? {
              code:
                typeof result.transportDiagnostic.code === 'string'
                  ? result.transportDiagnostic.code
                  : 'UNKNOWN_TRANSPORT_ERROR',
              httpStatus: Number.isInteger(result.transportDiagnostic.httpStatus)
                ? result.transportDiagnostic.httpStatus
                : undefined,
              tlsReason:
                typeof result.transportDiagnostic.tlsReason === 'string'
                  ? result.transportDiagnostic.tlsReason
                  : undefined,
            }
          : undefined,
      sefazMessage: typeof result.xMotivo === 'string' ? result.xMotivo : undefined,
      diagnosticId: typeof result.diagnosticId === 'string' ? result.diagnosticId : undefined,
      diagnosticStage:
        typeof result.diagnosticStage === 'string' ? result.diagnosticStage : undefined,
      databaseCode: typeof result.databaseCode === 'string' ? result.databaseCode : undefined,
      databaseReason:
        typeof result.databaseReason === 'string' ? result.databaseReason : undefined,
      diagnosticCategory:
        typeof result.diagnosticCategory === 'string' ? result.diagnosticCategory : undefined,
      diagnosticHint:
        typeof result.diagnosticHint === 'string' ? result.diagnosticHint : undefined,
      numberConflict,
      technicalDetails: {
        ...(typeof result.code === 'string' ? { apiCode: result.code } : {}),
        httpStatus: response.status,
        ...(typeof result.transportDiagnostic?.code === 'string'
          ? { transportCode: result.transportDiagnostic.code }
          : {}),
        ...(typeof result.diagnosticStage === 'string'
          ? { diagnosticStage: result.diagnosticStage }
          : {}),
        ...(typeof result.diagnosticId === 'string' ? { diagnosticId: result.diagnosticId } : {}),
        ...(typeof result.databaseCode === 'string' ? { databaseCode: result.databaseCode } : {}),
        ...(typeof result.cStat === 'string' ? { sefazCode: result.cStat } : {}),
      },
    };
    if (response.ok && result.success === true)
      return {
        success: true,
        ...metadata,
        danfeUnavailableReason: 'DANFE deve ser gerado do XML fiscal persistido no backend.',
      };
    const logFn =
      response.status >= 500 &&
      result.code !== 'HML_TRANSMISSION_UNCERTAIN' &&
      result.code !== 'HML_RECONCILIATION_REQUIRED'
        ? console.error
        : console.warn;
    const resultClassification =
      result.success === false && metadata.cStat && !metadata.pending
        ? 'SEFAZ_REJECTION'
        : metadata.pending
          ? 'FISCAL_ATTEMPT_PENDING'
          : 'FISCAL_API_FAILURE';
    logFn('[NFe Service] Retorno da API interna de emissão', {
      endpoint: '/api/nfe/emit',
      httpStatus: response.status,
      ...(typeof result.code === 'string' ? { apiCode: result.code } : { resultClassification }),
      ...(typeof result.error === 'string'
        ? { apiMessage: result.error.replace(/[\r\n\t]+/g, ' ').slice(0, 300) }
        : {}),
      ...(typeof metadata.cStat === 'string' ? { sefazCode: metadata.cStat } : {}),
      diagnosticId: metadata.diagnosticId,
      diagnosticStage: metadata.diagnosticStage,
      databaseCode: metadata.databaseCode,
      databaseReason:
        typeof result.databaseReason === 'string' ? result.databaseReason : undefined,
      diagnosticCategory: metadata.diagnosticCategory,
      diagnosticHint: metadata.diagnosticHint,
      transportDiagnostic: metadata.transportDiagnostic,
      emissionRequestId,
      model: metadata.model,
      environment,
    });
    const errorMessage = resolveEmissionErrorMessage(result, activeAttemptConflict);
    return { success: false, ...metadata, error: errorMessage };
  } catch (error) {
    return {
      success: false,
      environment,
      emissionRequestId: dispatchedRequestId,
      pending: Boolean(dispatchedRequestId),
      error: dispatchedRequestId
        ? 'A resposta da emissão não foi confirmada. Consulte a tentativa existente antes de emitir novamente.'
        : error instanceof Error
          ? error.message
          : 'Falha ao solicitar emissão fiscal.',
    };
  }
}
