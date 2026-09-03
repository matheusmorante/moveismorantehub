import React from 'react';
import { formatCurrency } from '@/pages/utils/formatters';

interface KpiCardProps {
    id: string;
    title: string;
    value: string | number;
    icon: string;
    color: string;
    iconBg: string;
    trend?: 'up' | 'down';
    trendValue?: string;
    trendLabel?: string;
    warning?: string;
    secondary?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ id, title, value, icon, color, iconBg, trend, trendValue, trendLabel, warning, secondary }) => (
    <div id={id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 group active:scale-[0.98]">
        <div className="flex justify-between items-start mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} group-hover:scale-110 transition-transform duration-300`}>
                <i className={`bi ${icon} text-lg ${color}`} />
            </div>
            {trend && trendValue && (
                <div className={`flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-xl ${trend === 'up' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-rose-600 bg-rose-50 dark:bg-rose-900/20'}`}>
                    <i className={`bi bi-graph-${trend}`} />
                    {trendValue}
                </div>
            )}
        </div>
        <p className="text-slate-400 dark:text-slate-500 font-black text-[9px] uppercase tracking-[0.2em] mb-1">{title}</p>
        <h3 className="text-2xl xl:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tighter leading-none">{value}</h3>
        {secondary && <p className="text-[10px] text-slate-400 mt-1 font-semibold">{secondary}</p>}
        {trendLabel && !trend && <p className="text-[10px] text-slate-400 mt-1 font-semibold">{trendLabel}</p>}
        {warning && (
            <p className="text-[9px] text-amber-500 mt-1 flex items-center gap-1 font-semibold">
                <i className="bi bi-exclamation-triangle-fill" />
                {warning}
            </p>
        )}
    </div>
);

interface KpiRowProps {
    stats: {
        totalSales: number;
        saleCount: number;
        avgTicket: number;
        totalProfit: number;
        grossMargin: number;
        totalCmv: number;
        cmvPartial: boolean;
    };
    prevStats: {
        totalSales: number;
        saleCount: number;
        avgTicket: number;
        totalProfit: number;
        grossMargin: number;
    };
}

const calcTrend = (curr: number, prev: number): { trend: 'up' | 'down' | undefined; value: string | undefined } => {
    if (!prev || prev === 0) return { trend: undefined, value: undefined };
    const diff = ((curr - prev) / Math.abs(prev)) * 100;
    return { trend: diff >= 0 ? 'up' : 'down', value: `${Math.abs(diff).toFixed(1)}%` };
};

const KpiRow: React.FC<KpiRowProps> = ({ stats, prevStats }) => {
    const tSales = calcTrend(stats.totalSales, prevStats.totalSales);
    const tCount = calcTrend(stats.saleCount, prevStats.saleCount);
    const tTicket = calcTrend(stats.avgTicket, prevStats.avgTicket);
    const tProfit = calcTrend(stats.totalProfit, prevStats.totalProfit);

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            <KpiCard
                id="kpi-faturamento" title="Faturamento"
                value={formatCurrency(stats.totalSales)}
                icon="bi-currency-dollar" color="text-blue-600" iconBg="bg-blue-50 dark:bg-blue-950/40"
                trend={tSales.trend} trendValue={tSales.value}
            />
            <KpiCard
                id="kpi-vendas" title="Vendas"
                value={stats.saleCount}
                icon="bi-cart-check-fill" color="text-emerald-600" iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                trend={tCount.trend} trendValue={tCount.value}
            />
            <KpiCard
                id="kpi-ticket" title="Ticket Médio"
                value={formatCurrency(stats.avgTicket)}
                icon="bi-wallet2" color="text-violet-600" iconBg="bg-violet-50 dark:bg-violet-950/40"
                trend={tTicket.trend} trendValue={tTicket.value}
            />
            <KpiCard
                id="kpi-lucro" title="Lucro Bruto"
                value={formatCurrency(stats.totalProfit)}
                icon="bi-graph-up-arrow" color="text-teal-600" iconBg="bg-teal-50 dark:bg-teal-950/40"
                trend={tProfit.trend} trendValue={tProfit.value}
                warning={stats.cmvPartial ? 'CMV parcialmente calculado' : undefined}
            />
            <KpiCard
                id="kpi-margem" title="Margem Bruta"
                value={`${stats.grossMargin.toFixed(1)}%`}
                icon="bi-percent" color="text-indigo-600" iconBg="bg-indigo-50 dark:bg-indigo-950/40"
            />
            <KpiCard
                id="kpi-cmv" title="CMV"
                value={formatCurrency(stats.totalCmv)}
                icon="bi-boxes" color="text-slate-600" iconBg="bg-slate-50 dark:bg-slate-800"
                warning={stats.cmvPartial ? 'Parcialmente calculado' : undefined}
            />
        </div>
    );
};

export default KpiRow;
