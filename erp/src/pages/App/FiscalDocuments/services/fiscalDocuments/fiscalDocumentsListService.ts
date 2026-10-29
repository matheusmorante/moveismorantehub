import { supabase } from '@/pages/utils/supabaseConfig';
import { parseNfeApiResponse } from '@/pages/utils/nfe/parseNfeApiResponse';
import {
  FISCAL_DOCUMENTS_PAGE_SIZE,
  type CancellationEligibility,
  type FiscalDocumentFilters,
  type NfeDocumentRecord,
} from '../../types/fiscalDocuments.types';
import { parseFiscalXmlDetails } from '../../utils/fiscalXmlParser';

export interface FetchFiscalDocumentsParams {
  filters: FiscalDocumentFilters;
  pageIndex: number;
  targetDocumentId?: string | null;
  accountantView?: boolean;
}

export interface FetchFiscalDocumentsResult {
  documents: NfeDocumentRecord[];
  totalCount: number;
  orderNumbers: Record<string, number>;
  cancellationEligibility: Record<string, CancellationEligibility>;
}

export interface FiscalDocumentsSummary {
  totalCount: number;
  totalValue: number;
  authorizedCount: number;
  authorizedValue: number;
  canceledCount: number;
  canceledValue: number;
  estornoCount: number;
  estornoValue: number;
  pendingCount: number;
  pendingValue: number;
  rejectedCount: number;
  rejectedValue: number;
  abandonedCount: number;
  abandonedValue: number;
}

const NFE_LIST_COLUMNS =
  'id,order_id,numero_nfe,serie,chave_acesso,modelo,ambiente,status,motivo_status,numero_protocolo,valor_total,destinatario_nome,destinatario_documento,created_at,updated_at,document_type,fiscal_ruleset_version,supersedes_document_id';

async function enrichRecipientsFromFiscalXml(
  documents: NfeDocumentRecord[]
): Promise<NfeDocumentRecord[]> {
  const documentsToResolve = documents.filter((document) => {
    const name = document.destinatario_nome?.trim().toLowerCase();
    return (
      !name ||
      name === 'consumidor' ||
      name === 'consumidor final' ||
      !document.destinatario_documento?.trim()
    );
  });
  if (!documentsToResolve.length) return documents;

  const { data: xmlDocuments, error } = await supabase
    .from('nfe_documents')
    .select('id,xml_nfe')
    .in('id', documentsToResolve.map((document) => document.id))
    .abortSignal(AbortSignal.timeout(8_000));

  if (error) throw error;

  const recipientsById = new Map(
    (xmlDocuments || []).map((document) => [
      String(document.id),
      parseFiscalXmlDetails(document.xml_nfe || '')?.recipient,
    ] as const)
  );

  return documents.map((document) => {
    const currentName = document.destinatario_nome?.trim();
    const nameIsGeneric =
      !currentName || ['consumidor', 'consumidor final'].includes(currentName.toLowerCase());
    const recipient = recipientsById.get(document.id);

    return {
      ...document,
      destinatario_nome:
        (nameIsGeneric ? recipient?.name?.trim() : currentName) || undefined,
      destinatario_documento:
        document.destinatario_documento?.trim() || recipient?.taxId?.trim() || undefined,
    };
  });
}

