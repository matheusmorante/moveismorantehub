import type Order from '@/pages/types/order.type';
import { parseFiscalItemSelections } from '../../../../../shared-utils/fiscalItemSelections';
import {
  isFiscalNumber,
  parseFiscalNumberConflict,
} from '../../../../../shared-utils/fiscalNumbering';
import { withNfeEmissionStage } from '../../../../../src/telemetry/nfeEmissionPerformance';
import { type AppSettings, getSettings } from '../settingsService';
import { supabase } from '../supabaseConfig';
import { type DanfeData, openDanfePrintWindow } from './danfeGenerator';
import { getFiscalCancellationPolicy } from './fiscalCancellationPolicy';
import { canIssueCce } from './nfeCce';
import { DEFAULT_NFE_ENVIRONMENT } from './nfeEnvironment';
import { getAuthorizedAt } from './nfeEventRules';
import type { NfeValidationResult } from './nfeValidator';

export { canIssueCce };

const fiscalEmissionRequestIds = new Map<string, string>();
const fiscalReplacementSources = new Map<string, string>();
const fiscalSupersedingDocuments = new Map<string, string>();
const fiscalRequestStorageKey = (requestKey: string) => `nfe-emission-request:${requestKey}`;
const fiscalReplacementSourceStorageKey = (requestKey: string) =>
  `nfe-emission-replacement-source:${requestKey}`;
const fiscalSupersedingStorageKey = (requestKey: string, requestId: string) =>
  `nfe-emission-supersedes:${requestKey}:${requestId}`;

export const clearFiscalEmissionRequest = (orderId: string, environment: 1 | 2) => {
  const k = `${orderId}:outbound:${environment}`;
  const requestId = fiscalEmissionRequestIds.get(k);
  fiscalEmissionRequestIds.delete(k);
  if (requestId) fiscalSupersedingDocuments.delete(fiscalSupersedingStorageKey(k, requestId));
  try {
    if (typeof window !== 'undefined') {
      const storedRequestId = window.localStorage.getItem(fiscalRequestStorageKey(k));
      window.localStorage.removeItem(fiscalRequestStorageKey(k));
      if (requestId || storedRequestId)
        window.localStorage.removeItem(
          fiscalSupersedingStorageKey(k, requestId || storedRequestId || '')
        );
    }
  } catch {
    /* armazenamento indisponível */
  }
};

export function setFiscalEmissionReplacementSource(
  orderId: string,
  environment: 1 | 2,
  documentId: string
) {
  const requestKey = `${orderId}:outbound:${environment}`;
  fiscalReplacementSources.set(requestKey, documentId);
  try {
    if (typeof window !== 'undefined')
      window.localStorage.setItem(fiscalReplacementSourceStorageKey(requestKey), documentId);
  } catch {
    /* armazenamento indisponível */
  }
}

export function buildFiscalItemSelectionPayload(order: Order) {
  const productItems = (order.items || []).filter((item) => item.itemType !== 'service');
  const itemCsosnOverrides = Object.fromEntries(
    productItems.flatMap((item, index) => {
      const fiscal = item.fiscal as Record<string, unknown> | undefined;
      return fiscal?.csosnSource === 'manual' && fiscal.cst
        ? [[String(index + 1), String(fiscal.cst)]]
        : [];
    })
  );
  const itemFiscalSelections = parseFiscalItemSelections(
    Object.fromEntries(
      productItems.flatMap((item, index) => {
        const fiscal = item.fiscal;
        return fiscal
          ? [
              [
                String(index + 1),
                {
                  ncm: fiscal.ncm,
                  cfop: fiscal.cfop,
                  origem: fiscal.origem,
                  cest: fiscal.cest ?? '',
                  csosn: fiscal.cst,
                },
              ],
            ]
          : [];
      })
    )
  );
  return { itemCsosnOverrides, itemFiscalSelections };
}

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

export const FISCAL_NUMBER_PREVIEW_TTL_MS = 30_000;
const fiscalNumberPreviewCache = new Map<string, { nextNumber: number; timestamp: number }>();
const fiscalNumberPreviewRequests = new Map<string, Promise<number>>();

