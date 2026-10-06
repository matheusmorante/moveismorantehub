import { supabase } from '@/pages/utils/supabaseConfig';
import {
  FISCAL_DOCUMENTS_PAGE_SIZE,
  type CancellationEligibility,
  type FiscalDocumentFilters,
  type FiscalDocumentDetails,
  type FiscalDocumentEventSummary,
  type NfeDocumentRecord,
} from '../types/fiscalDocuments.types';
import { parseFiscalXmlDetails } from '../utils/fiscalXmlParser';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw new Error('Histórico fiscal com dados inválidos em ' + field + '.');
  }
  return value;
}

function parseFiscalDocumentEvent(value: unknown): FiscalDocumentEventSummary {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.event_type !== 'string' ||
    typeof value.status !== 'string' ||
    typeof value.requested_at !== 'string' ||
    (value.attempt_number !== null &&
      value.attempt_number !== undefined &&
      typeof value.attempt_number !== 'number')
  ) {
    throw new Error('Histórico fiscal com dados inválidos.');
  }

  return {
    id: value.id,
    event_type: value.event_type,
    status: value.status,
    requested_at: value.requested_at,
    attempt_number: typeof value.attempt_number === 'number' ? value.attempt_number : null,
    cstat: nullableString(value.cstat, 'cstat'),
    xmotivo: nullableString(value.xmotivo, 'xmotivo'),
    requested_by: nullableString(value.requested_by, 'requested_by'),
    protocol_number: nullableString(value.protocol_number, 'protocol_number'),
    justification: nullableString(value.justification, 'justification'),
  };
}

export interface FetchFiscalDocumentsParams {
  filters: FiscalDocumentFilters;
  pageIndex: number;
  targetDocumentId?: string | null;
}

export interface FetchFiscalDocumentsResult {
  documents: NfeDocumentRecord[];
  totalCount: number;
  orderNumbers: Record<string, number>;
  cancellationEligibility: Record<string, CancellationEligibility>;
}

