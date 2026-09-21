import React, { useState, useEffect } from 'react';
import { ReconciliationFilterState, PendencyType } from '../types/reconciliation.types';
import CategoryAutocomplete from '../../../../../components/CategoryAutocomplete';

interface Props {
    filters: ReconciliationFilterState;
    onChange: (filters: ReconciliationFilterState) => void;
}

const INPUT_BASE = "w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all placeholder:font-normal placeholder:text-slate-400";

export const ReconciliationFiltersBar: React.FC<Props> = ({ filters, onChange }) => {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== (filters.search || '')) {
                onChange({ ...filters, search: searchTerm || undefined });
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

    const hasActiveFilters = Boolean(
        (filters.pendencyType && filters.pendencyType !== 'all') ||
        filters.categoryId ||
        filters.supplierId ||
        filters.onlyCritical ||
        searchTerm
    );

    const handleClearFilters = () => {
        setSearchTerm('');
        onChange({});
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.5fr_2fr] gap-3 items-end">
                {/* 1. Tipo de Pendência */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest ml-1">
                        Tipo de Pendência
                    </label>
                    <select
                        value={filters.pendencyType || 'all'}
                        onChange={(e) => onChange({ ...filters, pendencyType: e.target.value as any })}
                        className={`${INPUT_BASE} px-3 cursor-pointer`}
                    >
                        <option value="all">Todas as pendências</option>
                        <option value="supplier">Sem fornecedor principal</option>
                        <option value="category">Sem categoria</option>
                        <option value="ncm">NCM ausente ou inválido</option>
                        <option value="attributes">Atributos obrigatórios / vazios</option>
                        <option value="price">Sem preço de venda</option>
                    </select>
                </div>

                {/* 2. Categoria */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest ml-1">
                        Categoria
                    </label>
                    <CategoryAutocomplete
                        selectedIds={filters.categoryId ? [filters.categoryId] : []}
                        onSelect={(cat) => onChange({ ...filters, categoryId: cat.id })}
                        onRemove={() => onChange({ ...filters, categoryId: undefined })}
                        className="flex-1"
                        inputClassName={`${INPUT_BASE} pl-9 pr-4`}
                        placeholder="Todas as categorias"
                    />
                </div>

                {/* 3. Buscar Produto */}
                <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between ml-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
                            Buscar Produto
                        </label>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="text-[10px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
                            >
                                <i className="bi bi-x-circle"></i> Limpar filtros
                            </button>
                        )}
                    </div>
                    <div className="relative">
                        <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs sm:text-sm pointer-events-none"></i>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Nome, SKU ou código..."
                            className={`${INPUT_BASE} pl-9 pr-9`}
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                title="Limpar busca"
                            >
                                <i className="bi bi-x-lg text-xs"></i>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
