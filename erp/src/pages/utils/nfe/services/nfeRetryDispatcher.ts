import { ACCESS_KEY_PATTERN } from '../../../../../../shared-utils/fiscalIdentifiers.js';
import { parseFiscalNumberConflict } from '../../../../../../shared-utils/fiscalNumbering';
import { supabase } from '../../supabaseConfig';
import type { NfeEmissionResult } from './nfeService.types';
import { requiresReconciliation } from './nfeEmissionErrorMessage';

export async function dispatchNfeRetry(
  retryDocumentId: string,
  productionConfirmed: boolean
): Promise<NfeEmissionResult> {
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
