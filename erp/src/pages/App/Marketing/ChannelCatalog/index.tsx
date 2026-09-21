import React, { useState } from 'react';
import { useChannelCatalog } from './hooks/useChannelCatalog';
import { useMetaCollections } from './hooks/useMetaCollections';
import { ChannelCatalogHeader } from './components/ChannelCatalogHeader';
import { MetaCollectionsPanel } from './components/MetaCollectionsPanel';
import { ChannelCatalogCollections } from './components/ChannelCatalogCollections';
import { ChannelVariationList } from './components/ChannelVariationList';
import { ChannelCatalogPagination } from './components/ChannelCatalogPagination';
import CatalogDesignTab from './components/CatalogDesignTab';
import CatalogBannersTab from './components/CatalogBannersTab';
import CatalogOpportunitiesTab from './components/CatalogOpportunitiesTab';
import CatalogSettingsTab from './components/CatalogSettingsTab';

export type CatalogTab = 'products' | 'design' | 'banners' | 'opportunities' | 'settings';

const TABS = [
    { id: 'products', label: 'Produtos', icon: 'bi-box-seam' },
    { id: 'design', label: 'Design & Cores', icon: 'bi-palette' },
    { id: 'banners', label: 'Banners', icon: 'bi-images' },
    { id: 'opportunities', label: 'Oportunidades', icon: 'bi-lightning-charge' },
    { id: 'settings', label: 'Configurações', icon: 'bi-gear' },
] as const;

export function ChannelCatalog() {
    const [activeTab, setActiveTab] = useState<CatalogTab>('products');
    const { state, actions } = useChannelCatalog();
    const meta = useMetaCollections();

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
            {/* Header Global */}
            <ChannelCatalogHeader
                loading={state.loading}
                search={state.search}
                filterChannel={state.filterChannel}
                onSearchChange={actions.setSearch}
                onFilterChannelChange={actions.setFilterChannel}
                onRefresh={() => actions.fetchData(state.currentPage)}
                onSyncAllActive={actions.handleSyncAllActive}
            />

            {/* Alerta de Configuração da API se houver */}
            {state.apiError && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 p-6 rounded-[2rem] flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-500/20">
                        <i className="bi bi-exclamation-triangle-fill text-xl" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-rose-800 dark:text-rose-400 uppercase tracking-tight">
                            Erro de Acesso à API
                        </h4>
                        <p className="text-xs text-rose-600 dark:text-rose-500 mt-1 font-medium">{state.apiError}</p>
                    </div>
                    <a
                        href="/settings#whatsapp"
                        className="ml-auto px-6 py-3 bg-white dark:bg-slate-900 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                    >
                        Resolver
                    </a>
                </div>
            )}

            {/* Painel de Coleções Meta */}
            <MetaCollectionsPanel
                show={meta.showMetaPanel}
                loading={meta.loadingMeta}
                collections={meta.metaCollections}
                deletingId={meta.deletingId}
                onToggle={meta.toggleMetaPanel}
                onDelete={meta.handleDeleteMetaCollection}
            />

            {/* Abas Secundárias */}
            <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as CatalogTab)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                            activeTab === tab.id
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                        }`}
                    >
                        <i className={`bi ${tab.icon}`} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Conteúdo da Aba Ativa */}
            {activeTab === 'products' && (
                <div className="flex flex-col gap-5">
                    {/* Filtros de Coleções / Ambientes */}
                    <ChannelCatalogCollections
                        collections={state.catalogCollections}
                        selectedCollection={state.filterCollection}
                        onSelectCollection={actions.setFilterCollection}
                    />

                    {/* Resumo de Contagem */}
                    {!state.loading && (
                        <div className="flex items-center gap-3 px-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {state.rows.length} VARIAÇÃO{state.rows.length !== 1 ? 'ÕES' : ''} DA PÁGINA
                            </span>
                            {state.totalCount > 0 && (
                                <>
                                    <span className="text-slate-300">·</span>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        {state.totalCount} TOTAIS
                                    </span>
                                </>
                            )}
                            {state.filterCollection !== 'all' && (
                                <>
                                    <span className="text-slate-300">·</span>
                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                                        {state.catalogCollections.find(c => c.key === state.filterCollection)?.label}
                                    </span>
                                </>
                            )}
                            <span className="text-slate-300">·</span>
                            <span className="text-[10px] font-bold text-emerald-500">
                                {state.rows.filter(r => r.varWhatsappSync).length} NO WHATSAPP
                            </span>
                        </div>
                    )}

                    {/* Lista de Variações */}
                    <ChannelVariationList
                        loading={state.loading}
                        rows={state.rows}
                        actionLoading={state.actionLoading}
                        onToggleWhatsAppSync={actions.handleToggleWhatsAppSync}
                        onToggleAutoSync={actions.handleToggleAutoSync}
                    />

                    {/* Paginação Server-Side */}
                    <ChannelCatalogPagination
                        currentPage={state.currentPage}
                        totalPages={state.totalPages}
                        loading={state.loading}
                        onPageChange={page => actions.fetchData(page)}
                    />
                </div>
            )}

            {activeTab === 'design' && <CatalogDesignTab />}
            {activeTab === 'banners' && <CatalogBannersTab />}
            {activeTab === 'opportunities' && <CatalogOpportunitiesTab />}
            {activeTab === 'settings' && <CatalogSettingsTab />}
        </div>
    );
}

export default ChannelCatalog;
