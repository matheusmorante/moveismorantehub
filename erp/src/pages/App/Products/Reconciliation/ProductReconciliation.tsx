import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { reconciliationQueryFormSchema, reconciliationBatchFormSchema, type ReconciliationBatchInput, type ReconciliationResult, type ReconciliationProductValues } from '../../../../../../shared-utils/reconciliationFormSchemas';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import {
  ReconciliationProductItem,
  ReconciliationFilterState,
  ReconciliationSummary,
  PendencyType,
  ReconciliationBatchSelectionItem,
} from './types/reconciliation.types';
import { fetchProductReconciliationSelection, fetchProductsForReconciliation } from './services/reconciliationQueries';
import {
  applySupplierBatch,
  applyCategoryBatch,
  applyNcmBatch,
  applyAttributeBatch,
  saveSingleProductReconciliation,
} from './services/reconciliationMutations';
import { ReconciliationSummaryHeader } from './components/ReconciliationSummaryHeader';
import { ReconciliationFiltersBar } from './components/ReconciliationFiltersBar';
import { ReconciliationProductCard } from './components/ReconciliationProductCard';
import { ReconciliationBatchBar } from './components/ReconciliationBatchBar';
import { ApplySupplierModal } from './modals/ApplySupplierModal';
import { ApplyCategoryModal } from './modals/ApplyCategoryModal';
import { ApplyNcmModal } from './modals/ApplyNcmModal';
import { ApplyAttributeModal } from './modals/ApplyAttributeModal';
import { FixedPageSlots } from '@/components/shared/FixedPageSlots';
import {
  areAllProductReconciliationPageItemsSelected,
  updateProductReconciliationPageSelection,
  updateProductReconciliationSelection,
} from '../../../../../../shared-utils/productReconciliationSelection';

