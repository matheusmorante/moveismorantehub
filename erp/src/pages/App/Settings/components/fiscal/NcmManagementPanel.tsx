import { useCallback, useEffect, useMemo, useState } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { ncmSyncFormSchema, ncmProductReviewFormSchema, ncmCorrelationFormSchema, ncmCatalogQueryFormSchema, ncmStoreActivationFormSchema } from '../../../../../../../shared-utils/ncmManagementFormSchemas';
import { searchFormSchema } from '../../../../../../../shared-utils/lookupFormSchemas';
import { ncmService, NcmSearchResult } from '@/services/fiscal/ncmService';
import {
  applyNcmProductReviews,
  applyNcmSyncRun,
  fetchNcmCatalogAdminPage,
  fetchNcmDetails,
  fetchNcmProductsPage,
  fetchNcmSyncChangesPage,
  formatNcmDate,
  getNcmAdminErrorMessage,
  registerNcmCorrelation,
  requestNcmSyncPreview,
  setNcmStoreActivation,
  type NcmChangeEvent,
  type NcmCorrelationRecord,
  type NcmProduct,
  type NcmRelationType,
} from '@/services/fiscal/ncmAdminService';
import { useAuth } from '@/context/AuthContext';
import { ERPListPagination } from '@/components/shared/ERPListPagination';
import { requestConfirmation } from '@/components/shared/confirmationService';
import {
  NcmCatalogSummary,
  type NcmSummary,
  type StoreSummary,
} from './NcmCatalogSummary';
import { NcmManagementSyncPreview } from './NcmManagementSyncPreview';
import type { NcmPreview, NcmPreviewChange } from './NcmManagementSyncPreview';
import { getNcmStatus, NcmCatalogResults, type NcmRow } from './NcmCatalogResults';
import { NcmDetailsModal } from './NcmDetailsModal';
import {
  NcmCatalogFilters,
  type NcmFilter,
  type StoreFilter,
} from './NcmCatalogFilters';

