import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { StatsCard } from './components/StatsCard';
import { ChartContainer, SimpleAreaChart, SimplePieChart } from './components/DashboardCharts';
import { useDashboardData, Period } from './useDashboardData';
import AlertsPanel from './components/AlertsPanel';
import ProfitHeatMap from './components/ProfitHeatMap';
import { runDraftCleanup } from '../../utils/draftCleanupService';

interface VisibilityConfig {
    stats: boolean;
    revenueChart: boolean;
    statusChart: boolean;
    reports: boolean;
    quickAction: boolean;
    heatmap: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const PERIODS: { label: string, value: Period }[] = [
    { label: 'Semana', value: 'week' },
    { label: 'Este Mês', value: 'month' },
    { label: 'Últimos 30 Dias', value: 'last_30_days' },
    { label: 'Ano', value: 'year' },
    { label: 'Personalizado', value: 'custom' },
];

export default function Dashboard() {
    const [period, setPeriod] = useState<Period>('week');
    const [customStartDate, setCustomStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    });
    const [customEndDate, setCustomEndDate] = useState(() => {
        const d = new Date();
        return d.toISOString().split('T')[0];
    });
    
    const { loading, stats, prevStats, salesOverTime, statusData, filteredOrders } = useDashboardData(period, customStartDate, customEndDate);
    const [showConfig, setShowConfig] = useState(false);

    const [visibility, setVisibility] = useState<VisibilityConfig>(() => {
        const defaults = {
            stats: true,
            revenueChart: true,
            statusChart: true,
            reports: true,
            quickAction: true,
            heatmap: true
        };
        try {
            const saved = localStorage.getItem('dashboard_visibility');
            if (!saved) return defaults;
            const parsed = JSON.parse(saved);
            return { ...defaults, ...parsed };
        } catch (e) {
            return defaults;
        }
    });

    useEffect(() => {
        localStorage.setItem('dashboard_visibility', JSON.stringify(visibility));
    }, [visibility]);

    useEffect(() => {
        runDraftCleanup();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="relative w-20 h-20">
                    <div className="absolute inset-0 border-[6px] border-slate-50 dark:border-slate-800 rounded-full"></div>
                    <div className="absolute inset-0 border-[6px] border-blue-600 dark:border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                </div>
            </div>
        );
    }

    const calculateTrend = (curr: number, prev: number) => {
        if (!prev || prev === 0) return { trend: undefined, value: undefined };
        const diff = ((curr - prev) / prev) * 100;
        return {
            trend: diff >= 0 ? 'up' as const : 'down' as const,
            value: `${Math.abs(diff).toFixed(1)}%`
        };
    };

    const trends = {
        sales: calculateTrend(stats.totalSales, prevStats.totalSales),
        profit: calculateTrend(stats.totalProfit, prevStats.totalProfit),
        count: calculateTrend(stats.saleCount, prevStats.saleCount),
        ticket: calculateTrend(stats.avgTicket, prevStats.avgTicket),
    };

    const todayStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

    return (
        <div className="max-w-[1700px] mx-auto space-y-10 animate-reveal px-4 lg:px-10 py-10">
            {/* Page Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-4">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-blue-600 rounded-[2rem] shadow-premium-lg shadow-blue-500/20 flex items-center justify-center group-hover:rotate-12 transition-transform duration-500">
                            <i className="bi bi-speedometer2 text-white text-3xl"></i>
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-4xl xl:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">
                                    Dash<span className="text-blue-600">board</span>
                                </h1>
                                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                                    Master Live
                                </span>
                            </div>
                            <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em]">Painel de Controle e Inteligência de Vendas</p>
                        </div>
                        <button
                            onClick={() => setShowConfig(!showConfig)}
                            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-blue-600 transition-all hover:rotate-90 shadow-premium-sm"
                        >
                            <i className="bi bi-gear-fill text-xl"></i>
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                    {period === 'custom' && (
                        <div className="flex items-center gap-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-2.5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-premium-sm animate-reveal">
                            <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="px-3 py-1 text-[11px] font-black uppercase text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none" />
                            <span className="text-slate-300">/</span>
                            <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="px-3 py-1 text-[11px] font-black uppercase text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none" />
                        </div>
                    )}
                    <div className="bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md p-1.5 rounded-[1.75rem] flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar shadow-inner">
                        {PERIODS.map((p) => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                className={`whitespace-nowrap px-6 py-2.5 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300 active:scale-95 ${period === p.value ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-premium-sm ring-1 ring-slate-100 dark:ring-slate-700' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <div className="px-6 py-3 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-premium-sm flex items-center gap-4 text-slate-500 font-black text-[10px] uppercase tracking-widest group">
                        <i className="bi bi-calendar3 text-blue-500 group-hover:scale-110 transition-transform"></i>
                        {todayStr}
                    </div>
                </div>
            </div>

            {/* Metrics */}
            {visibility.stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-8">
                    <StatsCard
                        title="Faturamento" value={formatCurrency(stats.totalSales)} icon="currency-dollar"
                        trend={trends.sales.trend} trendValue={trends.sales.value} color="bg-blue-600"
                    />
                    <StatsCard 
                        title="Lucro Estimado" value={formatCurrency(stats.totalProfit)} icon="graph-up-arrow" 
                        trend={trends.profit.trend} trendValue={trends.profit.value} color="bg-indigo-600" 
                    />
                    <StatsCard 
                        title="Vendas" value={stats.saleCount} icon="cart-check-fill" 
                        trend={trends.count.trend} trendValue={trends.count.value} color="bg-emerald-600" 
                    />
                    <StatsCard title="Ticket Médio" value={formatCurrency(stats.avgTicket)} icon="wallet2" trend={trends.ticket.trend} trendValue={trends.ticket.value} color="bg-violet-600" />
                    <StatsCard title="Pedidos" value={stats.totalOrdersCount} icon="bag-plus-fill" color="bg-amber-600" />
                    <StatsCard title="Pendentes" value={stats.pendingOrders} icon="clock-history" color="bg-rose-600" />
                </div>
            )}

