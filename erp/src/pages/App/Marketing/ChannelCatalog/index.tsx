import React, { useState } from 'react';
import { useCatalog } from './hooks/useCatalog';
import { CatalogHeader } from './components/CatalogHeader';
import { CatalogTable } from './components/CatalogTable';
import { CatalogPagination } from './components/CatalogPagination';
import CatalogDesignTab from './components/CatalogDesignTab';
import CatalogBannersTab from './components/CatalogBannersTab';
import CatalogOpportunitiesTab from './components/CatalogOpportunitiesTab';
import CatalogSettingsTab from './components/CatalogSettingsTab';

export type CatalogTab = 'products' | 'design' | 'banners' | 'opportunities' | 'settings';

function ChannelCatalog() {
    const { state, actions } = useCatalog();
    const [activeTab, setActiveTab] = useState<CatalogTab>('products');

    const tabs = [
        { id: 'products', label: 'Produtos', icon: 'bi-box-seam' },
        { id: 'design', label: 'Design & Cores', icon: 'bi-palette' },
        { id: 'banners', label: 'Banners', icon: 'bi-images' },
        { id: 'opportunities', label: 'Oportunidades', icon: 'bi-lightning-charge' },
        { id: 'settings', label: 'Configurações', icon: 'bi-gear' }
    ];

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
            {/* Header Global */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <i className="bi bi-shop text-2xl"></i>
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 dark:text-slate-100">Catálogo Digital</h1>
                        <p className="text-xs text-slate-500 font-medium">Gerencie sua vitrine online, design, banners e produtos</p>
                    </div>
                </div>
            </div>

            {/* Abas */}
            <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as CatalogTab)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                            activeTab === tab.id 
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                        }`}
                    >
                        <i className={`bi ${tab.icon}`}></i>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Conteúdo da Aba */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                {activeTab === 'products' && (
                    <div className="flex flex-col gap-6 animate-in fade-in">
                        <CatalogHeader state={state} actions={actions} />
                        <CatalogTable state={state} actions={actions} />
                        <CatalogPagination state={state} actions={actions} />
                    </div>
                )}
                {activeTab === 'design' && <CatalogDesignTab />}
                {activeTab === 'banners' && <CatalogBannersTab />}
                {activeTab === 'opportunities' && <CatalogOpportunitiesTab />}
                {activeTab === 'settings' && <CatalogSettingsTab />}
            </div>
        </div>
    );
}

export default ChannelCatalog;
