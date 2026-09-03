import React, { useState, useEffect } from 'react';
import { useDashboardData, Period } from './useDashboardData';
import { useDashboardOperational } from './hooks/useDashboardOperational';
import { useDashboardStock } from './hooks/useDashboardStock';
import { useDashboardProducts } from './hooks/useDashboardProducts';

import { KpiSkeleton, ChartSkeleton, PanelSkeleton } from './components/DashboardSkeleton';
import QuickActions from './components/QuickActions';
import KpiRow from './components/KpiRow';
import SalesChart from './components/SalesChart';
import OperationPanel from './components/OperationPanel';
import AttentionPanel from './components/AttentionPanel';
import ProductsPanel from './components/ProductsPanel';
import RecentOrders from './components/RecentOrders';
import GeoMapPanel from './components/GeoMapPanel';
import LogisticsPanel from './components/LogisticsPanel';
import AlertsPanel from './components/AlertsPanel';
import { ChartContainer } from './components/DashboardCharts';
import { runDraftCleanup } from '../../utils/draftCleanupService';

const PERIODS: { label: string; value: Period }[] = [
    { label: 'Hoje', value: 'today' },
    { label: 'Ontem', value: 'yesterday' },
    { label: 'Esta Semana', value: 'week' },
    { label: 'Este Mês', value: 'month' },
    { label: 'Últimos 30 Dias', value: 'last_30_days' },
    { label: 'Mês Passado', value: 'last_month' },
    { label: 'Este Ano', value: 'year' },
    { label: 'Período Personalizado', value: 'custom' },
];

export default function Dashboard() {
    const [period, setPeriod] = useState<Period>('month');
    const [customStartDate, setCustomStartDate] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0];
    });
    const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    const { loading, stats, prevStats, salesOverTime, filteredOrders, allActiveOrders } = useDashboardData(period, customStartDate, customEndDate);
    const operational = useDashboardOperational(allActiveOrders);
    const stockData = useDashboardStock();
    const productsData = useDashboardProducts(filteredOrders, allActiveOrders);

    useEffect(() => { runDraftCleanup(); }, []);

    return (
        <div className="max-w-[1700px] mx-auto space-y-6 px-4 lg:px-8 py-4 sm:py-6 animate-reveal">

            {/* ── Header ── */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-2xl shadow-md shadow-blue-500/20 flex items-center justify-center">
                        <i className="bi bi-speedometer2 text-white text-xl" />
                    </div>
                    <h1 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">
                        Dash<span className="text-blue-600">board</span>
                    </h1>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Period selector */}
                    <div className="relative inline-flex items-center">
                        <div className="absolute left-3 pointer-events-none text-blue-600">
                            <i className="bi bi-calendar2-range-fill text-xs" />
                        </div>
                        <select
                            id="dashboard-period"
                            value={period}
                            onChange={e => setPeriod(e.target.value as Period)}
                            className="appearance-none pl-8 pr-7 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs font-black uppercase tracking-wider shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            {PERIODS.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                        <div className="absolute right-2 pointer-events-none text-slate-400">
                            <i className="bi bi-chevron-down text-[10px]" />
                        </div>
                    </div>
                    <QuickActions />
                </div>
            </div>

            {/* Custom date range */}
            {period === 'custom' && (
                <div className="flex items-center gap-3 flex-wrap">
                    <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    <span className="text-slate-400 text-xs font-bold">até</span>
                    <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
            )}

            {/* ── KPIs ── */}
            {loading ? <KpiSkeleton /> : (
                <KpiRow stats={stats} prevStats={prevStats} />
            )}

            {/* ── Chart + Attention ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    {loading ? <ChartSkeleton /> : (
                        <ChartContainer title="Desempenho de Vendas" subtitle={`Evolução no período · ${PERIODS.find(p => p.value === period)?.label || ''}`}>
                            <SalesChart data={salesOverTime} />
                        </ChartContainer>
                    )}
                </div>
                <div>
                    <AttentionPanel stockData={stockData} />
                </div>
            </div>

            {/* ── Central Operacional ── */}
            {loading ? <PanelSkeleton rows={2} /> : (
                <OperationPanel data={operational} />
            )}

            {/* ── Estoque + Produtos ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Alertas do sistema (estoque baixo e outros) */}
                <AlertsPanel maxItems={5} />
                {/* Produtos do período */}
                {loading ? <PanelSkeleton rows={5} /> : (
                    <ProductsPanel data={productsData} />
                )}
            </div>

            {/* ── Pedidos Recentes ── */}
            {loading ? <PanelSkeleton rows={5} /> : (
                <RecentOrders orders={allActiveOrders} />
            )}

            {/* ── Mapa + Logística ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-16">
                <div className="lg:col-span-2">
                    <GeoMapPanel orders={filteredOrders} />
                </div>
                <div>
                    {loading ? <PanelSkeleton rows={4} /> : (
                        <LogisticsPanel filteredOrders={filteredOrders} allActiveOrders={allActiveOrders} />
                    )}
                </div>
            </div>
        </div>
    );
}
