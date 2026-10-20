import type Order from '@/pages/types/order.type';
import { parseFiscalNumberConflict } from '../../../../../../shared-utils/fiscalNumbering';
import { withNfeEmissionStage } from '../../../../../../src/telemetry/nfeEmissionPerformance';
import { supabase } from '../../supabaseConfig';
import {
  fiscalEmissionRequestIds,
  fiscalReplacementSources,
  fiscalSupersedingDocuments,
  fiscalRequestStorageKey,
  fiscalReplacementSourceStorageKey,
  fiscalSupersedingStorageKey,
  buildFiscalItemSelectionPayload,
} from '../nfeEmissionRequestState';
import type { NfeEmissionResult, NfeXmlPreviewProof } from './nfeService.types';
import {
  requiresReconciliation,
  resolveEmissionErrorMessage,
} from './nfeEmissionErrorMessage';

export interface DispatchOrderEmissionParams {
  order: Order;
  environment: 1 | 2;
  productionConfirmed: boolean;
  recipientTaxId?: string;
  finalConsumer?: boolean;
  deliveryByIssuer?: boolean;
  cardNotIntegrated?: boolean;
  transporter?: {
    cnpj?: string;
    cpf?: string;
    name: string;
    ie?: string;
    address?: string;
    city?: string;
    uf?: string;
  };
  freightMode?: '0' | '1' | '2' | '3' | '4' | '9';
  hasTransport?: boolean;
  transportResponsible?: 'OWN_COMPANY' | 'CUSTOMER' | 'THIRD_PARTY';
  freightContractResponsible?: 'SENDER' | 'RECIPIENT' | 'THIRD_PARTY';
  recipientIe?: string;
  recipientIeIndicator?: '1' | '2' | '9';
  requestedNumber?: number;
  previewOptions: {
    previewOnly?: boolean;
    previewProof?: NfeXmlPreviewProof;
    existingEmissionRequestId?: string;
  };
}

export async function dispatchOrderEmission({
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
}: DispatchOrderEmissionParams): Promise<NfeEmissionResult> {
  const previewOnly = previewOptions.previewOnly === true;
  const existingEmissionRequestId = previewOptions.existingEmissionRequestId;

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
