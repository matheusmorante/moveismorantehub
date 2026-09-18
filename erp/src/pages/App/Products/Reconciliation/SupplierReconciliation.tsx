import React, { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabaseConfig';
import { toast } from 'react-toastify';
import { SupplierReconciliationFilters as FilterComponent } from './components/SupplierReconciliationFilters';
import { ApplySupplierModal } from './modals/ApplySupplierModal';
import { fetchProductsForReconciliation, applySupplierBatch, ReconciliationProduct, ReconciliationFilters } from './services/reconciliationQueries';

export const SupplierReconciliation = () => {
    const [products, setProducts] = useState<ReconciliationProduct[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const pageSize = 15;

    const [filters, setFilters] = useState<ReconciliationFilters>({});

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isAllFilteredSelected, setIsAllFilteredSelected] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const { data, count } = await fetchProductsForReconciliation(page, pageSize, filters);
            setProducts(data);
            setTotalCount(count);
            // Se "Selecionar Todos" não estiver ativo, limpamos a seleção da página
            if (!isAllFilteredSelected) {
                // Manter selecionados apenas se for entre as páginas? Por simplicidade, limpa a seleção
                // se o filtro mudar. Se o isAllFilteredSelected estiver ativo, ele continua selecionado.
            }
        } catch (error: any) {
            toast.error(error.message || 'Erro ao carregar produtos.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Ao mudar filtro, volta pra primeira página mas MANTÉM a seleção existente.
        // O usuário pode ter selecionado produtos em múltiplas páginas/filtros.
        setPage(1);
    }, [filters]);

    useEffect(() => {
        loadData();
    }, [page, filters]);

    const handleSelectAllOnPage = (checked: boolean) => {
        if (!checked) {
            // Desmarcar tudo: remove da seleção os da página atual
            const newSet = new Set(selectedIds);
            products.forEach(p => newSet.delete(p.id));
            setSelectedIds(newSet);
            setIsAllFilteredSelected(false);
            return;
        }
        // Marcar checkbox do header = seleciona TODOS os produtos do filtro
        setIsAllFilteredSelected(true);
        const newSet = new Set(selectedIds);
        products.forEach(p => newSet.add(p.id));
        setSelectedIds(newSet);
        toast.success(`Todos os ${totalCount} produtos do filtro foram selecionados.`);
    };

    const handleSelectProduct = (id: string, checked: boolean) => {
        const newSet = new Set(selectedIds);
        if (checked) {
            newSet.add(id);
        } else {
            newSet.delete(id);
            setIsAllFilteredSelected(false); // quebra a seleção global se desmarcar um
        }
        setSelectedIds(newSet);
    };

    const handleApplySupplier = async (supplierId: string, replaceExisting: boolean) => {
        try {
            let idsToUpdate: string[] = [];

            if (isAllFilteredSelected) {
                // Se escolheu todos os filtros, precisamos buscar *todos* os IDs do filtro no backend
                // Como o fetchProductsForReconciliation usa limit(pageSize), não podemos reusá-lo direto.
                // Vamos escrever a query barebones aqui mesmo:
                
                let q = supabase.from('products').select('id').eq('item_type', 'product').eq('is_variation', false).eq('deleted', false);
                // Sempre filtra por sem fornecedor (igual ao fetchProductsForReconciliation)
                q = q.is('main_supplier_id', null).is('supplier_id', null);
                
                if (filters.supplierId) q = q.or(`main_supplier_id.eq.${filters.supplierId},supplier_id.eq.${filters.supplierId},supplier_ids.cs.{"${filters.supplierId}"}`);
                if (filters.categoryId) q = q.eq('category', filters.categoryId);
                if (filters.search) {
                    const safe = filters.search.replace(/"/g, '');
                    const s = `%${safe}%`;
                    q = q.or(`name.ilike."${s}",code.ilike."${s}"`);
                }

                const { data: allIds, error: qErr } = await q;
                if (qErr) throw qErr;
                idsToUpdate = allIds.map((row: any) => row.id);
            } else {
                idsToUpdate = Array.from(selectedIds);
            }

            if (idsToUpdate.length === 0) {
                toast.error('Nenhum produto selecionado.');
                return;
            }

            const result = await applySupplierBatch(idsToUpdate, supplierId, replaceExisting);
            
            if (result.success) {
                toast.success(`Operação concluída! Processados: ${result.processed}, Atualizados: ${result.updated}, Ignorados: ${result.ignored}`);
                setIsModalOpen(false);
                setSelectedIds(new Set());
                setIsAllFilteredSelected(false);
                loadData();
            } else {
                toast.error('Erro na RPC: ' + result.error);
            }

        } catch (error: any) {
            toast.error(error.message || 'Erro ao aplicar fornecedor.');
        }
    };

    const allOnPageSelected = products.length > 0 && products.every(p => selectedIds.has(p.id));

    return (
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen pb-32">
            
            <FilterComponent 
                filters={filters} 
                onChange={setFilters} 
                totalFound={totalCount} 
            />

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative">
                
                {/* Batch Action Bar */}
                {selectedIds.size > 0 && (
                    <div className="bg-indigo-50/80 dark:bg-indigo-900/40 backdrop-blur-md px-6 py-3 border-b border-indigo-100 dark:border-indigo-800/50 flex items-center justify-between animate-reveal sticky top-0 z-10">
                        <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                            <i className="bi bi-check-circle-fill"></i>
                            {isAllFilteredSelected ? totalCount : selectedIds.size} selecionados
                            {isAllFilteredSelected && (
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                    · todos do filtro
                                </span>
                            )}
                        </span>

                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-widest shadow-md transition-all active:scale-95"
                        >
                            <i className="bi bi-magic"></i> Atribuir Fornecedor
                        </button>
                    </div>
                )}

                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                                <th className="p-4 w-12 text-center">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded text-blue-600 bg-white border-slate-300 focus:ring-blue-500"
                                        checked={allOnPageSelected}
                                        onChange={(e) => handleSelectAllOnPage(e.target.checked)}
                                    />
                                </th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest whitespace-nowrap">Código / SKU</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest min-w-[200px]">Produto</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Categoria</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Fornecedor Principal</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold text-sm">
                                        <i className="bi bi-arrow-repeat animate-spin text-2xl mb-2 block"></i>
                                        Carregando produtos...
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
                                            <i className="bi bi-inbox text-2xl"></i>
                                        </div>
                                        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">Nenhum produto encontrado.</p>
                                    </td>
                                </tr>
                            ) : (
                                products.map(product => {
                                    const isSelected = selectedIds.has(product.id);
                                    const hasSupplier = !!product.main_supplier_id;
                                    const supplierName = product.people?.tradeName || product.people?.fullName || '-';

                                    return (
                                        <tr key={product.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isSelected ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                                            <td className="p-4 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded text-blue-600 bg-white border-slate-300 focus:ring-blue-500"
                                                    checked={isSelected}
                                                    onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                                                />
                                            </td>
                                            <td className="p-4 text-xs font-bold text-slate-500 whitespace-nowrap">
                                                {product.code || product.sku || '-'}
                                            </td>
                                            <td className="p-4">
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                                                    {product.name}
                                                </p>
                                            </td>
                                            <td className="p-4 text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                {product.category || '-'}
                                            </td>
                                            <td className="p-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                                                {supplierName}
                                            </td>
                                            <td className="p-4">
                                                {hasSupplier ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                                        <i className="bi bi-check2"></i> Ok
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                                        <i className="bi bi-exclamation-triangle"></i> Pendente
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginação */}
                {totalCount > 0 && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                        <span className="text-xs font-bold text-slate-500">
                            Mostrando {(page - 1) * pageSize + 1} até {Math.min(page * pageSize, totalCount)} de {totalCount}
                        </span>
                        <div className="flex gap-2">
                            <button 
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="w-10 h-10 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                                <i className="bi bi-chevron-left text-xs"></i>
                            </button>
                            <button 
                                disabled={page * pageSize >= totalCount}
                                onClick={() => setPage(p => p + 1)}
                                className="w-10 h-10 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                                <i className="bi bi-chevron-right text-xs"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <ApplySupplierModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleApplySupplier}
                selectedCount={selectedIds.size}
                isAllFilteredSelected={isAllFilteredSelected}
                totalFilteredCount={totalCount}
            />

        </div>
    );
};

export default SupplierReconciliation;
