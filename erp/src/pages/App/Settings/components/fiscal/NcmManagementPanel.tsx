import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { ncmSyncFormSchema, ncmProductReviewFormSchema, ncmCorrelationFormSchema, ncmCatalogQueryFormSchema, ncmStoreActivationFormSchema } from '../../../../../../../shared-utils/ncmManagementFormSchemas';
import { searchFormSchema } from '../../../../../../../shared-utils/lookupFormSchemas';
import { supabase } from '@/pages/utils/supabaseConfig';
import { ncmService, NcmSearchResult } from '@/services/fiscal/ncmService';
import { useAuth } from '@/context/AuthContext';
import { ERPListPagination } from '@/components/shared/ERPListPagination';
import { requestConfirmation } from '@/components/shared/confirmationService';
import { StatusPill } from './NcmManagementPanelIndicators';
import {
  NcmCatalogSummary,
  type NcmSummary,
  type StoreSummary,
} from './NcmCatalogSummary';
import { NcmManagementSyncPreview } from './NcmManagementSyncPreview';
import type { NcmPreview, NcmPreviewChange } from './NcmManagementSyncPreview';
import { getNcmStatus, NcmCatalogResults, type NcmRow } from './NcmCatalogResults';
import { NcmCorrelationRecords } from './NcmCorrelationRecords';
import {
  NcmCatalogFilters,
  type NcmFilter,
  type StoreFilter,
} from './NcmCatalogFilters';

interface NcmProduct {
  id: string;
  code: string | null;
  name: string;
  ncm_code: string;
  ncm_description: string;
  total_count: number;
}
const PAGE_SIZE = 15;
const NCM_PAGE_SIZES = [15] as const;

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR');
}