const PAGE_SIZE = 15;
const NCM_PAGE_SIZES = [15] as const;

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
  const [events, setEvents] = useState<NcmChangeEvent[]>([]);
  const [correlations, setCorrelations] = useState<NcmCorrelationRecord[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [destinationQuery, setDestinationQuery] = useState('');
  const [destinationResults, setDestinationResults] = useState<NcmSearchResult[]>([]);
  const [destination, setDestination] = useState<NcmSearchResult | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isAddingCorrelation, setIsAddingCorrelation] = useState(false);
  const [correlationType, setCorrelationType] = useState<NcmRelationType>('one_to_one');
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
      const result = await fetchNcmCatalogAdminPage({
        search: values.search,
        storeFilter: values.storeFilter,
        filter: values.filter,
        limit: pageSize,
        offset: values.page * pageSize,
      });
      setSummary(result.summary);
      setStoreSummary(result.storeSummary);
      setRows(result.items);
      setTotal(result.total);
    } catch (error: unknown) {
      setErrorMessage(getNcmAdminErrorMessage(error, 'Não foi possível carregar a base local de NCMs.'));
    } finally {
      setIsLoading(false);
    }
  }, [filter, page, pageSize, search, storeFilter, validateCatalog]);

  const toggleStoreActivation = async (row: NcmRow) => {
    return activationForm.validateAndRun({ code: row.code, active: !row.is_active }, async (values) => {
      try {
        setErrorMessage('');
        await setNcmStoreActivation(values.code, values.active);
        await loadCatalog();
      } catch (error: unknown) {
        setErrorMessage(getNcmAdminErrorMessage(error, 'Não foi possível alterar o uso deste NCM na loja.'));
      }
    }, (errors) => setErrorMessage(Object.values(flattenFormErrors(errors))[0]));
  };

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    const selectedDestinationLabel = destination
      ? `${destination.code} · ${destination.official_description}`
      : null;
    if (
      destinationQuery.trim().length < 2 ||
      (selectedDestinationLabel && destinationQuery === selectedDestinationLabel)
    ) {
      setDestinationResults([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const values = await validateDestination({ search: destinationQuery });
        if (!values || cancelled) return;
        const results = await ncmService.searchNcms(values.search, 8, {
          includeInternalAliases: false,
        });
        if (!cancelled) setDestinationResults(results);
      } catch {
        if (!cancelled) setDestinationResults([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [destination, destinationQuery, validateDestination]);

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
    const details = await fetchNcmDetails(row.code, productPageSize);
    if (details.productsError) setErrorMessage(details.productsError);
    else {
      setProducts(details.products);
      setProductsTotal(details.productsTotal);
    }
    setEvents(details.events);
    setCorrelations(details.correlations);
  };

  const changeProductPage = async (nextPage: number, size = productPageSize) => {
    if (!selectedRow || nextPage < 0 || nextPage * size >= productsTotal) return;
    try {
      const nextProducts = await fetchNcmProductsPage(selectedRow.code, size, nextPage * size);
      setProducts(nextProducts);
      setSelectedProducts([]);
      setProductPage(nextPage);
    } catch (error: unknown) {
      setErrorMessage(getNcmAdminErrorMessage(error, 'Não foi possível carregar os produtos vinculados.'));
    }
  };

  const requestSyncPreview = async () => {
    setIsSyncing(true);
    setPreview(null);
    setPreviewChangesOpen(false);
    setPreviewChanges([]);
    setErrorMessage('');
    try {
      setPreview(await requestNcmSyncPreview());
    } catch (error: unknown) {
      setErrorMessage(getNcmAdminErrorMessage(error, 'Falha ao gerar a prévia da tabela oficial.'));
    } finally {
      setIsSyncing(false);
    }
  };

  const loadPreviewChanges = async (runId: string, nextPage: number, size = previewPageSize) => {
    setIsLoadingPreviewChanges(true);
    setErrorMessage('');
    try {
      const result = await fetchNcmSyncChangesPage(runId, size, nextPage * size);
      setPreviewChanges(result.items);
      setPreviewChangesTotal(result.total);
      setPreviewChangesPage(nextPage);
      setPreviewChangesOpen(true);
    } catch (error: unknown) {
      setErrorMessage(getNcmAdminErrorMessage(error, 'Não foi possível carregar as mudanças da prévia.'));
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
      await applyNcmSyncRun(validated.syncRunId);
      setPreview(null);
      await loadCatalog();
    } catch (error: unknown) {
      setErrorMessage(getNcmAdminErrorMessage(error, 'Falha ao aplicar a sincronização.'));
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
      await applyNcmProductReviews(updates);
      setSelectedProducts([]);
      setDestination(null);
      setDestinationQuery('');
      await loadDetails(selectedRow);
      await loadCatalog();
    } catch (error: unknown) {
      setErrorMessage(getNcmAdminErrorMessage(error, 'Não foi possível aplicar a revisão dos produtos.'));
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
      await registerNcmCorrelation({
        sourceCode: validated.sourceCode,
        destinationCode: validated.destinationCode,
        relationType: validated.relationType,
        version: validated.version,
      });
      setIsAddingCorrelation(false);
      setCorrelationVersion('');
      await loadDetails(selectedRow);
    } catch (error: unknown) {
      setErrorMessage(getNcmAdminErrorMessage(error, 'Não foi possível registrar a correlação.'));
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
    } catch (error: unknown) {
      setErrorMessage(getNcmAdminErrorMessage(error, 'Não foi possível confirmar o NCM sucessor.'));
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
            ? `${formatNcmDate(summary.last_sync.completed_at)} · ${summary.last_sync.source_updated_at}`
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
              ? formatNcmDate(summary.last_sync.completed_at)
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
        <NcmDetailsModal
          selectedRow={selectedRow}
          detailStatus={detailStatus}
          canManage={canManage}
          products={products}
          productsTotal={productsTotal}
          productPage={productPage}
          productPageSize={productPageSize}
          pageSizeOptions={NCM_PAGE_SIZES}
          selectedProducts={selectedProducts}
          destinationQuery={destinationQuery}
          destinationResults={destinationResults}
          destination={destination}
          isReviewing={isReviewing}
          isAddingCorrelation={isAddingCorrelation}
          correlationType={correlationType}
          correlationVersion={correlationVersion}
          isSavingCorrelation={isSavingCorrelation}
          correlations={correlations}
          events={events}
          onClose={() => setSelectedRow(null)}
          onToggleProduct={(productId, checked) =>
            setSelectedProducts((current) =>
              checked ? [...current, productId] : current.filter((id) => id !== productId)
            )
          }
          onChangeProductPage={(nextPage, size) => void changeProductPage(nextPage, size)}
          onChangeProductPageSize={(size) => {
            setProductPageSize(size);
            void changeProductPage(0, size);
          }}
          onDestinationQueryChange={(value) => {
            setDestinationQuery(value);
            setDestination(null);
          }}
          onSelectDestinationResult={(result) => {
            setDestination(result);
            setDestinationQuery(`${result.code} · ${result.official_description}`);
            setDestinationResults([]);
          }}
          onApplyProductReview={() => void applyProductReview()}
          onToggleAddingCorrelation={() => setIsAddingCorrelation((value) => !value)}
          onCorrelationTypeChange={setCorrelationType}
          onCorrelationVersionChange={setCorrelationVersion}
          onSaveCorrelation={() => void saveCorrelation()}
          onSelectSuccessor={(code) => void selectDocumentedSuccessor(code)}
        />
      )}
    </section>
  );
}
