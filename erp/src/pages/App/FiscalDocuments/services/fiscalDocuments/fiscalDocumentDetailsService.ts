import { supabase } from '@/pages/utils/supabaseConfig';
import { parseNfeApiResponse } from '@/pages/utils/nfe/parseNfeApiResponse';
import type { FiscalDocumentDetails } from '../../types/fiscalDocuments.types';
import { parseFiscalXmlDetails } from '../../utils/fiscalXmlParser';
import {
  isRecord,
  mapFiscalDocumentDetailsRecord,
  mapNfeDocumentRecord,
  mapOperationDraftSummary,
  parseFiscalDocumentEvent,
  parseOrderFiscalSituation,
} from './fiscalDocumentParsers';
import { fetchFiscalDocumentDetailsFromSupabase } from './fiscalDocumentFallbackService';

function validateApiDetailsPayload(result: unknown): asserts result is {
  success: true;
  document: Record<string, unknown>;
  events: unknown[];
  operationDrafts?: unknown[];
  linkedDocuments?: unknown[];
  orderEmissions?: unknown[];
  fiscalSituation?: unknown;
} {
  if (
    !isRecord(result) ||
    result.success !== true ||
    !isRecord(result.document) ||
    !Array.isArray(result.events) ||
    typeof result.document.id !== 'string' ||
    (result.document.order_id !== null && typeof result.document.order_id !== 'string') ||
    typeof result.document.numero_nfe !== 'number' ||
    typeof result.document.serie !== 'string' ||
    typeof result.document.chave_acesso !== 'string' ||
    (result.document.modelo !== '55' && result.document.modelo !== '65') ||
    (result.document.ambiente !== 1 && result.document.ambiente !== 2) ||
    ![
      'autorizada',
      'homologada',
      'cancelada',
      'rejeitada',
      'pendente',
      'erro',
      'abandoned',
    ].includes(String(result.document.status)) ||
    typeof result.document.created_at !== 'string' ||
    typeof result.document.updated_at !== 'string'
  ) {
    throw new Error('Resposta inválida ao carregar os detalhes fiscais.');
  }
}

export async function fetchFiscalDocumentDetails(
  documentId: string
): Promise<FiscalDocumentDetails> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('Faça login novamente para consultar os detalhes fiscais.');
  }

  let result: Record<string, any>;
  try {
    const response = await fetch('/api/nfe/document-details', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({ documentId }),
      signal: AbortSignal.timeout(8000),
    });

    result = await parseNfeApiResponse<Record<string, any>>(
      response,
      'Não foi possível carregar os detalhes fiscais.'
    );
    if (!response.ok) {
      const message = isRecord(result) && typeof result.error === 'string' ? result.error : null;
      throw new Error(message || 'Não foi possível carregar os detalhes fiscais.');
    }
  } catch (apiError: unknown) {
    console.warn(
      'Falha na rota /api/nfe/document-details, acionando consulta direta ao Supabase:',
      apiError
    );
    return fetchFiscalDocumentDetailsFromSupabase(documentId);
  }

  validateApiDetailsPayload(result);

  const document = mapFiscalDocumentDetailsRecord(result.document);
  const events = result.events.map(parseFiscalDocumentEvent);
  const operationDrafts = Array.isArray(result.operationDrafts)
    ? result.operationDrafts.map(mapOperationDraftSummary)
    : undefined;
  const linkedDocuments = Array.isArray(result.linkedDocuments)
    ? result.linkedDocuments.map((ld) => mapNfeDocumentRecord(ld, 'estorno'))
    : [];
  const orderEmissions = Array.isArray(result.orderEmissions)
    ? result.orderEmissions.map((em) => mapNfeDocumentRecord(em, 'outbound'))
    : [];

  return {
    document,
    events,
    parsedXml: parseFiscalXmlDetails(document.xml_nfe || ''),
    operationDrafts,
    linkedDocuments,
    orderEmissions,
    fiscalSituation: parseOrderFiscalSituation(result.fiscalSituation),
  };
}
