import React from 'react';
import { ChannelFilter } from '../types';

interface ChannelCatalogHeaderProps {
    loading: boolean;
    search: string;
    filterChannel: ChannelFilter;
    onSearchChange: (value: string) => void;
    onFilterChannelChange: (value: ChannelFilter) => void;
    onRefresh: () => void;
    onSyncAllActive: () => void;
}

export const ChannelCatalogHeader: React.FC<ChannelCatalogHeaderProps> = ({
    loading,
    search,
    filterChannel,
    onSearchChange,
    onFilterChannelChange,
    onRefresh,
    onSyncAllActive,
}) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-premium-sm">
            <div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight italic">
                    Catálogo de <span className="text-green-500">Canais</span>
                </h1>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">
                    Variações publicadas por coleção
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <button
                    onClick={onSyncAllActive}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-green-200/50 dark:shadow-none transition-all active:scale-95 disabled:opacity-50"
                >
                    <i className="bi bi-cloud-upload-fill mr-2" />
                    Atualizar WhatsApp
                </button>

                <div className="relative group">
                    <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="BUSCAR VARIAÇÃO OU SKU..."
                        value={search}
                        onChange={e => onSearchChange(e.target.value.toUpperCase())}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-6 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/20 w-full md:w-64 transition-all"
                    />
                </div>

                <select
                    value={filterChannel}
                    onChange={e => onFilterChannelChange(e.target.value as ChannelFilter)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-3 px-5 text-[10px] font-black uppercase tracking-widest outline-none transition-all cursor-pointer"
                >
                    <option value="all">TODOS OS CANAIS</option>
                    <option value="whatsapp">WHATSAPP SHOP</option>
                    <option value="ecommerce">CATÁLOGO DIGITAL</option>
                </select>

                <button
                    onClick={onRefresh}
                    className="w-12 h-12 flex items-center justify-center bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-2xl hover:bg-blue-100 transition-all border border-blue-100 dark:border-blue-800"
                    title="Recarregar catálogo"
                >
                    <i className={`bi bi-arrow-clockwise text-xl ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </div>
    );
};