            {/* Central Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {visibility.revenueChart && (
                    <div className="lg:col-span-2">
                        <ChartContainer title="Evolução de Faturamento" subtitle={`Desempenho no período atual (${period})`}>
                            <SimpleAreaChart data={salesOverTime} />
                        </ChartContainer>
                    </div>
                )}
                <AlertsPanel maxItems={6} />
            </div>

            {/* Heatmap Section */}
            {visibility.heatmap && (
                <div className="space-y-6 animate-reveal">
                    <div className="flex items-center justify-between px-2">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">Radar Geográfico de Lucro</h3>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1.5">Concentração de vendas e performance por região</p>
                        </div>
                        <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl shadow-premium-sm border border-slate-100 dark:border-slate-800 flex items-center justify-center text-blue-600">
                           <i className="bi bi-geo-alt-fill text-xl"></i>
                        </div>
                    </div>
                    <div className="rounded-[3rem] overflow-hidden shadow-premium border border-slate-100 dark:border-slate-800">
                        <ProfitHeatMap orders={filteredOrders} />
                    </div>
                </div>
            )}

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 pb-16">
                {visibility.statusChart && (
                    <ChartContainer title="Mix de Status" subtitle="Distribuição analítica dos pedidos">
                        <div className="relative h-64 flex items-center justify-center">
                            <SimplePieChart data={statusData} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mb-4">
                                <span className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">{stats.totalOrdersCount}</span>
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Total</span>
                            </div>
                        </div>
                    </ChartContainer>
                )}

                {visibility.reports && (
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] p-10 flex flex-col justify-between shadow-premium hover:shadow-premium-lg transition-all duration-500 group">
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <h4 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2 leading-tight">Relatórios Detalhes</h4>
                                <p className="text-sm text-slate-400 font-medium">Análise preditiva de fluxo e documentos inteligentes.</p>
                            </div>
                            <button className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-all duration-500 flex items-center justify-center shadow-sm">
                                <i className="bi bi-file-earmark-bar-graph text-2xl"></i>
                            </button>
                        </div>
                        <div className="h-32 flex items-end gap-3 px-2">
                            {salesOverTime.slice(-15).map((d, i) => {
                                const maxVal = Math.max(...salesOverTime.map(x => x.valor), 1);
                                const h = (d.valor / maxVal) * 100;
                                return (
                                    <div key={i} className="flex-1 bg-slate-100 dark:bg-slate-800/50 rounded-t-2xl relative group/bar overflow-hidden">
                                        <div className="absolute bottom-0 left-0 w-full bg-blue-600/60 rounded-t-2xl transition-all duration-1000 group-hover:bg-blue-600 delay-[i*50ms]" style={{ height: `${Math.max(h, 8)}%` }}></div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {visibility.quickAction && (
                    <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 p-10 rounded-[3rem] text-white shadow-premium-lg flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-all duration-500">
                        <i className="bi bi-rocket-takeoff absolute -right-6 -bottom-6 text-[12rem] text-white/5 -rotate-12 group-hover:scale-125 group-hover:rotate-0 transition-transform duration-1000"></i>
                        <div className="relative z-10">
                            <h3 className="text-3xl font-black mb-3 tracking-tight">Nova Venda</h3>
                            <p className="text-blue-100/70 text-sm font-bold uppercase tracking-widest leading-relaxed">Fast Track Checkout Pro</p>
                        </div>
                        <button
                            onClick={() => window.location.href = '/sales-order'}
                            className="relative z-10 w-full bg-white text-blue-700 py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95"
                        >
                            Lançar Pedido
                        </button>
                    </div>
                )}
            </div>

            {/* Config Overlay Modal could be added here if needed */}
        </div>
    );
}
