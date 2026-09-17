import React from 'react';
import { ApiConfiguration, ApiServiceSummary } from '@/services/apiMonitoring/apiMonitoringTypes';

interface ApiUsageIntegrationCardProps {
    summary: ApiServiceSummary;
    isSelected: boolean;
    onSelect: () => void;
    onEditConfig: (config: ApiConfiguration) => void;
}

export default function ApiUsageIntegrationCard({
    summary,
    isSelected,
    onSelect,
    onEditConfig
}: ApiUsageIntegrationCardProps) {
    const percent = Math.min(100, summary.usagePercent);

    let statusBadge = { label: 'Saudável', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
    let barColor = 'bg-blue-600';

    if (summary.status === 'BLOCKED') {
        statusBadge = { label: 'Bloqueado', color: 'bg-rose-600/10 text-rose-600 dark:text-rose-400 border-rose-600/20' };
        barColor = 'bg-rose-600';
    } else if (summary.status === 'CRITICAL') {
        statusBadge = { label: 'Crítico', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
        barColor = 'bg-rose-500';
    } else if (summary.status === 'WARNING') {
        statusBadge = { label: 'Atenção', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
        barColor = 'bg-amber-500';
    }

    return (
        <div
            onClick={onSelect}
            className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border transition-all cursor-pointer shadow-sm ${
                isSelected
                    ? 'border-blue-600 ring-2 ring-blue-500/20'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                        {summary.service_name}
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Provedor: {summary.provider}
                    </span>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusBadge.color}`}>
                    {statusBadge.label}
                </span>
            </div>

            {/* Barra de Consumo */}
            <div className="space-y-1.5 my-3">
                <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-500">
                        {summary.currentMonthUsage.toLocaleString()} / {summary.monthlyLimit.toLocaleString()} ({percent}%)
                    </span>
                    <span className="font-bold text-slate-400 text-[11px]">
                        Restante: {summary.remainingUnits.toLocaleString()}
                    </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                    />
                </div>
            </div>

            {/* Informações de Projeção e Custos */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <div>
                    <span className="text-slate-400 font-bold block">Projeção Mês</span>
                    <strong className={`font-black ${summary.projectedLimitExceeded ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
                        {summary.estimatedEndOfMonthUsage.toLocaleString()} req
                    </strong>
                </div>
                <div>
                    <span className="text-slate-400 font-bold block">Custo Estimado</span>
                    <strong className="font-black text-slate-800 dark:text-slate-200">
                        {summary.currency} {summary.estimatedCost.toFixed(2)}
                    </strong>
                </div>
            </div>

            {/* Ações do Card */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-400">
                    {summary.daysUntilDepletion !== null 
                        ? `Risco em ~${summary.daysUntilDepletion} dias` 
                        : 'Consumo estável'}
                </div>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onEditConfig(summary.config);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-xs font-black transition-colors flex items-center gap-1.5"
                >
                    <i className="bi bi-sliders2 text-[11px]" />
                    <span>Configurar</span>
                </button>
            </div>
        </div>
    );
}