export const ProductReconciliation: React.FC = () => {
  const [products, setProducts] = useState<ReconciliationProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [filters, setFilters] = useState<ReconciliationFilterState>({ pendencyType: 'all' });
  const [summary, setSummary] = useState<ReconciliationSummary>({
    totalPendingProducts: 0,
    totalPendencies: 0,
    totalCritical: 0,
    chipCounts: { all: 0, supplier: 0, category: 0, ncm: 0, attributes: 0, price: 0 },
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedProductDetails, setSelectedProductDetails] = useState<Map<string, ReconciliationBatchSelectionItem>>(new Map());
  const [isAllFilteredSelected, setIsAllFilteredSelected] = useState(false);
  const [isSelectingFiltered, setIsSelectingFiltered] = useState(false);
  const [selectionError, setSelectionError] = useState('');
  const selectionRevision = useRef(0);

  // Modais de lote
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isNcmModalOpen, setIsNcmModalOpen] = useState(false);
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);

  const [queryError, setQueryError] = useState('');
  const queryRevision = useRef(0);
  const mounted = useRef(true);
  const { validateValues: validateQuery } = useZodForm(reconciliationQueryFormSchema, { page, pageSize, filters });
  const batchForm = useZodForm(reconciliationBatchFormSchema, { operation: 'ncm', productIds: [], ncm: '' });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; queryRevision.current += 1; }; }, []);
  const loadData = useCallback(async () => {
    const revision = ++queryRevision.current;
    const current = () => mounted.current && revision === queryRevision.current;
    setIsLoading(true); setQueryError('');
    try {
      const values = await validateQuery({ page, pageSize, filters }, (errors) => { if (current()) setQueryError(Object.values(flattenFormErrors(errors))[0] || 'Confira os filtros.'); });
      if (!values || !current()) return;
      const result = await withTimeout(fetchProductsForReconciliation(values.page, values.pageSize, values.filters), 15_000, null, 'reconciliacao:consultar-produtos');
      if (!current()) return;
      if (!result) throw new Error('A consulta demorou demais. Tente atualizar os produtos.');
      setProducts(result.data); setTotalCount(result.count); setSummary(result.summary);
    } catch (cause) { if (current()) setQueryError(cause instanceof Error ? cause.message : 'Erro ao carregar conciliação de produtos.'); }
    finally { if (current()) setIsLoading(false); }
  }, [page, pageSize, filters, validateQuery]);
  const reload = useRef(loadData); reload.current = loadData;

  useEffect(() => {
    setPage(1);
    setIsAllFilteredSelected(false);
    setIsSelectingFiltered(false);
    setSelectionError('');
    selectionRevision.current += 1;
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Seleção de itens
  const handleSelectAllOnPage = (checked: boolean) => {
    setSelectedIds((current) => updateProductReconciliationPageSelection(current, products, checked));
    setSelectedProductDetails((current) => {
      const next = new Map(current);
      products.forEach((product) => {
        if (checked) next.set(product.id, { id: product.id, categoryId: product.categoryId, pendencies: product.pendencies });
        else next.delete(product.id);
      });
      return next;
    });
    if (!checked) setIsAllFilteredSelected(false);
  };

  const handleSelectProduct = (id: string, checked: boolean) => {
    setSelectedIds((current) => updateProductReconciliationSelection(current, id, checked));
    const product = products.find((item) => item.id === id);
    if (product) {
      setSelectedProductDetails((current) => {
        const next = new Map(current);
        if (checked) next.set(id, { id, categoryId: product.categoryId, pendencies: product.pendencies });
        else next.delete(id);
        return next;
      });
    }
    if (!checked) setIsAllFilteredSelected(false);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setSelectedProductDetails(new Map());
    setIsAllFilteredSelected(false);
    setSelectionError('');
  };

  const handleSelectAllFiltered = async () => {
    const revision = ++selectionRevision.current;
    setIsSelectingFiltered(true);
    setSelectionError('');
    try {
      const result = await withTimeout(fetchProductReconciliationSelection(filters), 30_000, null, 'reconciliacao:selecionar-filtro');
      if (!mounted.current || revision !== selectionRevision.current) return;
      if (!result) throw new Error('A seleção do filtro demorou demais. Tente novamente.');
      setSelectedIds(new Set(result.map((product) => product.id)));
      setSelectedProductDetails(new Map(result.map((product) => [product.id, product])));
      setIsAllFilteredSelected(result.length > 0);
      if (result.length > 0) toast.success(`Todos os ${result.length} produtos pendentes do filtro foram selecionados.`);
      else setSelectionError('Nenhum produto pendente corresponde aos filtros atuais.');
    } catch (cause) {
      if (mounted.current && revision === selectionRevision.current) {
        const message = cause instanceof Error ? cause.message : 'Não foi possível selecionar os produtos do filtro.';
        setSelectionError(message);
        toast.error(message);
      }
    } finally {
      if (mounted.current && revision === selectionRevision.current) setIsSelectingFiltered(false);
    }
  };

  const handleSaveSingleProduct = async (productId: string, productUpdates: ReconciliationProductValues['productUpdates'], variationUpdates?: ReconciliationProductValues['variationUpdates']): Promise<ReconciliationResult> => {
    if (productId !== productUpdates.id) return { success: false, error: 'O produto da correção não corresponde ao selecionado.' };
    const result = await withTimeout<ReconciliationResult>(saveSingleProductReconciliation(productUpdates, variationUpdates), 25_000,
      { success: false, uncertain: true, error: 'Não foi possível confirmar a gravação. Confira o produto antes de repetir.' }, 'reconciliacao:salvar-produto');
    if (mounted.current && result.success) void reload.current();
    return result;
  };
  const applyBatch = async (input: ReconciliationBatchInput): Promise<ReconciliationResult> => {
    const outcome = await batchForm.validateAndRun(input, async (values) => {
      const pending = values.operation === 'supplier' ? applySupplierBatch(values.productIds, values.supplierId, values.replaceExisting)
        : values.operation === 'category' ? applyCategoryBatch(values.productIds, values.categoryId)
        : values.operation === 'ncm' ? applyNcmBatch(values.productIds, values.ncm)
        : applyAttributeBatch(values.productIds, values.name, values.value);
      const result = await withTimeout<ReconciliationResult>(pending, 25_000, { success: false, uncertain: true, error: 'Não foi possível confirmar o lote. Confira os produtos antes de repetir.' }, 'reconciliacao:aplicar-lote');
      if (mounted.current && result.success) {
        toast.success('Correção confirmada em ' + result.updated + ' registro(s).');
        setSelectedIds((current) => new Set([...current].filter((id) => !values.productIds.includes(id))));
        setSelectedProductDetails((current) => new Map([...current].filter(([id]) => !values.productIds.includes(id))));
        setIsAllFilteredSelected(false); void reload.current();
      }
      return result;
    }, (errors) => toast.error(Object.values(flattenFormErrors(errors))[0] || 'Confira a seleção de produtos.'));
    return outcome || { success: false, error: 'Confira a seleção ou aguarde a operação em andamento.' };
  };
  const handleApplySupplier = (supplierId: string, replaceExisting: boolean) => applyBatch({ operation: 'supplier', productIds: [...selectedIds], supplierId, replaceExisting });
  const handleApplyCategory = (categoryId: string) => applyBatch({ operation: 'category', productIds: [...selectedIds], categoryId });
  const handleApplyNcm = (ncm: string) => applyBatch({ operation: 'ncm', productIds: [...selectedIds], ncm });
  const handleApplyAttribute = (name: string, value: string) => applyBatch({ operation: 'attribute', productIds: [...selectedIds], name, value });

  // Compatibilidade de características para lote
  const selectedProductsList = useMemo(() => Array.from(selectedProductDetails.values()), [selectedProductDetails]);

  const isAttributeBatchCompatible = useMemo(() => {
    if (selectedProductsList.length === 0) return false;
    const firstCat = selectedProductsList[0].categoryId;
    if (!firstCat) return false;
    return selectedProductsList.every((p) => p.categoryId === firstCat);
  }, [selectedProductsList]);

  const availableBatchAttributes = useMemo(() => {
    const attributes = new Map<
      string,
      {
        id: string;
        name: string;
        dataType?: 'list' | 'integer' | 'decimal' | 'text' | 'boolean' | 'measure';
        unit?: string;
      }
    >();

    selectedProductsList.forEach((product) => {
      product.pendencies.forEach((pendency) => {
        if (!pendency.attributeId || !pendency.attributeName) return;
        attributes.set(pendency.attributeId, {
          id: pendency.attributeId,
          name: pendency.attributeName,
          dataType: pendency.attributeDataType,
          unit: pendency.attributeUnit,
        });
      });
    });

    return Array.from(attributes.values()).sort((left, right) =>
      left.name.localeCompare(right.name, 'pt-BR')
    );
  }, [selectedProductsList]);

  const allOnPageSelected = areAllProductReconciliationPageItemsSelected(selectedIds, products);

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-[1400px] mx-auto min-h-screen pb-32">
      {/* Header com Resumo Compacto e Chips */}
      <ReconciliationSummaryHeader
        summary={summary}
        currentFilter={filters}
        onSelectChip={(type: PendencyType | 'all' | 'attributes') => {
          setFilters((prev) => ({ ...prev, pendencyType: type }));
        }}
        onToggleCriticalOnly={() => {
          setFilters((prev) => ({ ...prev, onlyCritical: !prev.onlyCritical }));
        }}
      />

      {/* Barra de Filtros Compacta */}
      <ReconciliationFiltersBar filters={filters} onChange={setFilters} />

      {/* Barra de Ações em Lote */}
      <ReconciliationBatchBar
        selectedCount={selectedIds.size}
        totalFilteredCount={totalCount}
        isAllFilteredSelected={isAllFilteredSelected}
        onOpenSupplierModal={() => setIsSupplierModalOpen(true)}
        onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
        onOpenNcmModal={() => setIsNcmModalOpen(true)}
        onOpenAttributeModal={() => setIsAttributeModalOpen(true)}
        isAttributeBatchCompatible={isAttributeBatchCompatible}
        onClearSelection={handleClearSelection}
      />

      {/* Lista Orientada a Pendências */}
      <div className="space-y-4">
        {/* Cabeçalho da Lista / Selecionar Todos */}
        {products.length > 0 && (
          <div className="flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-500">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                onChange={(e) => handleSelectAllOnPage(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-purple-500 cursor-pointer"
              />
              <span>Selecionar todos da página ({products.length})</span>
            </label>

            {totalCount > pageSize && !isAllFilteredSelected && allOnPageSelected && (
              <button
                type="button"
                disabled={isSelectingFiltered}
                onClick={() => void handleSelectAllFiltered()}
                className="text-purple-600 dark:text-purple-400 font-bold hover:underline ml-2 disabled:opacity-50"
              >
                {isSelectingFiltered ? 'Selecionando produtos do filtro...' : 'Selecionar todos os produtos do filtro'}
              </button>
            )}
          </div>
        )}

        {selectionError && <p role="alert" className="mb-4 text-sm text-red-600">{selectionError}</p>}

        {/* Loading State */}
        {queryError && <p role="alert" className="mb-4 text-sm text-red-600">{queryError}</p>}
        {isLoading && products.length > 0 && <p role="status" className="mb-4 text-sm text-slate-500">Atualizando pendências...</p>}
        {isLoading && products.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 font-bold text-sm">
            <i className="bi bi-arrow-repeat animate-spin text-3xl mb-3 block text-purple-600"></i>
            Carregando pendências do cadastro...
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center">
            {queryError ? <>
              <h4 className="text-base font-black text-slate-800 dark:text-slate-100">A consulta não foi concluída.</h4>
              <button type="button" onClick={() => void loadData()} className="mt-3 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white">Atualizar consulta</button>
            </> : <>
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4"><i className="bi bi-check-circle-fill text-2xl" /></div>
              <h4 className="text-base font-black text-slate-800 dark:text-slate-100">Nenhum produto com pendências encontrado!</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto font-medium">Seus produtos estão em conformidade com as regras obrigatórias de cadastro para os filtros atuais.</p>
            </>}
          </div>
        ) : (
          /* Lista de Cards */
          products.map((product) => (
            <ReconciliationProductCard
              key={product.id}
              product={product}
              isSelected={selectedIds.has(product.id)}
              onToggleSelect={(checked) => handleSelectProduct(product.id, checked)}
              onSaveProduct={handleSaveSingleProduct}
            />
          ))
        )}

        {/* Paginação Server-Side */}
        {totalCount > 0 && (
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-500">
              Mostrando {(page - 1) * pageSize + 1} até {Math.min(page * pageSize, totalCount)} de{' '}
              {totalCount} produtos
            </span>

            <div className="flex flex-col items-center gap-2 self-end sm:self-center">
              <span className="text-xs font-black text-purple-600 dark:text-purple-400 px-2">
                Página {page} de {Math.max(1, Math.ceil(totalCount / pageSize))}
              </span>
              <FixedPageSlots
                ariaLabel="Paginação da conciliação de produtos"
                currentPage={page}
                totalPages={Math.max(1, Math.ceil(totalCount / pageSize))}
                onPageChange={setPage}
                loading={isLoading}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modais de Ações em Lote */}
      <ApplySupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onConfirm={handleApplySupplier}
        selectedCount={selectedIds.size}
        isAllFilteredSelected={isAllFilteredSelected}
        totalFilteredCount={selectedIds.size}
      />

      <ApplyCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onConfirm={handleApplyCategory}
        selectedCount={selectedIds.size}
      />

      <ApplyNcmModal
        isOpen={isNcmModalOpen}
        onClose={() => setIsNcmModalOpen(false)}
        onConfirm={handleApplyNcm}
        selectedCount={selectedIds.size}
      />

      <ApplyAttributeModal
        isOpen={isAttributeModalOpen}
        onClose={() => setIsAttributeModalOpen(false)}
        onConfirm={handleApplyAttribute}
        selectedCount={selectedIds.size}
        availableAttributes={availableBatchAttributes}
      />
    </div>
  );
};

export default ProductReconciliation;