export function NcmManagementPanel() {
  const { profile } = useAuth();
  const canManage = profile?.role === 'administrator';
  const [summary, setSummary] = useState<NcmSummary | null>(null);
  const [storeSummary, setStoreSummary] = useState<StoreSummary | null>(null);
  const [rows, setRows] = useState<NcmRow[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<NcmFilter>('all');
  const [storeFilter, setStoreFilter] = useState<StoreFilter>('active');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [previewPageSize, setPreviewPageSize] = useState(PAGE_SIZE);
  const [productPageSize, setProductPageSize] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [preview, setPreview] = useState<NcmPreview | null>(null);
  const [previewChangesOpen, setPreviewChangesOpen] = useState(false);
  const [previewChanges, setPreviewChanges] = useState<NcmPreviewChange[]>([]);
  const [previewChangesTotal, setPreviewChangesTotal] = useState(0);
  const [previewChangesPage, setPreviewChangesPage] = useState(0);
  const [isLoadingPreviewChanges, setIsLoadingPreviewChanges] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedRow, setSelectedRow] = useState<NcmRow | null>(null);
  const [products, setProducts] = useState<NcmProduct[]>([]);
  const [productsTotal, setProductsTotal] = useState(0);
  const [productPage, setProductPage] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [correlations, setCorrelations] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [destinationQuery, setDestinationQuery] = useState('');
  const [destinationResults, setDestinationResults] = useState<NcmSearchResult[]>([]);
  const [destination, setDestination] = useState<NcmSearchResult | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isAddingCorrelation, setIsAddingCorrelation] = useState(false);
  const [correlationType, setCorrelationType] = useState<
    'one_to_one' | 'one_to_many' | 'many_to_one'
  >('one_to_one');
  const [correlationVersion, setCorrelationVersion] = useState('');
  const [isSavingCorrelation, setIsSavingCorrelation] = useState(false);
  const syncForm = useZodForm(ncmSyncFormSchema, { syncRunId: preview?.sync_run_id || '' });
  const productReviewForm = useZodForm(ncmProductReviewFormSchema, { destinationCode: destination?.code || '', productIds: selectedProducts });
  const correlationForm = useZodForm(ncmCorrelationFormSchema, { sourceCode: selectedRow?.code || '', destinationCode: destination?.code || '', relationType: correlationType, version: correlationVersion });
  const { validateValues: validateSearch } = useZodForm(searchFormSchema, { search: searchDraft });
  const { validateValues: validateCatalog } = useZodForm(ncmCatalogQueryFormSchema, { search, page, filter, storeFilter });
  const { validateValues: validateDestination } = useZodForm(searchFormSchema, { search: destinationQuery });
  const activationForm = useZodForm(ncmStoreActivationFormSchema, { code: '', active: false });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void validateSearch({ search: searchDraft }).then((data) => {
        if (!data) return;
        setPage(0);
        setSearch(data.search.trim());
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchDraft, validateSearch]);

  const loadCatalog = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const values = await validateCatalog({ search, page, filter, storeFilter }, (errors) => setErrorMessage(Object.values(flattenFormErrors(errors))[0]));
      if (!values) return;
      const [
        { data: summaryData, error: summaryError },
        { data: catalogData, error: catalogError },
      ] = await Promise.all([
        supabase.rpc('get_ncm_catalog_summary'),
        supabase.rpc('list_ncm_catalog_for_admin', {
          p_search: values.search,
          p_store_filter: values.storeFilter,
          p_filter: values.filter,
          p_limit: pageSize,
          p_offset: values.page * pageSize,
        }),
      ]);
      const { data: storeSummaryData, error: storeSummaryError } = await supabase.rpc(
        'get_ncm_store_activation_summary'
      );
      if (summaryError) throw summaryError;
      if (storeSummaryError) throw storeSummaryError;
      if (catalogError) throw catalogError;
      const catalog = catalogData as { items?: NcmRow[]; total?: number };
      setSummary(summaryData as NcmSummary);
      setStoreSummary(storeSummaryData as StoreSummary);
      setRows(catalog.items || []);
      setTotal(catalog.total || 0);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Não foi possível carregar a base local de NCMs.');
    } finally {
      setIsLoading(false);
    }
  }, [filter, page, pageSize, search, storeFilter, validateCatalog]);

  const toggleStoreActivation = async (row: NcmRow) => {
    return activationForm.validateAndRun({ code: row.code, active: !row.is_active }, async (values) => {
    try {
      setErrorMessage('');
      const { error } = await supabase.rpc('set_ncm_store_activation', {
        p_code: values.code,
        p_is_active: values.active,
      });
      if (error) throw error;
      await loadCatalog();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Não foi possível alterar o uso deste NCM na loja.');
    }
    }, (errors) => setErrorMessage(Object.values(flattenFormErrors(errors))[0]));
  };

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (destinationQuery.trim().length < 2) {
      setDestinationResults([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const values = await validateDestination({ search: destinationQuery });
        if (!values || cancelled) return;
        const results = await ncmService.searchNcms(values.search, 8);
        if (!cancelled) setDestinationResults(results);
      } catch {
        if (!cancelled) setDestinationResults([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [destinationQuery, validateDestination]);

  const loadDetails = async (row: NcmRow) => {
    setSelectedRow(row);
    setProducts([]);
    setProductsTotal(0);
    setEvents([]);
    setCorrelations([]);
    setSelectedProducts([]);
    setDestination(null);
    setDestinationQuery('');
    setIsAddingCorrelation(false);
    setCorrelationVersion('');
    setProductPage(0);
    const [productResult, eventResult, correlationResult] = await Promise.all([
      supabase.rpc('list_ncm_products', { p_code: row.code, p_limit: productPageSize, p_offset: 0 }),
      supabase
        .from('ncm_change_events')
        .select('id, event_type, old_data, new_data, occurred_at')
        .eq('code', row.code)
        .order('occurred_at', { ascending: false })
        .limit(12),
      supabase
        .from('ncm_correlations')
        .select(
          'id, source_code, destination_code, relation_type, effective_from, effective_to, version_label, source_name, source_reference, notes'
        )
        .or(`source_code.eq.${row.code},destination_code.eq.${row.code}`)
        .order('created_at', { ascending: false })
        .limit(30),
    ]);
    if (productResult.error) setErrorMessage(productResult.error.message);
    else {
      const result = (productResult.data || []) as NcmProduct[];
      setProducts(result);
      setProductsTotal(result[0]?.total_count || 0);
    }
    if (!eventResult.error) setEvents(eventResult.data || []);
    if (!correlationResult.error) setCorrelations(correlationResult.data || []);
  };

  const changeProductPage = async (nextPage: number, size = productPageSize) => {
    if (!selectedRow || nextPage < 0 || nextPage * size >= productsTotal) return;
    const { data, error } = await supabase.rpc('list_ncm_products', {
      p_code: selectedRow.code,
      p_limit: size,
      p_offset: nextPage * size,
    });
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setProducts(data || []);
    setSelectedProducts([]);
    setProductPage(nextPage);
  };

  const requestSyncPreview = async () => {
    setIsSyncing(true);
    setPreview(null);
    setPreviewChangesOpen(false);
    setPreviewChanges([]);
    setErrorMessage('');
    try {
      const { data, error } = await supabase.functions.invoke('sync-ncms', {
        body: { mode: 'preview' },
      });
      if (error) throw error;
      if (!data?.success || !data.preview)
        throw new Error(data?.error || 'A fonte oficial não passou na validação.');
      setPreview(data.preview as NcmPreview);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Falha ao gerar a prévia da tabela oficial.');
    } finally {
      setIsSyncing(false);
    }
  };

  const loadPreviewChanges = async (runId: string, nextPage: number, size = previewPageSize) => {
    setIsLoadingPreviewChanges(true);
    setErrorMessage('');
    try {
      const { data, error } = await supabase.rpc('list_ncm_sync_changes', {
        p_sync_run_id: runId,
        p_limit: size,
        p_offset: nextPage * size,
      });
      if (error) throw error;
      const result = data as { items?: NcmPreviewChange[]; total?: number };
      setPreviewChanges(result.items || []);
      setPreviewChangesTotal(result.total || 0);
      setPreviewChangesPage(nextPage);
      setPreviewChangesOpen(true);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Não foi possível carregar as mudanças da prévia.');
    } finally {
      setIsLoadingPreviewChanges(false);
    }
  };

  const applySync = async () => {
    if (!preview) return;
    const validated = await syncForm.validateAndRun({ syncRunId: preview.sync_run_id }, (data) => data,
      (errors) => setErrorMessage(Object.values(flattenFormErrors(errors))[0]));
    if (!validated) return;
    setIsSyncing(true);
    setErrorMessage('');
    try {
      const { data, error } = await supabase.functions.invoke('sync-ncms', {
        body: { mode: 'apply', sync_run_id: validated.syncRunId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'A sincronização não foi aplicada.');
      setPreview(null);
      await loadCatalog();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Falha ao aplicar a sincronização.');
    } finally {
      setIsSyncing(false);
    }
  };

  const applyProductReview = async () => {
    if (!selectedRow || !destination || selectedProducts.length === 0) return;
    const validated = await productReviewForm.validateAndRun({ destinationCode: destination.code, productIds: selectedProducts }, (data) => data,
      (errors) => setErrorMessage(Object.values(flattenFormErrors(errors))[0]));
    if (!validated) return;
    const confirmed = await requestConfirmation({
      title: 'Atualizar NCM dos produtos?',
      message: `Atualizar o NCM de ${selectedProducts.length} produto(s) de ${selectedRow.code} para ${destination.code}? Essa alteração vale para operações futuras; os documentos fiscais já emitidos permanecem inalterados.`,
      confirmLabel: 'Atualizar NCM',
      type: 'warning',
    });
    if (!confirmed) return;
    setIsReviewing(true);
    setErrorMessage('');
    try {
      const updates = products
        .filter((product) => selectedProducts.includes(product.id))
        .map((product) => ({
          product_id: product.id,
          old_code: product.ncm_code,
          new_code: validated.destinationCode,
        }));
      const { data, error } = await supabase.rpc('apply_ncm_product_reviews', {
        p_updates: updates,
      });
      if (error) throw error;
      if (!(data as any)?.success) throw new Error('A revisão dos produtos não foi confirmada.');
      setSelectedProducts([]);
      setDestination(null);
      setDestinationQuery('');
      await loadDetails(selectedRow);
      await loadCatalog();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Não foi possível aplicar a revisão dos produtos.');
    } finally {
      setIsReviewing(false);
    }
  };

  const saveCorrelation = async () => {
    if (!selectedRow || !destination || !correlationVersion.trim()) return;
    const validated = await correlationForm.validateAndRun({ sourceCode: selectedRow.code, destinationCode: destination.code, relationType: correlationType, version: correlationVersion }, (data) => data,
      (errors) => setErrorMessage(Object.values(flattenFormErrors(errors))[0]));
    if (!validated) return;
    setIsSavingCorrelation(true);
    setErrorMessage('');
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user)
        throw new Error('Sessão expirada. Entre novamente para registrar a correlação.');
      const { error } = await supabase.from('ncm_correlations').insert({
        source_code: validated.sourceCode,
        destination_code: validated.destinationCode,
        relation_type: validated.relationType,
        version_label: validated.version,
        source_name: 'Rastreador NCM do MDIC',
        source_reference: 'https://rastreador-ncm.dth.mdic.gov.br/',
        notes:
          'Correlação registrada manualmente por administrador após consulta da fonte informada.',
        created_by: authData.user.id,
      });
      if (error) throw error;
      setIsAddingCorrelation(false);
      setCorrelationVersion('');
      await loadDetails(selectedRow);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Não foi possível registrar a correlação.');
    } finally {
      setIsSavingCorrelation(false);
    }
  };

  const selectDocumentedSuccessor = async (code: string) => {
    setErrorMessage('');
    try {
      const entry = await ncmService.getCatalogEntry(code);
      if (!entry?.active) throw new Error(`O sucessor ${code} não está vigente na base local.`);
      setDestination({
        code: entry.code,
        official_description: entry.official_description,
        alias_match: null,
        rank: 1,
      });
      setDestinationQuery(`${entry.code} · ${entry.official_description}`);
      setSelectedProducts(products.map((product) => product.id));
    } catch (error: any) {
      setErrorMessage(error?.message || 'Não foi possível confirmar o NCM sucessor.');
    }
  };

  const detailStatus = useMemo(() => (selectedRow ? getNcmStatus(selectedRow) : ''), [selectedRow]);

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <NcmCatalogSummary
        canManage={canManage}
        isSyncing={isSyncing}
        summary={summary}
        storeSummary={storeSummary}
        lastSyncLabel={
          summary?.last_sync?.completed_at
            ? `${formatDate(summary.last_sync.completed_at)} · ${summary.last_sync.source_updated_at}`
            : 'Ainda não sincronizada'
        }
        onRequestSync={requestSyncPreview}
      />

      {errorMessage && (
        <div
          role="alert"
          className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
        >
          {errorMessage}
        </div>
      )}

      {preview && (
        <NcmManagementSyncPreview
          preview={preview}
          lastSyncLabel={
            summary?.last_sync?.completed_at
              ? formatDate(summary.last_sync.completed_at)
              : 'sem sincronização anterior'
          }
          previewChangesOpen={previewChangesOpen}
          previewChanges={previewChanges}
          previewChangesPage={previewChangesPage}
          previewPageSize={previewPageSize}
          previewChangesTotal={previewChangesTotal}
          pageSizeOptions={NCM_PAGE_SIZES}
          isSyncing={isSyncing}
          isLoadingPreviewChanges={isLoadingPreviewChanges}
          onToggleChanges={() => {
            if (previewChangesOpen) setPreviewChangesOpen(false);
            else void loadPreviewChanges(preview.sync_run_id, 0);
          }}
          onCancel={() => setPreview(null)}
          onApply={applySync}
          onPageChange={(nextPage) =>
            void loadPreviewChanges(preview.sync_run_id, nextPage - 1)
          }
          onPageSizeChange={(size) => {
            setPreviewPageSize(size);
            void loadPreviewChanges(preview.sync_run_id, 0, size);
          }}
        />
      )}

      <div className="p-5 md:p-7">
        <NcmCatalogFilters
          searchDraft={searchDraft}
          onSearchDraftChange={setSearchDraft}
          filter={filter}
          onFilterChange={(nextFilter) => {
            setPage(0);
            setFilter(nextFilter);
          }}
          storeFilter={storeFilter}
          onStoreFilterChange={(nextFilter) => {
            setPage(0);
            setStoreFilter(nextFilter);
          }}
        />

        <NcmCatalogResults
          rows={rows}
          isLoading={isLoading}
          canManage={canManage}
          onOpenDetails={(row) => void loadDetails(row)}
          onToggleStoreActivation={(row) => void toggleStoreActivation(row)}
        />
          <ERPListPagination
            ariaLabel="Paginação da tabela NCM"
            page={page + 1}
            pageSize={pageSize}
            totalItems={total}
            onPageChange={(nextPage) => setPage(nextPage - 1)}
            onPageSizeChange={(size) => {
              setPage(0);
              setPageSize(size);
            }}
            pageSizeOptions={NCM_PAGE_SIZES}
            preferenceKey="ncm-catalog"
            itemLabel="resultados"
            loading={isLoading}
            className="mt-3"
          />
      </div>

      {selectedRow && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedRow(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
          >
            <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800 md:p-6">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h4 className="font-mono text-xl font-black text-slate-900 dark:text-white">
                    {selectedRow.code}
                  </h4>
                  <StatusPill status={detailStatus} />
                </div>
                <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                  {selectedRow.official_description}
                </p>
                <p className="mt-2 text-[11px] text-slate-500">
                  Vigência: {formatDate(selectedRow.start_date)} a{' '}
                  {selectedRow.end_date === '9999-12-31'
                    ? 'sem encerramento previsto'
                    : formatDate(selectedRow.end_date)}{' '}
                  · Ato: {selectedRow.legal_act || '—'}
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar detalhes"
                onClick={() => setSelectedRow(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 md:p-6">
              {detailStatus === 'Encerrado' && productsTotal > 0 && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                  Este código está encerrado e há produtos vinculados. Escolha uma correlação
                  documentada ou classifique os produtos com o responsável fiscal.
                </div>
              )}
              {detailStatus === 'Não verificado' && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  Este código aparece em produtos, mas não consta na base oficial vigente local.
                  Isso não confirma que ele foi encerrado. Consulte o histórico do Classif e
                  confirme a classificação antes de alterar os produtos.
                </div>
              )}

              <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center justify-between">
                    <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Produtos vinculados ({productsTotal})
                    </h5>
                    <span className="text-[10px] text-slate-400">
                      A página mostra até {productPageSize} produtos
                    </span>
                  </div>
                  {products.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 p-5 text-center text-xs text-slate-400 dark:bg-slate-800">
                      Nenhum produto vinculado.
                    </p>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                      {products.map((product) => (
                        <label
                          key={product.id}
                          className={`flex items-start gap-3 border-b border-slate-100 p-3 last:border-b-0 dark:border-slate-800 ${canManage ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40' : ''}`}
                        >
                          {canManage && (
                            <input
                              type="checkbox"
                              checked={selectedProducts.includes(product.id)}
                              onChange={(event) =>
                                setSelectedProducts((current) =>
                                  event.target.checked
                                    ? [...current, product.id]
                                    : current.filter((id) => id !== product.id)
                                )
                              }
                              className="mt-0.5 accent-blue-600"
                            />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                              {product.name || 'Produto sem nome'}
                            </span>
                            <span className="mt-0.5 block font-mono text-[10px] text-slate-500">
                              Código {product.code || '—'} · NCM {product.ncm_code}
                            </span>
                          </span>
                        </label>
                      ))}
                      <div className="flex flex-col gap-2 border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500 dark:border-slate-800">
                        <ERPListPagination
                          ariaLabel="Paginação de produtos vinculados ao NCM"
                          page={productPage + 1}
                          pageSize={productPageSize}
                          totalItems={productsTotal}
                          onPageChange={(nextPage) => void changeProductPage(nextPage - 1)}
                          onPageSizeChange={(size) => {
                            setProductPageSize(size);
                            void changeProductPage(0, size);
                          }}
                          pageSizeOptions={NCM_PAGE_SIZES}
                          preferenceKey="ncm-products"
                          itemLabel="produtos"
                        />
                      </div>
                    </div>
                  )}

                  {canManage && detailStatus !== 'Vigente' && productsTotal > 0 && (
                    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/20">
                      <label className="block text-xs font-bold text-blue-900 dark:text-blue-200">
                        Novo NCM para os produtos selecionados
                      </label>
                      <div className="relative mt-2">
                        <input
                          value={destinationQuery}
                          onChange={(event) => {
                            setDestinationQuery(event.target.value);
                            setDestination(null);
                          }}
                          placeholder="Pesquise por código ou descrição oficial"
                          className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 dark:border-blue-800 dark:bg-slate-950 dark:text-slate-100"
                        />
                        {destinationResults.length > 0 && (
                          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                            {destinationResults.map((result) => (
                              <button
                                type="button"
                                key={result.code}
                                onClick={() => {
                                  setDestination(result);
                                  setDestinationQuery(
                                    `${result.code} · ${result.official_description}`
                                  );
                                  setDestinationResults([]);
                                }}
                                className="block w-full border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                              >
                                <span className="font-mono font-bold">{result.code}</span>
                                <span className="ml-2 text-slate-500">
                                  {result.official_description}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {selectedProducts.length > 0 && (
                        <button
                          type="button"
                          disabled={!destination || isReviewing}
                          onClick={applyProductReview}
                          className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isReviewing
                            ? 'Aplicando revisão...'
                            : `Confirmar NCM em ${selectedProducts.length} produto(s)`}
                        </button>
                      )}
                      <p className="mt-2 text-[10px] leading-relaxed text-blue-800 dark:text-blue-300">
                        A sugestão por correlação ajuda na análise; valide a classificação fiscal
                        antes de confirmar. O sistema não escolhe automaticamente entre vários
                        sucessores.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  <section>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        Correlações registradas
                      </h5>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setIsAddingCorrelation((value) => !value)}
                          className="text-[10px] font-bold text-blue-600"
                        >
                          {isAddingCorrelation ? 'Cancelar' : 'Registrar correlação verificada'}
                        </button>
                      )}
                    </div>
                    {isAddingCorrelation && canManage && (
                      <div className="mb-3 space-y-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/20">
                        <p className="text-[10px] text-slate-600 dark:text-slate-300">
                          Informe o código sucessor e a revisão consultada no Rastreador. O sistema
                          registra a fonte como apoio; a relação não altera produtos
                          automaticamente.
                        </p>
                        <input
                          value={destinationQuery}
                          onChange={(event) => {
                            setDestinationQuery(event.target.value);
                            setDestination(null);
                          }}
                          placeholder="Pesquisar NCM sucessor vigente"
                          className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 dark:border-blue-800 dark:bg-slate-950 dark:text-slate-100"
                        />
                        {destinationResults.length > 0 && (
                          <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                            {destinationResults.map((result) => (
                              <button
                                type="button"
                                key={result.code}
                                onClick={() => {
                                  setDestination(result);
                                  setDestinationQuery(
                                    `${result.code} · ${result.official_description}`
                                  );
                                  setDestinationResults([]);
                                }}
                                className="block w-full border-b border-slate-100 px-3 py-2 text-left text-[10px] last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                              >
                                <span className="font-mono font-bold">{result.code}</span>
                                <span className="ml-2 text-slate-500">
                                  {result.official_description}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                        {destination && (
                          <p className="text-[10px] font-bold text-blue-800 dark:text-blue-200">
                            Destino selecionado: {destination.code} ·{' '}
                            {destination.official_description}
                          </p>
                        )}
                        <select
                          value={correlationType}
                          onChange={(event) =>
                            setCorrelationType(event.target.value as typeof correlationType)
                          }
                          className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs dark:border-blue-800 dark:bg-slate-950 dark:text-slate-100"
                        >
                          <option value="one_to_one">Um para um</option>
                          <option value="one_to_many">Um para vários</option>
                          <option value="many_to_one">Vários para um</option>
                        </select>
                        <input
                          value={correlationVersion}
                          onChange={(event) => setCorrelationVersion(event.target.value)}
                          placeholder="Versão/período consultado (ex.: SH 2022)"
                          className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 dark:border-blue-800 dark:bg-slate-950 dark:text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={saveCorrelation}
                          disabled={
                            !destination || !correlationVersion.trim() || isSavingCorrelation
                          }
                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        >
                          {isSavingCorrelation ? 'Salvando...' : 'Registrar relação consultada'}
                        </button>
                      </div>
                    )}
                    <NcmCorrelationRecords
                      correlations={correlations}
                      selectedCode={selectedRow.code}
                      canManage={canManage}
                      detailStatus={detailStatus}
                      hasProducts={products.length > 0}
                      onSelectSuccessor={selectDocumentedSuccessor}
                    />
                  </section>
                  <section>
                    <h5 className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                      Histórico do código
                    </h5>
                    {events.length === 0 ? (
                      <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800">
                        Sem eventos registrados desde a implantação do histórico.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {events.map((event) => (
                          <div
                            key={event.id}
                            className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                          >
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                              {event.event_type.replaceAll('_', ' ')}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-500">
                              {new Date(event.occurred_at).toLocaleString('pt-BR')}
                            </p>
                            {event.old_data?.description &&
                              event.old_data.description !== event.new_data?.description && (
                                <p className="mt-1 text-[10px] text-slate-500">
                                  Descrição anterior: {event.old_data.description}
                                </p>
                              )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