function cacheFiscalNumberPreview(cacheKey: string, nextNumber: number) {
  const cached = fiscalNumberPreviewCache.get(cacheKey);
  if (cached && nextNumber < cached.nextNumber) return;
  fiscalNumberPreviewCache.set(cacheKey, { nextNumber, timestamp: Date.now() });
}

export function updateFiscalNumberPreviewCache(
  model: '55' | '65',
  environment: 1 | 2,
  series: string,
  nextNumber: number
) {
  const cacheKey = `${environment}:${model}:${series}`;
  cacheFiscalNumberPreview(cacheKey, nextNumber);
}

export function getCachedFiscalNumberPreview(
  model: '55' | '65',
  environment: 1 | 2,
  series: string
): number | null {
  const cacheKey = `${environment}:${model}:${series}`;
  const cached = fiscalNumberPreviewCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < FISCAL_NUMBER_PREVIEW_TTL_MS) {
    return cached.nextNumber;
  }
  return null;
}

/** Read-only sequence preview; the emission endpoint reserves the final number atomically. */
export async function getNextNfeNumberPreview(
  model: '55' | '65',
  environment: 1 | 2,
  series: string,
  minimumNumber: number
): Promise<number> {
  const cacheKey = `${environment}:${model}:${series}`;
  const cached = fiscalNumberPreviewCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < FISCAL_NUMBER_PREVIEW_TTL_MS) {
    return cached.nextNumber;
  }

  const requestKey = `${cacheKey}:${minimumNumber}`;
  const existingRequest = fiscalNumberPreviewRequests.get(requestKey);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token)
      throw new Error('Faça login novamente para consultar a numeração fiscal.');
    const query = new URLSearchParams({
      model,
      environment: String(environment),
      series,
      minimumNumber: String(minimumNumber),
    });
    const response = await fetch(`/api/nfe/reserve-number?${query}`, {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
      cache: 'no-store',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !Number.isInteger(result.nextNumber))
      throw new Error(result.error || 'Não foi possível consultar a numeração fiscal.');

    cacheFiscalNumberPreview(cacheKey, result.nextNumber);
    return result.nextNumber;
  })();
  fiscalNumberPreviewRequests.set(requestKey, request);

  try {
    return await request;
  } finally {
    if (fiscalNumberPreviewRequests.get(requestKey) === request) {
      fiscalNumberPreviewRequests.delete(requestKey);
    }
  }
}

