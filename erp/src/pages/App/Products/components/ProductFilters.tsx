import React, { useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';

export interface ProductFiltersData {
    search: string;
    category: string;
    activeOnly: boolean | undefined;
    isDraft?: boolean;
    status?: string;
    sortBy: 'description' | 'unitPrice' | 'stock' | 'code' | 'createdAt' | 'category';
    sortOrder: 'asc' | 'desc';
    showTrash?: boolean;
}

export interface ProductFiltersProps {
    readonly filters: ProductFiltersData;
    readonly setFilters: React.Dispatch<React.SetStateAction<ProductFiltersData>>;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({ filters, setFilters }) => {
    const [availableCategories, setAvailableCategories] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        let active = true;
        const loadCats = async () => {
            try {
                const { data, error } = await supabase.from('categories').select('id, name').order('name');
                if (!error && data && active) {
                    setAvailableCategories(data);
                }
            } catch (err: unknown) {
                console.warn('[ProductFilters] Erro ao carregar categorias:', err);
            }
        };
        void loadCats();
        return () => { active = false; };
    }, []);

    const hasActiveFilters = Boolean(
        filters.category ||
        filters.activeOnly !== undefined ||
        filters.isDraft !== undefined ||
        filters.status ||
        (filters.search && filters.search.trim().length > 0)
    );

    const resetFilters = () => {
        setFilters((prev) => ({
            ...prev,
            search: '',
            category: '',
            activeOnly: undefined,
            isDraft: undefined,
            status: undefined,
            sortBy: 'createdAt',
            sortOrder: 'desc',
            showTrash: prev.showTrash
        }));
    };

    return (
        <aside className="w-full bg-transparent flex flex-col h-full transition-colors" aria-label="Filtros de produtos">
            <div className="p-1 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Parâmetros</span>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                            <i className="bi bi-x-circle-fill" aria-hidden="true" /> Limpar
                        </button>
                    )}
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="filter-product-category" className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Categoria
                        </label>
                        <select
                            id="filter-product-category"
                            name="category"
                            value={filters.category || ''}
                            onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm appearance-none cursor-pointer dark:text-slate-300"
                        >
                            <option value="" className="dark:bg-slate-900">Todas as Categorias</option>
                            <optgroup label="Tipos Gerais" className="dark:bg-slate-900 font-bold">
                                <option value="Produtos" className="dark:bg-slate-900 font-normal">Somente Produtos</option>
                                <option value="Serviços" className="dark:bg-slate-900 font-normal">Somente Serviços</option>
                            </optgroup>
                            {availableCategories.length > 0 && (
                                <optgroup label="Categorias do Sistema" className="dark:bg-slate-900 font-bold">
                                    {availableCategories.map((cat) => (
                                        <option key={cat.id} value={cat.id} className="dark:bg-slate-900 font-normal">
                                            {cat.name}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="filter-product-status-erp" className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Situação no ERP
                        </label>
                        <select
                            id="filter-product-status-erp"
                            value={filters.isDraft ? 'draft' : filters.activeOnly === true ? 'active' : filters.activeOnly === false ? 'deactivated' : ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'draft') {
                                    setFilters((prev) => ({ ...prev, isDraft: true, activeOnly: undefined }));
                                } else if (val === 'active') {
                                    setFilters((prev) => ({ ...prev, isDraft: false, activeOnly: true }));
                                } else if (val === 'deactivated') {
                                    setFilters((prev) => ({ ...prev, isDraft: false, activeOnly: false }));
                                } else {
                                    setFilters((prev) => ({ ...prev, isDraft: undefined, activeOnly: undefined }));
                                }
                            }}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm appearance-none cursor-pointer dark:text-slate-300"
                        >
                            <option value="" className="dark:bg-slate-900">Todos os Produtos</option>
                            <option value="active" className="dark:bg-slate-900">Produtos Ativos</option>
                            <option value="deactivated" className="dark:bg-slate-900">Produtos Desativados</option>
                            <option value="draft" className="dark:bg-slate-900">Rascunhos (Em Cadastro)</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="filter-product-status-catalog" className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Catálogo Digital
                        </label>
                        <select
                            id="filter-product-status-catalog"
                            name="status"
                            value={filters.status || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFilters((prev) => ({ ...prev, status: val === '' ? undefined : val }));
                            }}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm appearance-none cursor-pointer dark:text-slate-300"
                        >
                            <option value="" className="dark:bg-slate-900">Todos</option>
                            <option value="published" className="dark:bg-slate-900">Publicado no Catálogo</option>
                            <option value="hidden" className="dark:bg-slate-900">Ocultado do Catálogo</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="mt-auto p-4 border-t border-slate-50 dark:border-slate-800">
                <button
                    type="button"
                    onClick={resetFilters}
                    className="w-full py-4 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                    <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
                    Limpar Filtros
                </button>
            </div>
        </aside>
    );
};

export default ProductFilters;