export async function fetchFiscalDocumentsList({
  filters,
  pageIndex,
  targetDocumentId,
}: FetchFiscalDocumentsParams): Promise<FetchFiscalDocumentsResult> {
  let orderIds: string[] = [];
  const normalizedSearch = filters.search.trim();

  if (/^#?\d{1,12}$/.test(normalizedSearch)) {
    const orderNumber = Number(normalizedSearch.replace(/^#/, ''));
    const { data: matchingOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', orderNumber)
      .limit(50);
    orderIds = (matchingOrders || []).map((order) => String(order.id));
  }

  let query = supabase
    .from('nfe_documents')
    .select(
      'id,order_id,numero_nfe,serie,chave_acesso,modelo,ambiente,status,motivo_status,numero_protocolo,valor_total,destinatario_nome,destinatario_documento,created_at,updated_at,document_type,fiscal_ruleset_version,supersedes_document_id',
      { count: 'exact' }
    );

  if (targetDocumentId) query = query.eq('id', targetDocumentId);
  if (filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.model !== 'all') query = query.eq('modelo', filters.model);
  if (filters.environment !== 'all') query = query.eq('ambiente', Number(filters.environment));
  if (filters.series.trim()) query = query.eq('serie', filters.series.trim());
  if (filters.dateFrom) query = query.gte('created_at', `${filters.dateFrom}T00:00:00-03:00`);
  if (filters.dateTo) {
    const endExclusive = Date.parse(`${filters.dateTo}T00:00:00-03:00`) + 24 * 60 * 60 * 1000;
    query = query.lt('created_at', new Date(endExclusive).toISOString());
  }

  if (normalizedSearch) {
    const safeSearch = normalizedSearch.replace(/[,%*()\\"]/g, ' ').trim();
    const alternatives: string[] = [];
    const numericSearch = normalizedSearch.replace(/^#/, '');

    if (/^\d{1,9}$/.test(numericSearch)) {
      alternatives.push(`numero_nfe.eq.${Number(numericSearch)}`);
    }
    if (safeSearch) {
      alternatives.push(
        `chave_acesso.ilike.%${safeSearch}%`,
        `destinatario_nome.ilike.%${safeSearch}%`,
        `destinatario_documento.ilike.%${safeSearch}%`
      );
    }
    const safeOrderIds = orderIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    if (safeOrderIds.length) {
      alternatives.push(`order_id.in.(${safeOrderIds.join(',')})`);
    }

    if (alternatives.length) {
      query = query.or(alternatives.join(','));
    } else {
      return {
        documents: [],
        totalCount: 0,
        orderNumbers: {},
        cancellationEligibility: {},
      };
    }
  }

  const from = pageIndex * FISCAL_DOCUMENTS_PAGE_SIZE;
  const to = from + FISCAL_DOCUMENTS_PAGE_SIZE - 1;
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error || !data) {
    return {
      documents: [],
      totalCount: 0,
      orderNumbers: {},
      cancellationEligibility: {},
    };
  }

  const documents = data as NfeDocumentRecord[];
  const totalCount = count || 0;

  // Carregar número de pedidos vinculados
  let orderNumbers: Record<string, number> = {};
  const ids = [...new Set(documents.map((doc) => doc.order_id).filter(Boolean))];
  if (ids.length) {
    const { data: orders } = await supabase
      .from('orders')
      .select('id,order_number')
      .in('id', ids);
    orderNumbers = Object.fromEntries(
      (orders || []).map((order) => [String(order.id), Number(order.order_number)])
    );
  }

  // Carregar política de elegibilidade de cancelamento
  let cancellationEligibility: Record<string, CancellationEligibility> = {};
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (!sessionError && sessionData.session?.access_token && documents.length) {
    try {
      const eligibilityResponse = await fetch('/api/nfe/order-cancellation-policy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ documentIds: documents.map((doc) => doc.id) }),
      });
      if (eligibilityResponse.ok) {
        const eligibilityResult = await eligibilityResponse.json();
        cancellationEligibility = eligibilityResult.documents || {};
      }
    } catch (err) {
      console.warn('Falha ao consultar política de cancelamento:', err);
    }
  }

  return {
    documents,
    totalCount,
    orderNumbers,
    cancellationEligibility,
  };
}

export async function fetchFiscalDocumentDetails(
  documentId: string
): Promise<FiscalDocumentDetails> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('Faça login novamente para consultar os detalhes fiscais.');
  }

  const response = await fetch('/api/nfe/document-details', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({ documentId }),
  });

  const result: unknown = await response.json();
  if (!response.ok) {
    const message = isRecord(result) && typeof result.error === 'string' ? result.error : null;
    throw new Error(message || 'Não foi possível carregar os detalhes fiscais.');
  }
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
    !['autorizada', 'homologada', 'cancelada', 'rejeitada', 'pendente', 'erro', 'abandoned'].includes(
      String(result.document.status)
    ) ||
    typeof result.document.created_at !== 'string' ||
    typeof result.document.updated_at !== 'string'
  ) {
    throw new Error('Resposta inválida ao carregar os detalhes fiscais.');
  }

  const document: FiscalDocumentDetails['document'] = {
    id: result.document.id,
    order_id: result.document.order_id,
    numero_nfe: result.document.numero_nfe,
    serie: result.document.serie,
    chave_acesso: result.document.chave_acesso,
    modelo: result.document.modelo,
    ambiente: result.document.ambiente,
    status: result.document.status as NfeDocumentRecord['status'],
    motivo_status: nullableString(result.document.motivo_status, 'motivo_status') || undefined,
    numero_protocolo: nullableString(result.document.numero_protocolo, 'numero_protocolo'),
    valor_total:
      typeof result.document.valor_total === 'number'
        ? result.document.valor_total
        : undefined,
    destinatario_nome:
      nullableString(result.document.destinatario_nome, 'destinatario_nome') || undefined,
    destinatario_documento:
      nullableString(result.document.destinatario_documento, 'destinatario_documento') || undefined,
    created_at: result.document.created_at,
    updated_at: result.document.updated_at,
    document_type:
      typeof result.document.document_type === 'string' ? result.document.document_type : undefined,
    xml_nfe: nullableString(result.document.xml_nfe, 'xml_nfe'),
    xml_protocolo: nullableString(result.document.xml_protocolo, 'xml_protocolo'),
  };
  const events = result.events.map(parseFiscalDocumentEvent);

  return {
    document,
    events,
    parsedXml: parseFiscalXmlDetails(document.xml_nfe || ''),
  };
}
