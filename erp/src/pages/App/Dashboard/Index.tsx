import React, { useState } from 'react';
import { useDashboardData, Period } from './useDashboardData';
import { useDashboardOperational } from './hooks/useDashboardOperational';
import { useDashboardStock } from './hooks/useDashboardStock';
import { useDashboardProducts } from './hooks/useDashboardProducts';

import { KpiSkeleton, ChartSkeleton, PanelSkeleton } from './components/DashboardSkeleton';
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
import ApiUsageSummaryCard from './components/ApiUsageSummaryCard';
import DigitalCatalogPanel from './components/DigitalCatalogPanel';
import { toLocalDateInputValue } from './dashboardDateRanges';

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Hoje', value: 'today' },
  { label: 'Ontem', value: 'yesterday' },
  { label: 'Este Mês', value: 'month' },
  { label: 'Últimos 30 Dias', value: 'last_30_days' },
  { label: 'Mês específico', value: 'specific_month' },
  { label: 'Este Ano', value: 'year' },
  { label: 'Período Personalizado', value: 'custom' },
];

const currentMonthValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'logistics' | 'system'>('overview');
  const [period, setPeriod] = useState<Period>('last_30_days');
  const [specificMonth, setSpecificMonth] = useState(currentMonthValue);
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toLocalDateInputValue(d);
  });
  const [customEndDate, setCustomEndDate] = useState(() => toLocalDateInputValue(new Date()));

  const {
    loading,
    ordersQueryError,
    retryOrderQueries,
    salesSummaryAvailable,
    stats,
    prevStats,
    salesOverTime,
    operational: operationalCounts,
    productRankings,
    logistics,
    recentOrders,
    geoMapOrders,
  } = useDashboardData(period, customStartDate, customEndDate, specificMonth);
  const operational = useDashboardOperational(operationalCounts);
  const stockData = useDashboardStock();
  const productsData = useDashboardProducts(productRankings);
  const periodSubtitle = period === 'specific_month'
    ? `Mês específico · ${new Date(`${specificMonth}-01T00:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`
    : PERIODS.find((p) => p.value === period)?.label || '';

  const updateCustomStartDate = (value: string) => {
    setCustomStartDate(value);
    if (value && customEndDate && value > customEndDate) setCustomEndDate(value);
  };
  const updateCustomEndDate = (value: string) => {
    setCustomEndDate(value);
    if (value && customStartDate && value < customStartDate) setCustomStartDate(value);
  };

  return (
    <div className="mx-auto max-w-[1700px] min-w-0 space-y-4 px-3 py-3 sm:space-y-6 sm:px-4 sm:py-6 lg:px-8 animate-reveal">
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
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="appearance-none pl-8 pr-7 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs font-black uppercase tracking-wider shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <div className="absolute right-2 pointer-events-none text-slate-400">
              <i className="bi bi-chevron-down text-[10px]" />
            </div>
          </div>
          {period === 'specific_month' && (
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              Mês:
              <input
                aria-label="Mês específico"
                type="month"
                value={specificMonth}
                onChange={(e) => {
                  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)) {
                    setSpecificMonth(e.target.value);
                  }
                }}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </label>
          )}
        </div>
      </div>

      {/* Custom date range */}
      {period === 'custom' && (
        <div className="flex items-center gap-3 flex-wrap">
          <input
            aria-label="Data inicial do período"
            type="date"
            value={customStartDate}
            max={customEndDate || undefined}
            onChange={(e) => updateCustomStartDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <span className="text-slate-400 text-xs font-bold">até</span>
          <input
            aria-label="Data final do período"
            type="date"
            value={customEndDate}
            min={customStartDate || undefined}
            onChange={(e) => updateCustomEndDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      )}

      {ordersQueryError ? (
        <section role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black">Não foi possível carregar os dados de pedidos do Dashboard.</p>
              <p className="mt-1 text-xs">Os indicadores que dependem de pedidos estão ocultos para não mostrar valores incompletos.</p>
            </div>
            <button
              type="button"
              onClick={() => void retryOrderQueries()}
              className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white hover:bg-rose-800"
            >
              Tentar novamente
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* ── KPIs ── */}
          {loading && !salesSummaryAvailable ? <KpiSkeleton /> : (
            <KpiRow stats={stats} prevStats={prevStats} detailsLoading={loading} />
          )}

          {/* ── Desempenho e estoque ── */}
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              {loading ? (
                <ChartSkeleton />
              ) : (
                <ChartContainer title="Desempenho de Vendas" subtitle={`Evolução no período · ${periodSubtitle}`}>
                  <SalesChart data={salesOverTime} />
                </ChartContainer>
              )}
            </div>
            <div className="min-w-0"><AttentionPanel stockData={stockData} /></div>
          </div>

          {/* ── Central Operacional ── */}
          {loading ? <PanelSkeleton rows={2} /> : <OperationPanel data={operational} />}

          {/* ── Produtos e alertas ── */}
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            <AlertsPanel maxItems={5} />
            {loading ? <PanelSkeleton rows={5} /> : <ProductsPanel data={productsData} />}
          </div>

          {/* ── Pedidos recentes ── */}
          {loading ? <PanelSkeleton rows={5} /> : <RecentOrders orders={recentOrders} />}

          {/* ── Mapa e logística ── */}
          <div className="grid min-w-0 grid-cols-1 gap-4 pb-16 sm:gap-6 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2"><GeoMapPanel orders={geoMapOrders} /></div>
            <div>{loading ? <PanelSkeleton rows={4} /> : <LogisticsPanel data={logistics} />}</div>
          </div>
        </>
      )}

      {ordersQueryError && <AttentionPanel stockData={stockData} />}
      <DigitalCatalogPanel />
      {ordersQueryError && <AlertsPanel maxItems={5} />}
      <ApiUsageSummaryCard />
    </div>
  );
}
