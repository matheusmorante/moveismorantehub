import React from 'react';

export function CatalogHeader({ state, actions }: { state: any, actions: any }) {
    const { loading, search, filterChannel, filterCollection, apiError, metaCollections, loadingMeta, showMetaPanel, collections, filteredRows, rows } = state;
    const { setSearch, setFilterChannel, setFilterCollection, setShowMetaPanel, fetchData, fetchMetaCollections, handleDeleteMetaCollection, handleSyncAllActive, page } = actions;

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-premium-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight italic">
                        Catálogo de <span className="text-green-500">Canais</span>
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Variações publicadas por coleção</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleSyncAllActive}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-green-200/50 dark:shadow-none transition-all active:scale-95 disabled:opacity-50"
                    >
                        <i className="bi bi-cloud-upload-fill mr-2" />Atualizar WhatsApp
                    </button>

                    <div className="relative group">
                        <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="BUSCAR NA PÁGINA..."
                            value={search}
                            onChange={e => setSearch(e.target.value.toUpperCase())}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-6 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/20 w-full md:w-64 transition-all"
                        />
                    </div>

                    <select
                        value={filterChannel}
                        onChange={(e: any) => setFilterChannel(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-3 px-5 text-[10px] font-black uppercase tracking-widest outline-none transition-all cursor-pointer"
                    >
                        <option value="all">TODOS OS CANAIS</option>
                        <option value="whatsapp">WHATSAPP SHOP</option>
                        <option value="ecommerce">CATÁLOGO DIGITAL</option>
                    </select>

                    <button
                        onClick={() => fetchData(page)}
                        className="w-12 h-12 flex items-center justify-center bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-2xl hover:bg-blue-100 transition-all border border-blue-100 dark:border-blue-800"
                    >
                        <i className={`bi bi-arrow-clockwise text-xl ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {apiError && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 p-6 rounded-[2rem] flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-500/20">
                        <i className="bi bi-exclamation-triangle-fill text-xl" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-rose-800 dark:text-rose-400 uppercase tracking-tight">Erro de Acesso à API</h4>
                        <p className="text-xs text-rose-600 dark:text-rose-500 mt-1 font-medium">{apiError}</p>
                    </div>
                    <a href="/settings#whatsapp" className="ml-auto px-6 py-3 bg-white dark:bg-slate-900 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">
                        Resolver
                    </a>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-premium-sm">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <i className="bi bi-collection-fill" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Coleções do Catálogo Meta</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Product Sets no WhatsApp Business</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setShowMetaPanel((v: boolean) => !v); if (!showMetaPanel) fetchMetaCollections(); }}
                        className="px-5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
                    >
                        <i className={`bi ${showMetaPanel ? 'bi-chevron-up' : 'bi-chevron-down'} mr-2`} />
                        {showMetaPanel ? 'Fechar' : 'Gerenciar Coleções Meta'}
                    </button>
                </div>

                {showMetaPanel && (
                    <div className="mt-6 border-t border-slate-50 dark:border-slate-800 pt-6">
                        {loadingMeta ? (
                            <div className="flex items-center gap-3 text-slate-400">
                                <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Carregando Coleções da Meta...</span>
                            </div>
                        ) : metaCollections.length === 0 ? (
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhuma coleção encontrada no catálogo da Meta.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {metaCollections.map((col: any) => (
                                    <div key={col.id} className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight truncate">{col.name}</p>
                                            <p className="text-[8px] font-bold text-slate-400 mt-0.5">ID: {col.id}</p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteMetaCollection(col.id, col.name)}
                                            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 border border-rose-100 dark:border-rose-800 hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                                            title="Deletar esta coleção da Meta"
                                        >
                                            <i className="bi bi-trash3-fill text-xs" />
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

            {/* Filtro de Coleções Locais */}
            {!loading && collections.length > 0 && (
                <div className="flex flex-wrap gap-2 px-1">
                    <button
                        onClick={() => setFilterCollection('all')}
                        className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filterCollection === 'all' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800 hover:border-slate-300'}`}
                    >
                        Todas as Coleções
                    </button>
                    {collections.map((col: any) => (
                        <button
                            key={col.key}
                            onClick={() => setFilterCollection(col.key)}
                            className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                filterCollection === col.key
                                    ? col.key.startsWith('env__')
                                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                                        : 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800 hover:border-slate-300'
                            }`}
                        >
                            {col.key.startsWith('env__') && <i className="bi bi-geo-alt-fill mr-1.5 text-[9px]" />}
                            {col.key.startsWith('type__') && <i className="bi bi-collection-fill mr-1.5 text-[9px]" />}
                            {col.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Resumo */}
            {!loading && (
                <div className="flex items-center gap-3 px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {filteredRows.length} VARIAÇÃO{filteredRows.length !== 1 ? 'ÕES' : ''} DA PÁGINA ATUAL
                    </span>
                    {filterCollection !== 'all' && (
                        <>
                            <span className="text-slate-300">·</span>
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                                {collections.find((c: any) => c.key === filterCollection)?.label}
                            </span>
                        </>
                    )}
                    <span className="text-slate-300">·</span>
                    <span className="text-[10px] font-bold text-emerald-500">
                        {rows.filter((r: any) => r.varWhatsappSync).length} NO WHATSAPP
                    </span>
                </div>
            )}
        </>
    );
}
