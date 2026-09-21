import React from 'react';
import { MetaCollectionItem } from '../types';

interface MetaCollectionsPanelProps {
    show: boolean;
    loading: boolean;
    collections: MetaCollectionItem[];
    deletingId: string | null;
    onToggle: () => void;
    onDelete: (id: string, name: string) => void;
}

export const MetaCollectionsPanel: React.FC<MetaCollectionsPanelProps> = ({
    show,
    loading,
    collections,
    deletingId,
    onToggle,
    onDelete,
}) => {
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-premium-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <i className="bi bi-collection-fill" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                            Coleções do Catálogo Meta
                        </h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            Product Sets no WhatsApp Business
                        </p>
                    </div>
                </div>
                <button
                    onClick={onToggle}
                    className="px-5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
                >
                    <i className={`bi ${show ? 'bi-chevron-up' : 'bi-chevron-down'} mr-2`} />
                    {show ? 'Fechar' : 'Gerenciar Coleções Meta'}
                </button>
            </div>

            {show && (
                <div className="mt-6 border-t border-slate-50 dark:border-slate-800 pt-6">
                    {loading ? (
                        <div className="flex items-center gap-3 text-slate-400">
                            <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                Carregando Coleções da Meta...
                            </span>
                        </div>
                    ) : collections.length === 0 ? (
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Nenhuma coleção encontrada no catálogo da Meta.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {collections.map(col => (
                                <div
                                    key={col.id}
                                    className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3"
                                >
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight truncate">
                                            {col.name}
                                        </p>
                                        <p className="text-[8px] font-bold text-slate-400 mt-0.5">
                                            ID: {col.id}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => onDelete(col.id, col.name)}
                                        disabled={deletingId === col.id}
                                        className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 border border-rose-100 dark:border-rose-800 hover:bg-rose-500 hover:text-white transition-all active:scale-90 disabled:opacity-50"
                                        title="Deletar esta coleção da Meta"
                                    >
                                        {deletingId === col.id ? (
                                            <i className="bi bi-arrow-repeat animate-spin text-xs" />
                                        ) : (
                                            <i className="bi bi-trash3-fill text-xs" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <p className="text-[8px] font-bold text-slate-400 mt-4 uppercase tracking-widest">
                        <i className="bi bi-info-circle mr-1" />
                        Deletar remove a coleção do catálogo Meta permanentemente. Os produtos individuais permanecem.
                    </p>
                </div>
            )}
        </div>
    );
};
