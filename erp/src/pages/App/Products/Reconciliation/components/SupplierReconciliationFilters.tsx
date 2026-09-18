import React, { useState, useEffect } from 'react';
import { ReconciliationFilters } from '../services/reconciliationQueries';
import CategoryAutocomplete from '../../../../../components/CategoryAutocomplete';
import SupplierAutocomplete from '../../../../../components/SupplierAutocomplete';

interface Props {
    filters: ReconciliationFilters;
    onChange: (filters: ReconciliationFilters) => void;
    totalFound: number;
}

// Classes comuns para manter todos os inputs com altura e visual consistente
const INPUT_BASE = "w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:font-normal placeholder:text-slate-400";

export const SupplierReconciliationFilters: React.FC<Props> = ({ filters, onChange, totalFound }) => {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    // Debounce do campo de busca
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== (filters.search || '')) {
                onChange({ ...filters, search: searchTerm || undefined });
            }
        }, 450);
        return () => clearTimeout(timer);
    }, [searchTerm]);// eslint-disable-line react-hooks/exhaustive-deps

    const hasActiveFilters = !!(filters.supplierId || filters.categoryId || searchTerm);

    const clearFilters = () => {
        setSearchTerm('');
        onChange({});
    };

    return (
        <div className="flex flex-col gap-4 mb-6">

            {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                        Conciliação de Produtos Sem Fornecedores
                    </h2>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                        Selecione produtos e atribua o fornecedor em lote.
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors"
                        >
                            <i className="bi bi-x-circle-fill"></i>
                            Limpar filtros
                        </button>
                    )}
                    <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-2xl flex items-center gap-2 border border-blue-100 dark:border-blue-800/50">
                        <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest">Pendentes</span>
                        <span className="text-lg font-black text-blue-700 dark:text-blue-300">{totalFound}</span>
                    </div>
                </div>
            </div>

            {/* ── Card de filtros ────────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">

                {/*
                  Layout responsivo:
                  • Mobile (< sm):  1 coluna — campos empilhados
                  • SM/MD (sm–lg):  2 colunas — Fornecedor + Categoria | Busca largura total
                  • LG+ (≥ lg):     1 linha — [Fornecedor 2fr] [Categoria 1fr] [Busca 2fr]
                  Prioridade de largura: Busca > Fornecedor > Categoria
                */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_2fr] gap-3">

                    {/* ── Fornecedor ──────────────────────────────────────── */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest ml-0.5">
                            Fornecedor atual
                        </label>
                        <SupplierAutocomplete
                            suppliers={[]}
                            selectedSupplierId={filters.supplierId || ''}
                            onSelect={(id) => onChange({ ...filters, supplierId: id })}
                            placeholder="Pesquisar fornecedor..."
                            hideLabel={true}
                            inputClassName={`${INPUT_BASE} pl-3 pr-3`}
                        />
                    </div>

                    {/* ── Categoria ───────────────────────────────────────── */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest ml-0.5">
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

                    {/* ── Busca por produto — full width no sm/md, col 3 no lg ─ */}
                    <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest ml-0.5">
                            Buscar produto
                        </label>
                        <div className="relative">
                            <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"></i>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Nome, SKU ou código"
                                className={`${INPUT_BASE} pl-10 pr-9`}
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                    title="Limpar busca"
                                >
                                    <i className="bi bi-x-lg text-xs"></i>
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