async function resolveOrderIdsFromSearch(normalizedSearch: string): Promise<string[]> {
  if (!/^#?\d{1,12}$/.test(normalizedSearch)) return [];

  const orderNumber = Number(normalizedSearch.replace(/^#/, ''));
  const { data: matchingOrders, error: matchingOrdersError } = await supabase
    .from('orders')
    .select('id')
    .eq('order_number', orderNumber)
    .limit(50);

  if (matchingOrdersError) throw matchingOrdersError;
  return (matchingOrders || []).map((order) => String(order.id));
}

function buildSearchAlternatives(normalizedSearch: string, orderIds: string[]): string[] {
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

  return alternatives;
}

async function fetchLinkedOrderNumbers(
  documents: NfeDocumentRecord[]
): Promise<Record<string, number>> {
  const ids = [...new Set(documents.map((doc) => doc.order_id).filter(Boolean))];
  if (!ids.length) return {};

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id,order_number')
    .in('id', ids);

  if (ordersError) throw ordersError;
  return Object.fromEntries(
    (orders || []).map((order) => [String(order.id), Number(order.order_number)])
  );
}

async function fetchCancellationEligibilityMap(
  documents: NfeDocumentRecord[]
): Promise<Record<string, CancellationEligibility>> {
  if (!documents.length) return {};

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) return {};

  try {
    const eligibilityResponse = await fetch('/api/nfe/order-cancellation-policy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({ documentIds: documents.map((doc) => doc.id) }),
      signal: AbortSignal.timeout(8000),
    });

    const eligibilityResult = await parseNfeApiResponse<{
      documents?: Record<string, CancellationEligibility>;
      error?: string;
    }>(eligibilityResponse, 'Não foi possível consultar a elegibilidade fiscal.');

    if (!eligibilityResponse.ok) {
      throw new Error(
        eligibilityResult.error || 'Não foi possível consultar a elegibilidade fiscal.'
      );
    }
    return eligibilityResult.documents || {};
  } catch (err) {
    console.warn('Falha ao consultar política de cancelamento:', err);
    return {};
  }
}

export async function fetchFiscalDocumentsList({
  filters,
  pageIndex,
  targetDocumentId,
  accountantView = false,
}: FetchFiscalDocumentsParams): Promise<FetchFiscalDocumentsResult> {
  const normalizedSearch = filters.search.trim();
  const documentType = filters.documentType || 'all';
  const orderIds = await resolveOrderIdsFromSearch(normalizedSearch);

  let query = supabase.from('nfe_documents').select(NFE_LIST_COLUMNS, { count: 'exact' });

  if (targetDocumentId) {
    query = query.eq('id', targetDocumentId);
  } else {
    if (documentType === 'outbound') {
      query = query.or('document_type.eq.outbound,document_type.is.null');
    } else if (documentType === 'estorno') {
      query = query.eq('document_type', 'estorno');
    } else {
      query = query.or(
        'document_type.eq.outbound,document_type.eq.estorno,document_type.is.null'
      );
    }
  }

  if (filters.status === 'autorizada' && accountantView) {
    const authorizationStatuses =
      filters.environment === '1'
        ? ['autorizada']
        : filters.environment === '2'
          ? ['homologada']
          : ['autorizada', 'homologada'];
    query = query.in('status', authorizationStatuses);
  } else if (filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.model !== 'all') query = query.eq('modelo', filters.model);
  if (filters.environment !== 'all') query = query.eq('ambiente', Number(filters.environment));

  if (!targetDocumentId && filters.dateFrom) {
    query = query.gte('created_at', `${filters.dateFrom}T00:00:00-03:00`);
  }
  if (!targetDocumentId && filters.dateTo) {
    const endExclusive = Date.parse(`${filters.dateTo}T00:00:00-03:00`) + 24 * 60 * 60 * 1000;
    query = query.lt('created_at', new Date(endExclusive).toISOString());
  }

  if (normalizedSearch) {
    const alternatives = buildSearchAlternatives(normalizedSearch, orderIds);
    if (!alternatives.length) {
      return {
        documents: [],
        totalCount: 0,
        orderNumbers: {},
        cancellationEligibility: {},
      };
    }
    query = query.or(alternatives.join(','));
  }

  const from = pageIndex * FISCAL_DOCUMENTS_PAGE_SIZE;
  const to = from + FISCAL_DOCUMENTS_PAGE_SIZE - 1;
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, to);

  if (error) throw error;
  if (!data) throw new Error('A consulta de documentos fiscais não retornou dados.');

  const rawDocuments = data as NfeDocumentRecord[];
  const totalCount = count || 0;

  const [documents, orderNumbers, cancellationEligibility] = await Promise.all([
    enrichRecipientsFromFiscalXml(rawDocuments),
    fetchLinkedOrderNumbers(rawDocuments),
    fetchCancellationEligibilityMap(rawDocuments),
  ]);

  return {
    documents,
    totalCount,
    orderNumbers,
    cancellationEligibility,
  };
}

export async function fetchFiscalDocumentsSummary({
  filters,
  targetDocumentId,
  accountantView = false,
}: {
  filters: FiscalDocumentFilters;
  targetDocumentId?: string | null;
  accountantView?: boolean;
}): Promise<FiscalDocumentsSummary> {
  const { data, error } = await supabase
    .rpc('get_fiscal_documents_summary', {
      p_search: filters.search,
      p_status: filters.status,
      p_model: filters.model,
      p_environment: filters.environment === 'all' ? null : Number(filters.environment),
      p_document_type: filters.documentType || 'all',
      p_date_from: filters.dateFrom || null,
      p_date_to: filters.dateTo || null,
      p_target_document_id: targetDocumentId || null,
      p_accountant_view: accountantView,
    })
    .abortSignal(AbortSignal.timeout(8_000))
    .single();

  if (error) throw error;
  if (!data) throw new Error('O resumo fiscal não retornou totalizadores.');

  const row = data as Record<string, number | string | null>;
  return {
    totalCount: Number(row.total_count ?? 0),
    totalValue: Number(row.total_value ?? 0),
    authorizedCount: Number(row.authorized_count ?? 0),
    authorizedValue: Number(row.authorized_value ?? 0),
    canceledCount: Number(row.canceled_count ?? 0),
    canceledValue: Number(row.canceled_value ?? 0),
    estornoCount: Number(row.estorno_count ?? 0),
    estornoValue: Number(row.estorno_value ?? 0),
    pendingCount: Number(row.pending_count ?? 0),
    pendingValue: Number(row.pending_value ?? 0),
    rejectedCount: Number(row.rejected_count ?? 0),
    rejectedValue: Number(row.rejected_value ?? 0),
    abandonedCount: Number(row.abandoned_count ?? 0),
    abandonedValue: Number(row.abandoned_value ?? 0),
  };
}
