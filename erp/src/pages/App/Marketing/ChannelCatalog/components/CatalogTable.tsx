import React from 'react';
import { pluralizeProductType } from '@/pages/utils/pluralize';

export function CatalogTable({ state, actions }: { state: any, actions: any }) {
    const { loading, filteredRows, isActionLoading } = state;
    const { handleToggleWhatsAppSync, handleToggleAutoSync } = actions;

    return (
        <div className="grid grid-cols-1 gap-3">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                    <div className="w-12 h-12 border-4 border-green-600/30 border-t-green-600 rounded-full animate-spin mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Carregando Variações...</p>
                </div>
            ) : filteredRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
                    <i className="bi bi-layers text-4xl text-slate-200 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhuma variação encontrada</p>
                    <p className="text-[9px] text-slate-400 mt-1">Nenhum produto encontrado nesta página.</p>
                </div>
            ) : (
                filteredRows.map((row: any) => (
                    <div
                        key={row.varId}
                        className="bg-white dark:bg-slate-900 px-6 py-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-premium-sm hover:shadow-premium transition-all overflow-hidden relative"
                    >
                        {/* Barra lateral: verde se ativo no WA, cinza caso contrário */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-[2rem] ${row.varWhatsappSync ? 'bg-green-500' : row.varActive ? 'bg-slate-200 dark:bg-slate-700' : 'bg-rose-300'}`} />

                        <div className="flex flex-col sm:flex-row items-center gap-5">
                            {/* Imagem */}
                            <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-950 flex-shrink-0 overflow-hidden border border-slate-100 dark:border-slate-800">
                                {row.varImage ? (
                                    <img src={row.varImage} alt={row.varName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <i className="bi bi-image text-xl" />
                                    </div>
                                )}
                            </div>

                            {/* Info Principal */}
                            <div className="flex-1 min-w-0 text-center sm:text-left">
                                {/* Badges de Coleção */}
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mb-1">
                                    {row.isActuallyOnMeta && (
                                        <span className="text-[7px] font-black text-white bg-emerald-500 px-1.5 py-0.5 rounded-md uppercase tracking-tighter flex items-center gap-1 shadow-sm shadow-emerald-500/20">
                                            <i className="bi bi-patch-check-fill" />
                                            Verificado na Meta
                                        </span>
                                    )}
                                    {row.parentTypeName && (
                                        <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-800">
                                            <i className="bi bi-collection-fill mr-1 text-[7px]" />
                                            {pluralizeProductType(row.parentTypeName).toUpperCase()}
                                        </span>
                                    )}
                                    {row.parentEnvironment && (
                                        <span className="text-[9px] font-black text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-lg border border-violet-100 dark:border-violet-800">
                                            <i className="bi bi-geo-alt-fill mr-1 text-[7px]" />
                                            {row.parentEnvironment.toUpperCase()}
                                        </span>
                                    )}
                                    {row.parentLine && (
                                        <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                                            LINHA {row.parentLine.toUpperCase()}
                                        </span>
                                    )}
                                </div>

                                {/* Nome Produto Pai > Variação */}
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">
                                    {row.parentDescription}
                                </p>
                                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight truncate">
                                    {row.varName}
                                </h3>

                                {/* Dados rápidos */}
                                <div className="flex flex-wrap items-center gap-3 mt-1">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                                        SKU: <span className="text-slate-600 dark:text-slate-300">{row.varSku || '—'}</span>
                                    </span>
                                    <span className="text-[8px] font-black uppercase tracking-wider">
                                        ESTOQUE: <span className={row.varStock > 0 ? 'text-emerald-500' : 'text-rose-500'}>{row.varStock}</span>
                                    </span>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                                        R$ {row.varPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            {/* Ações de Canal */}
                            <div className="flex items-center gap-4">
                                {/* WhatsApp Toggle */}
                                <div className="flex flex-col items-center gap-1.5">
                                    <button
                                        onClick={() => handleToggleWhatsAppSync(row)}
                                        disabled={isActionLoading === row.varId + '_wa'}
                                        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 ${row.varWhatsappSync ? 'bg-green-50 text-green-600 shadow-md shadow-green-500/10 border-2 border-green-500' : 'bg-slate-50 text-slate-300 dark:bg-slate-950 dark:border dark:border-slate-800'}`}
                                        title={row.varWhatsappSync ? "Publicado. Clique para remover." : "Clique para publicar no WhatsApp."}
                                    >
                                        {isActionLoading === row.varId + '_wa'
                                            ? <i className="bi bi-arrow-repeat animate-spin" />
                                            : <i className="bi bi-whatsapp text-lg" />}
                                    </button>
                                    <span className={`text-[7px] font-black uppercase tracking-widest ${row.varWhatsappSync ? 'text-green-600' : 'text-slate-400'}`}>
                                        {row.varWhatsappSync ? 'Pub.' : 'Não Pub.'}
                                    </span>
                                </div>

                                {/* Auto-Sync */}
                                <div className="flex flex-col items-center gap-1.5">
                                    <button
                                        onClick={() => handleToggleAutoSync(row)}
                                        disabled={isActionLoading === row.varId + '_auto'}
                                        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 ${row.varWhatsappAutoSync ? 'bg-blue-50 text-blue-600 shadow-md shadow-blue-500/10 border-2 border-blue-500' : 'bg-slate-50 text-slate-300 dark:bg-slate-950 dark:border dark:border-slate-800'}`}
                                        title={row.varWhatsappAutoSync ? "Auto-Sync ativado." : "Auto-Sync desativado."}
                                    >
                                        {isActionLoading === row.varId + '_auto'
                                            ? <i className="bi bi-arrow-repeat animate-spin" />
                                            : <i className="bi bi-magic text-lg" />}
                                    </button>
                                    <span className={`text-[7px] font-black uppercase tracking-widest ${row.varWhatsappAutoSync ? 'text-blue-600' : 'text-slate-400'}`}>Auto</span>
                                </div>

                                {/* Status (Ativo/Inativo) */}
                                <div className="flex flex-col items-center gap-1.5">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${row.varActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-300 dark:bg-slate-950'}`}>
                                        <i className={`bi ${row.varActive ? 'bi-check-circle-fill' : 'bi-x-circle'} text-lg`} />
                                    </div>
                                    <span className={`text-[7px] font-black uppercase tracking-widest ${row.varActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {row.varActive ? 'Ativo' : 'Inativo'}
                                    </span>
                                </div>
                            </div>

                            {/* Última sync */}
                            <div className="hidden lg:flex flex-col items-center w-20 text-center">
                                <i className="bi bi-clock-history text-slate-200 dark:text-slate-700 text-lg mb-1" />
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-tight">
                                    {row.varLastSync ? new Date(row.varLastSync).toLocaleDateString('pt-BR') : 'Nunca'}
                                </p>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