export interface NfeEmissionResult {
  success: boolean;
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
  danfeData?: DanfeData;
  danfeUnavailableReason?: string;
  error?: string;
  pending?: boolean;
  hmlConfirmedNotFound?: boolean;
  hmlNewEmissionRequired?: boolean;
  hmlCanAbandonTlsFailure?: boolean;
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
  numberConflict?: import('../../../../../shared-utils/fiscalNumbering').FiscalNumberConflict;
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

/** Resolve only the durable document belonging to this exact intention; never emits or clears it. */
export async function findFiscalDocumentForRequest(
  orderId: string,
  environment: 1 | 2,
  emissionRequestId: string
): Promise<string> {
  if (!/^[0-9a-f-]{36}$/i.test(emissionRequestId))
    throw new Error('Identificador da tentativa fiscal inválido.');
  const { data, error } = await supabase
    .from('nfe_documents')
    .select('id')
    .eq('order_id', orderId)
    .eq('ambiente', environment)
    .eq('emission_request_id', emissionRequestId)
    .maybeSingle();
  if (error || !data?.id)
    throw new Error(
      'A tentativa ainda não pode ser localizada. Aguarde e consulte novamente; a intenção original foi preservada.'
    );
  return data.id;
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
  recipientIeIndicator?: '1' | '2' | '9'
): Promise<NfeEmissionResult> {
  const environment: 1 | 2 = customEnvironment ?? DEFAULT_NFE_ENVIRONMENT;
  if (requestedNumber !== undefined && (!isFiscalNumber(requestedNumber) || retryDocumentId))
    return { success: false, environment, error: 'Informe um número de nota fiscal válido.' };
  if (!retryDocumentId && environment === 1 && !productionConfirmed) {
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
        hmlConfirmedNotFound: ['HML_CONFIRMED_NOT_FOUND', 'FISCAL_CONFIRMED_NOT_FOUND'].includes(
          retryResult.code
        ),
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
        !/^\d{44}$/.test(retryMetadata.accessKey) ||
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

  if (!retryDocumentId) {
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
      const emissionRequestId = hasReplacementSource
        ? crypto.randomUUID()
        : fiscalEmissionRequestIds.get(requestKey) ||
          (storedRequestId && /^[0-9a-f-]{36}$/i.test(storedRequestId) ? storedRequestId : null) ||
          crypto.randomUUID();
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
          });
        },
        { environment }
      );
      const response = await fetch('/api/nfe/emit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: requestBody,
      });
      const result = await response.json().catch(() => ({}));
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
        // A confirmed numbering conflict permits a corrected intention; active reserves do not.
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
        // A confirmed series/IE rejection ends this intention. The next explicit click
        // uses a new request; the database links it and preserves the rejected XML.
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
      const blockersDetail =
        Array.isArray(result.blockers) && result.blockers.length
          ? result.blockers
              .map((b: any) => b.message || b.code)
              .filter(Boolean)
              .join('; ')
          : undefined;
      let errorMessage =
        blockersDetail ||
        (typeof result.error === 'string'
          ? result.error
          : typeof result.xMotivo === 'string'
            ? result.xMotivo
            : 'A SEFAZ não confirmou a emissão fiscal.');
      if (activeAttemptConflict) {
        errorMessage = result.reservationRecoveryRequired
          ? 'Já existe uma reserva fiscal para este pedido. Retome a reserva existente para preservar a numeração.'
          : 'Já existe uma tentativa fiscal em andamento para este pedido. Consulte o status antes de emitir novamente.';
      } else if (
        ['HML_TRANSMISSION_UNCERTAIN', 'FISCAL_TRANSMISSION_UNCERTAIN'].includes(result.code)
      ) {
        errorMessage =
          'Houve falha de conexão e a SEFAZ não respondeu. Consulte a tentativa para verificar se a nota foi autorizada.';
      } else if (['HML_CONFIRMED_NOT_FOUND', 'FISCAL_CONFIRMED_NOT_FOUND'].includes(result.code)) {
        errorMessage =
          'A consulta retornou 217: a nota não consta na SEFAZ. Você pode retransmitir o mesmo documento.';
      } else if (
        ['HML_RECONCILIATION_REQUIRED', 'FISCAL_RECONCILIATION_REQUIRED'].includes(result.code)
      ) {
        errorMessage =
          'Existe uma tentativa anterior sem confirmação da SEFAZ. Consulte a situação antes de emitir novamente.';
      } else if (result.code === 'HML_NEW_EMISSION_REQUIRED') {
        errorMessage =
          'A NFC-e original não consta, mas seu horário de emissão expirou. Gere uma nova tentativa com horário e numeração atuais.';
      }
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

  throw new Error('Fluxo fiscal inválido.');
}

/**
 * Abre o DANFE de um pedido que já teve NF-e emitida
 */
export async function printOrderDanfe(order: Order): Promise<void> {
  const settings: AppSettings = await getSettings();
  const nfeData = (order as any).nfeData;
  if (!nfeData) {
    throw new Error('Este pedido ainda não possui NF-e emitida.');
  }
  if (
    !/^\d{44}$/.test(nfeData.accessKey || '') ||
    !/^\d{15}$/.test(nfeData.protocolNumber || '') ||
    !nfeData.protocolDate ||
    !nfeData.series ||
    !nfeData.nfeNumber ||
    !['55', '65'].includes(nfeData.model) ||
    ![1, 2].includes(nfeData.environment) ||
    !['autorizada', 'homologada'].includes(nfeData.status)
  )
    throw new Error(
      'Dados de autorização incompletos. Consulte o documento fiscal antes de imprimir o DANFE.'
    );

  openDanfePrintWindow({
    order,
    settings,
    accessKey: nfeData.accessKey,
    nfeNumber: nfeData.nfeNumber,
    series: nfeData.series,
    protocolNumber: nfeData.protocolNumber,
    protocolDate: nfeData.protocolDate,
    model: nfeData.model,
    environment: nfeData.environment,
    status: nfeData.status,
  });
}

