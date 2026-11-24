import { supabase } from '@/pages/utils/supabaseConfig';
import type { NcmFilter, StoreFilter } from '@/pages/App/Settings/components/fiscal/NcmCatalogFilters';
import type { NcmRow } from '@/pages/App/Settings/components/fiscal/NcmCatalogResults';
import type { NcmSummary, StoreSummary } from '@/pages/App/Settings/components/fiscal/NcmCatalogSummary';
import type { NcmPreview, NcmPreviewChange } from '@/pages/App/Settings/components/fiscal/NcmManagementSyncPreview';

export type NcmRelationType = 'one_to_one' | 'one_to_many' | 'many_to_one';

export interface NcmProduct {
  id: string;
  code: string | null;
  name: string;
  ncm_code: string;
  ncm_description: string;
  total_count: number;
}

export interface NcmChangeEvent {
  id: string;
  event_type: string;
  occurred_at: string;
  old_data?: { description?: string | null } | null;
  new_data?: { description?: string | null } | null;
}

export interface NcmCorrelationRecord {
  id: string;
  source_code: string;
  destination_code: string;
  relation_type: NcmRelationType | string;
  effective_from?: string | null;
  effective_to?: string | null;
  version_label?: string | null;
  source_name: string;
  source_reference?: string | null;
  notes?: string | null;
}

export interface NcmProductReviewUpdate {
  product_id: string;
  old_code: string;
  new_code: string;
}

export const formatNcmDate = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR');
};

export const getNcmAdminErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message) {
    return error.message;
  }
  return fallback;
};

export async function fetchNcmCatalogAdminPage(params: {
  search: string;
  storeFilter: StoreFilter;
  filter: NcmFilter;
  limit: number;
  offset: number;
}): Promise<{
  summary: NcmSummary;
  storeSummary: StoreSummary;
  items: NcmRow[];
  total: number;
}> {
  const [
    { data: summaryData, error: summaryError },
    { data: catalogData, error: catalogError },
  ] = await Promise.all([
    supabase.rpc('get_ncm_catalog_summary'),
    supabase.rpc('list_ncm_catalog_for_admin', {
      p_search: params.search,
      p_store_filter: params.storeFilter,
      p_filter: params.filter,
      p_limit: params.limit,
      p_offset: params.offset,
    }),
  ]);
  const { data: storeSummaryData, error: storeSummaryError } = await supabase.rpc(
    'get_ncm_store_activation_summary'
  );
  if (summaryError) throw summaryError;
  if (storeSummaryError) throw storeSummaryError;
  if (catalogError) throw catalogError;

  const catalog = (catalogData || {}) as { items?: NcmRow[]; total?: number };
  return {
    summary: summaryData as NcmSummary,
    storeSummary: storeSummaryData as StoreSummary,
    items: catalog.items || [],
    total: catalog.total || 0,
  };
}

export async function setNcmStoreActivation(code: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_ncm_store_activation', {
    p_code: code,
    p_is_active: isActive,
  });
  if (error) throw error;
}

export async function fetchNcmDetails(code: string, productLimit: number): Promise<{
  products: NcmProduct[];
  productsTotal: number;
  productsError?: string;
  events: NcmChangeEvent[];
  correlations: NcmCorrelationRecord[];
}> {
  const [productResult, eventResult, correlationResult] = await Promise.all([
    supabase.rpc('list_ncm_products', { p_code: code, p_limit: productLimit, p_offset: 0 }),
    supabase
      .from('ncm_change_events')
      .select('id, event_type, old_data, new_data, occurred_at')
      .eq('code', code)
      .order('occurred_at', { ascending: false })
      .limit(12),
    supabase
      .from('ncm_correlations')
      .select(
        'id, source_code, destination_code, relation_type, effective_from, effective_to, version_label, source_name, source_reference, notes'
      )
      .or(`source_code.eq.${code},destination_code.eq.${code}`)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  const products = productResult.error ? [] : ((productResult.data || []) as NcmProduct[]);
  return {
    products,
    productsTotal: products[0]?.total_count || 0,
    productsError: productResult.error?.message,
    events: eventResult.error ? [] : ((eventResult.data || []) as NcmChangeEvent[]),
    correlations: correlationResult.error ? [] : ((correlationResult.data || []) as NcmCorrelationRecord[]),
  };
}

export async function fetchNcmProductsPage(
  code: string,
  limit: number,
  offset: number
): Promise<NcmProduct[]> {
  const { data, error } = await supabase.rpc('list_ncm_products', {
    p_code: code,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return (data || []) as NcmProduct[];
}

export async function requestNcmSyncPreview(): Promise<NcmPreview> {
  const { data, error } = await supabase.functions.invoke('sync-ncms', {
    body: { mode: 'preview' },
  });
  if (error) throw error;
  const payload = data as { success?: boolean; preview?: NcmPreview; error?: string } | null;
  if (!payload?.success || !payload.preview) {
    throw new Error(payload?.error || 'A fonte oficial não passou na validação.');
  }
  return payload.preview;
}

export async function fetchNcmSyncChangesPage(
  syncRunId: string,
  limit: number,
  offset: number
): Promise<{ items: NcmPreviewChange[]; total: number }> {
  const { data, error } = await supabase.rpc('list_ncm_sync_changes', {
    p_sync_run_id: syncRunId,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  const result = (data || {}) as { items?: NcmPreviewChange[]; total?: number };
  return { items: result.items || [], total: result.total || 0 };
}

export async function applyNcmSyncRun(syncRunId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('sync-ncms', {
    body: { mode: 'apply', sync_run_id: syncRunId },
  });
  if (error) throw error;
  const payload = data as { success?: boolean; error?: string } | null;
  if (!payload?.success) {
    throw new Error(payload?.error || 'A sincronização não foi aplicada.');
  }
}

export async function applyNcmProductReviews(updates: NcmProductReviewUpdate[]): Promise<void> {
  const { data, error } = await supabase.rpc('apply_ncm_product_reviews', {
    p_updates: updates,
  });
  if (error) throw error;
  const payload = data as { success?: boolean } | null;
  if (!payload?.success) {
    throw new Error('A revisão dos produtos não foi confirmada.');
  }
}

export async function registerNcmCorrelation(params: {
  sourceCode: string;
  destinationCode: string;
  relationType: NcmRelationType;
  version: string;
}): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new Error('Sessão expirada. Entre novamente para registrar a correlação.');
  }
  const { error } = await supabase.from('ncm_correlations').insert({
    source_code: params.sourceCode,
    destination_code: params.destinationCode,
    relation_type: params.relationType,
    version_label: params.version,
    source_name: 'Rastreador NCM do MDIC',
    source_reference: 'https://rastreador-ncm.dth.mdic.gov.br/',
    notes:
      'Correlação registrada manualmente por administrador após consulta da fonte informada.',
    created_by: authData.user.id,
  });
  if (error) throw error;
}
