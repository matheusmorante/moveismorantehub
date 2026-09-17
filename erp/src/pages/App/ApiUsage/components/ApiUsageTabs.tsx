import React from 'react';
import { ViewMode } from '../hooks/useApiUsageDashboard';

interface ApiUsageTabsProps {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
}

export default function ApiUsageTabs({ viewMode, setViewMode }: ApiUsageTabsProps) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200/80 dark:border-slate-800">
            <button
                onClick={() => setViewMode('services')}
                className={`px-4 py-2 text-sm font-black rounded-t-xl transition-all ${
                    viewMode === 'services'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 border-t border-x border-slate-200 dark:border-slate-800'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
            >
                Serviços de Terceiros
            </button>
            <button
                onClick={() => setViewMode('models')}
                className={`px-4 py-2 text-sm font-black rounded-t-xl transition-all ${
                    viewMode === 'models'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 border-t border-x border-slate-200 dark:border-slate-800'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
            >
                Modelos de IA
            </button>
            <button
                onClick={() => setViewMode('modules')}
                className={`px-4 py-2 text-sm font-black rounded-t-xl transition-all ${
                    viewMode === 'modules'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 border-t border-x border-slate-200 dark:border-slate-800'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
            >
                Módulos do ERP
            </button>
            <button
                onClick={() => setViewMode('supabase')}
                className={`px-4 py-2 text-sm font-black rounded-t-xl transition-all flex items-center gap-2 ${
                    viewMode === 'supabase'
                        ? 'bg-white dark:bg-slate-900 text-emerald-500 border-t border-x border-slate-200 dark:border-slate-800'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
            >
                <i className="bi bi-database"></i> Supabase Monitor
            </button>
        </div>
    );
}