/**
 * Avalia se o documento fiscal é elegível para cancelamento fiscal direto
 * Regra: Cancelamento fiscal só é válido se a mercadoria NÃO circulou/saiu e dentro das regras da UF/Modelo
 */
export function canCancelFiscalDocument(doc: {
  status?: string;
  modelo?: '55' | '65';
  created_at?: string;
  xml_protocolo?: string;
  ambiente?: 1 | 2;
  isMerchandiseDelivered?: boolean;
}): { canCancel: boolean; reason?: string } {
  if (!doc) return { canCancel: false, reason: 'Documento não informado' };
  if (
    !['autorizada', 'homologada'].includes(doc.status || '') ||
    (doc.status === 'homologada' && doc.ambiente !== 2)
  ) {
    return { canCancel: false, reason: 'Apenas notas autorizadas podem ser canceladas' };
  }
  const environment = doc.ambiente === 2 ? 2 : 1;
  const policy = getFiscalCancellationPolicy({
    model: String(doc.modelo || ''),
    authorizedAt: getAuthorizedAt(doc.xml_protocolo, doc.created_at || ''),
    status: String(doc.status || ''),
    environment,
    goodsCirculated: Boolean(doc.isMerchandiseDelivered),
    operationDidNotOccur: true,
  });
  if (policy.action !== 'cancel') {
    return {
      canCancel: false,
      reason: policy.reason || 'A NF-e não está elegível para cancelamento.',
    };
  }
  return { canCancel: true };
}

export async function processOrderCancellationFiscalEffects(
  orderId: string,
  orderCode: string,
  options: { reason?: string; productionConfirmed?: boolean } = {}
): Promise<{
  action: 'none' | 'cancel' | 'estorno';
  draftId?: string;
  cStat?: string;
  protocolNumber?: string;
  protocolDate?: string;
  xMotivo?: string;
  reconciliationRequired?: boolean;
}> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (sessionError || !token) throw new Error('Sessão inválida para processar o documento fiscal.');

  const reason =
    options.reason?.trim() ||
    `Pedido #${orderCode} cancelado; operação não realizada e mercadoria não circulou.`;
  const policyResponse = await fetch('/api/nfe/order-cancellation-policy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orderId }),
  });
  const policy = await policyResponse.json();
  if (!policyResponse.ok)
    throw new Error(policy.error || 'Não foi possível decidir o efeito fiscal.');
  if (policy.action === 'none') return { action: 'none' };

  const endpoint = policy.action === 'cancel' ? '/api/nfe/cancel' : '/api/nfe/operation-drafts';
  const body =
    policy.action === 'cancel'
      ? {
          documentId: policy.documentId,
          reason,
          productionConfirmed: options.productionConfirmed ?? true,
          viaOrderCancellation: true,
        }
      : {
          kind: 'estorno',
          originalDocumentId: policy.documentId,
          environment: policy.environment,
          reason,
          operationDidNotOccur: true,
          goodsDidNotCirculate: true,
          viaOrderCancellation: true,
        };
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok || result.success === false)
    throw new Error(result.error || 'Não foi possível aplicar o efeito fiscal do pedido.');
  return policy.action === 'estorno'
    ? { action: 'estorno', draftId: String(result.draftId || '') }
    : {
        action: 'cancel',
        cStat: typeof result.cStat === 'string' ? result.cStat : undefined,
        protocolNumber:
          typeof result.protocolNumber === 'string' ? result.protocolNumber : undefined,
        protocolDate: typeof result.protocolDate === 'string' ? result.protocolDate : undefined,
        xMotivo: typeof result.xMotivo === 'string' ? result.xMotivo : undefined,
        reconciliationRequired: result.reconciliationRequired === true,
      };
}

/**
 * Avalia se o documento fiscal permite emissão de Carta de Correção (CC-e)
 * Regra estrita: CC-e é permitida EXCLUSIVAMENTE para NF-e (Mod. 55). NFC-e (Mod. 65) NÃO aceita CC-e (Rejeição SEFAZ).
 */
