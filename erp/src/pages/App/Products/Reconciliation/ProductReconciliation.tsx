import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
    ReconciliationProductItem,
    ReconciliationFilterState,
    ReconciliationSummary,
    PendencyType
} from './types/reconciliation.types';
import {
    fetchProductsForReconciliation,
    applySupplierBatch,
    applyCategoryBatch,
    applyNcmBatch,
    applyAttributeBatch,
    saveSingleProductReconciliation
} from './services/reconciliationQueries';
import { ReconciliationSummaryHeader } from './components/ReconciliationSummaryHeader';
import { ReconciliationFiltersBar } from './components/ReconciliationFiltersBar';
import { ReconciliationProductCard } from './components/ReconciliationProductCard';
import { ReconciliationBatchBar } from './components/ReconciliationBatchBar';
import { ApplySupplierModal } from './modals/ApplySupplierModal';
import { ApplyCategoryModal } from './modals/ApplyCategoryModal';
import { ApplyNcmModal } from './modals/ApplyNcmModal';
import { ApplyAttributeModal } from './modals/ApplyAttributeModal';

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
        chipCounts: { all: 0, supplier: 0, category: 0, ncm: 0, attributes: 0, price: 0 }
    });

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isAllFilteredSelected, setIsAllFilteredSelected] = useState(false);

    // Modais de lote
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isNcmModalOpen, setIsNcmModalOpen] = useState(false);
    const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, count, summary: sum } = await fetchProductsForReconciliation(page, pageSize, filters);
            setProducts(data);
            setTotalCount(count);
            setSummary(sum);
        } catch (error: any) {
            toast.error(error.message || 'Erro ao carregar conciliação de produtos.');
        } finally {
            setIsLoading(false);
        }
    }, [page, pageSize, filters]);

    useEffect(() => {
        setPage(1);
    }, [filters]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Seleção de itens
    const handleSelectAllOnPage = (checked: boolean) => {
        if (!checked) {
            const newSet = new Set(selectedIds);
            products.forEach(p => newSet.delete(p.id));
            setSelectedIds(newSet);
            setIsAllFilteredSelected(false);
            return;
        }

        const newSet = new Set(selectedIds);
        products.forEach(p => newSet.add(p.id));
        setSelectedIds(newSet);
    };

    const handleSelectProduct = (id: string, checked: boolean) => {
        const newSet = new Set(selectedIds);
        if (checked) {
            newSet.add(id);
        } else {
            newSet.delete(id);
            setIsAllFilteredSelected(false);
        }
        setSelectedIds(newSet);
    };

    const handleClearSelection = () => {
        setSelectedIds(new Set());
        setIsAllFilteredSelected(false);
    };

    // Salvamento de produto individual
    const handleSaveSingleProduct = async (
        productId: string,
        productUpdates: any,
        variationUpdates?: any[]
    ): Promise<boolean> => {
        const result = await saveSingleProductReconciliation(productUpdates, variationUpdates);
        if (result.success) {
            await loadData();
            return true;
        }
        toast.error(result.error || 'Erro ao salvar produto.');
        return false;
    };

    // Lotes
    const getTargetIds = (): string[] => {
        return Array.from(selectedIds);
    };

    const handleApplySupplier = async (supplierId: string) => {
        const ids = getTargetIds();
        if (ids.length === 0) return;

        const res = await applySupplierBatch(ids, supplierId);
        if (res.success) {
            toast.success(`Fornecedor atribuído a ${res.updated} produto(s)!`);
            handleClearSelection();
            loadData();
        } else {
            toast.error(res.error || 'Erro ao aplicar fornecedor.');
        }
    };

    const handleApplyCategory = async (catId: string) => {
        const ids = getTargetIds();
        if (ids.length === 0) return;

        const res = await applyCategoryBatch(ids, catId);
        if (res.success) {
            toast.success(`Categoria atribuída a ${res.updated} produto(s)!`);
            handleClearSelection();
            loadData();
        } else {
            toast.error(res.error || 'Erro ao aplicar categoria.');
        }
    };

    const handleApplyNcm = async (ncmValue: string) => {
        const ids = getTargetIds();
        if (ids.length === 0) return;

        const res = await applyNcmBatch(ids, ncmValue);
        if (res.success) {
            toast.success(`NCM atribuído a ${res.updated} produto(s)!`);
            handleClearSelection();
            loadData();
        } else {
            toast.error(res.error || 'Erro ao aplicar NCM.');
        }
    };

    const handleApplyAttribute = async (attrName: string, attrValue: string) => {
        const ids = getTargetIds();
        if (ids.length === 0) return;

        const res = await applyAttributeBatch(ids, attrName, attrValue);
        if (res.success) {
            toast.success(`Atributo "${attrName}" atribuído a ${res.updated} variação(ões)!`);
            handleClearSelection();
            loadData();
        } else {
            toast.error(res.error || 'Erro ao aplicar atributo.');
        }
    };

    // Compatibilidade de atributos para lote
    const selectedProductsList = useMemo(() => {
        return products.filter(p => selectedIds.has(p.id));
    }, [products, selectedIds]);

    const isAttributeBatchCompatible = useMemo(() => {
        if (selectedProductsList.length === 0) return false;
        const firstCat = selectedProductsList[0].categoryId;
        if (!firstCat) return false;
        return selectedProductsList.every(p => p.categoryId === firstCat);
    }, [selectedProductsList]);

    const availableBatchAttributes = useMemo(() => {
        const attributes = new Map<string, {
            id: string;
            name: string;
            dataType?: 'list' | 'integer' | 'decimal' | 'text' | 'boolean' | 'measure';
            unit?: string;
        }>();

        selectedProductsList.forEach(product => {
            product.pendencies.forEach(pendency => {
                if (!pendency.attributeId || !pendency.attributeName) return;
                attributes.set(pendency.attributeId, {
                    id: pendency.attributeId,
                    name: pendency.attributeName,
                    dataType: pendency.attributeDataType,
                    unit: pendency.attributeUnit
                });
            });
        });

        return Array.from(attributes.values()).sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
    }, [selectedProductsList]);

    const allOnPageSelected = products.length > 0 && products.every(p => selectedIds.has(p.id));

    return (
        <div className="p-3 sm:p-6 md:p-8 max-w-[1400px] mx-auto min-h-screen pb-32">
            {/* Header com Resumo Compacto e Chips */}
            <ReconciliationSummaryHeader
                summary={summary}
                currentFilter={filters}
                onSelectChip={(type: PendencyType | 'all' | 'attributes') => {
                    setFilters(prev => ({ ...prev, pendencyType: type }));
                }}
                onToggleCriticalOnly={() => {
                    setFilters(prev => ({ ...prev, onlyCritical: !prev.onlyCritical }));
                }}
            />

            {/* Barra de Filtros Compacta */}
            <ReconciliationFiltersBar
                filters={filters}
                onChange={setFilters}
            />

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
                                onClick={() => {
                                    setIsAllFilteredSelected(true);
                                    toast.success(`Todos os ${totalCount} produtos do filtro selecionados.`);
                                }}
                                className="text-purple-600 dark:text-purple-400 font-bold hover:underline ml-2"
                            >
                                Selecionar todos os {totalCount} do filtro
                            </button>
                        )}
                    </div>
                )}

                {/* Loading State */}
                {isLoading ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 font-bold text-sm">
                        <i className="bi bi-arrow-repeat animate-spin text-3xl mb-3 block text-purple-600"></i>
                        Carregando pendências do cadastro...
                    </div>
                ) : products.length === 0 ? (
                    /* Empty State */
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                        <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
                            <i className="bi bi-check-circle-fill text-2xl"></i>
                        </div>
                        <h4 className="text-base font-black text-slate-800 dark:text-slate-100">
                            Nenhum produto com pendências encontrado!
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto font-medium">
                            Seus produtos estão em conformidade com as regras obrigatórias de cadastro para os filtros atuais.
                        </p>
                    </div>
                ) : (
                    /* Lista de Cards */
                    products.map(product => (
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
                            Mostrando {(page - 1) * pageSize + 1} até {Math.min(page * pageSize, totalCount)} de {totalCount} produtos
                        </span>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                                disabled={page === 1 || isLoading}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1"
                            >
                                <i className="bi bi-chevron-left"></i> Anterior
                            </button>

                            <span className="text-xs font-black text-purple-600 dark:text-purple-400 px-2">
                                Página {page}
                            </span>

                            <button
                                disabled={page * pageSize >= totalCount || isLoading}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1"
                            >
                                Próxima <i className="bi bi-chevron-right"></i>
                            </button>
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
                totalFilteredCount={totalCount}
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
