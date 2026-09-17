import React from 'react';
import { ApiDashboardMetrics } from '@/services/apiMonitoring/apiMonitoringTypes';

interface ApiUsageGlobalMetricsProps {
    metrics: ApiDashboardMetrics | null;
}

export default function ApiUsageGlobalMetrics({ metrics }: ApiUsageGlobalMetricsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase text-slate-400">Chamadas Totais</span>
                    <i className="bi bi-arrow-down-up text-blue-600 text-base" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    {metrics?.totalRequests?.toLocaleString() || 0}
                </div>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Requisições externas reais</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase text-slate-400">Custo Estimado</span>
                    <i className="bi bi-cash-stack text-emerald-600 text-base" />
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    R$ {metrics?.totalCostBrl?.toFixed(2) || '0,00'}
                </div>
                <p className="text-[10px] font-bold text-slate-400 mt-1">
                    {metrics?.totalCostUsd ? `+ US$ ${metrics.totalCostUsd.toFixed(2)}` : 'Sem cobrança em USD'}
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase text-slate-400">Evitadas por Cache</span>
                    <i className="bi bi-lightning-charge-fill text-amber-500 text-base" />
                </div>
                <div className="text-2xl font-black text-amber-500">
                    {metrics?.totalCacheHits?.toLocaleString() || 0}
                </div>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Requisições salvas em cache</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase text-slate-400">Economia Estimada</span>
                    <i className="bi bi-piggy-bank-fill text-indigo-600 text-base" />
                </div>
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    R$ {metrics?.totalSavingsBrl?.toFixed(2) || '0,00'}
                </div>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Economia obtida com cache</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase text-slate-400">API Mais Usada</span>
                    <i className="bi bi-award-fill text-purple-600 text-base" />
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                    {metrics?.topUsedService || 'Nenhuma'}
                </div>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Maior volume no período</p>
            </div>
        </div>
    );
}
