import React from 'react';
import { ApiEnvironment } from '@/services/apiMonitoring/apiMonitoringTypes';
import { PeriodFilter } from '../hooks/useApiUsageDashboard';

interface ApiUsageHeaderProps {
    environment: ApiEnvironment | 'all';
    setEnvironment: (env: ApiEnvironment | 'all') => void;
    period: PeriodFilter;
    setPeriod: (p: PeriodFilter) => void;
    selectedProvider: string;
    setSelectedProvider: (prov: string) => void;
    loadData: () => void;
    loading: boolean;
}

export default function ApiUsageHeader({
    environment,
    setEnvironment,
    period,
    setPeriod,
    selectedProvider,
    setSelectedProvider,
    loadData,
    loading
}: ApiUsageHeaderProps) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center text-white">
                    <i className="bi bi-cpu-fill text-2xl" />
                </div>
                <div>
                    <h1 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                        APIs e <span className="text-blue-600">Supabase</span>
                    </h1>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Monitoramento em tempo real, cotas configuradas e proteção contra cobrança acidental
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
                {/* Ambiente */}
                <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-black">
                    <button
                        onClick={() => setEnvironment('all')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                            environment === 'all'
                                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setEnvironment('production')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                            environment === 'production'
                                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        Produção
                    </button>
                    <button
                        onClick={() => setEnvironment('development')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                            environment === 'development'
                                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        Dev
                    </button>
                </div>

                {/* Período */}
                <select
                    value={period}
                    onChange={e => setPeriod(e.target.value as PeriodFilter)}
                    className="px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-black tracking-wide shadow-sm"
                >
                    <option value="month">Este Mês</option>
                    <option value="today">Hoje</option>
                    <option value="7_days">Últimos 7 Dias</option>
                    <option value="last_month">Mês Anterior</option>
                </select>

                {/* Provedor */}
                <select
                    value={selectedProvider}
                    onChange={e => setSelectedProvider(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-black tracking-wide shadow-sm"
                >
                    <option value="all">Todos os Provedores</option>
                    <option value="google">Google Maps Platform</option>
                    <option value="gemini">Google Gemini AI</option>
                    <option value="meta">WhatsApp / Meta</option>
                    <option value="sefaz">SEFAZ Fiscal</option>
                </select>

                <button
                    onClick={loadData}
                    className="p-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-blue-600 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
                    title="Recarregar Métricas"
                >
                    <i className={`bi bi-arrow-clockwise text-base ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </div>
    );
}
