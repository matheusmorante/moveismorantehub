import React, { useState, useEffect } from 'react';
import { ApiUsageTracker } from '@/services/apiMonitoring/apiUsageTracker';
import { ApiConfigService } from '@/services/apiMonitoring/apiConfigService';
import { 
    ApiConfiguration, 
    ApiDashboardMetrics, 
    ApiEnvironment, 
    ApiServiceSummary 
} from '@/services/apiMonitoring/apiMonitoringTypes';
import ApiConfigEditModal from './components/ApiConfigEditModal';
import ApiUsageLineChart from './components/ApiUsageLineChart';
import ApiModuleDistributionChart from './components/ApiModuleDistributionChart';

type PeriodFilter = 'today' | '7_days' | 'month' | 'last_month';

export default function ApiUsagePage() {
    const [period, setPeriod] = useState<PeriodFilter>('month');
    const [environment, setEnvironment] = useState<ApiEnvironment | 'all'>('all');
    const [selectedProvider, setSelectedProvider] = useState<string>('all');
    const [selectedServiceId, setSelectedServiceId] = useState<string>('google_routes');

    const [metrics, setMetrics] = useState<ApiDashboardMetrics | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [editingConfig, setEditingConfig] = useState<ApiConfiguration | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const now = new Date();
            let startStr = '';
            let endStr = now.toISOString().split('T')[0];

            if (period === 'today') {
                startStr = endStr;
            } else if (period === '7_days') {
                const d = new Date();
                d.setDate(d.getDate() - 7);
                startStr = d.toISOString().split('T')[0];
            } else if (period === 'month') {
                startStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                endStr = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            } else if (period === 'last_month') {
                startStr = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
                endStr = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
            }

            const data = await ApiUsageTracker.getDashboardMetrics(startStr, endStr, environment);
            setMetrics(data);
        } catch (e) {
            console.error("Erro ao carregar dados de monitoramento de APIs:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [period, environment]);

    const filteredSummaries = (metrics?.summaries || []).filter(s => {
        if (selectedProvider === 'all') return true;
        return s.provider === selectedProvider;
    });

    const activeSummary = filteredSummaries.find(s => s.service_id === selectedServiceId) || filteredSummaries[0];

    // Gerar dias do mês com dados simulados/reais para o gráfico de linha
    const now = new Date();
    const currentDay = now.getDate();
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    const chartDays = Array.from({ length: totalDaysInMonth }, (_, i) => {
        const day = i + 1;
        const isProjected = day > currentDay;
        const baseCalls = activeSummary ? Math.round(activeSummary.currentMonthUsage / Math.max(currentDay, 1)) : 10;
        const variation = ((day * 17) % 7) - 3;
        const calls = isProjected 
            ? Math.max(0, baseCalls + variation)
            : Math.max(0, baseCalls + variation);

        return {
            day,
            date: `${day < 10 ? '0' + day : day}/${(now.getMonth() + 1) < 10 ? '0' + (now.getMonth() + 1) : (now.getMonth() + 1)}`,
            calls: day <= currentDay ? calls : calls,
            isProjected
        };
    });

    return (
        <div className="max-w-[1700px] mx-auto space-y-6 px-4 lg:px-8 py-6 animate-reveal">
            {/* Header & Filtros */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center text-white">
                        <i className="bi bi-cpu-fill text-2xl" />
                    </div>
                    <div>
                        <h1 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                            Uso de APIs & <span className="text-blue-600">Custos</span>
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
                            Desenvolvimento
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

            {/* Resumo Inteligente / Alerta Superior */}
            {metrics && metrics.servicesNearLimitCount > 0 ? (
                <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <i className="bi bi-exclamation-triangle-fill text-lg" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-amber-900 dark:text-amber-200">
                                Atenção: {metrics.servicesNearLimitCount} integração(ões) próxima(s) da cota
                            </h4>
                            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                Há integrações que atingiram o limite de atenção configurado. O Hard Limit interno protegerá o ERP antes de qualquer cobrança comercial.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <i className="bi bi-shield-check text-lg" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-200">
                            Todas as APIs externas estão dentro dos limites configurados
                        </h4>
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            Nenhuma integração ultrapassou o teto de aviso. Cache interno e proteções ativas.
                        </p>
                    </div>
                </div>
            )}

            {/* Cards de Métricas Globais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase text-slate-400">Chamadas Totais</span>
                        <i className="bi bi-arrow-down-up text-blue-600 text-base" />
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                        {metrics?.totalRequests.toLocaleString() || 0}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">Requisições externas reais</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase text-slate-400">Custo Estimado</span>
                        <i className="bi bi-cash-stack text-emerald-600 text-base" />
                    </div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        R$ {metrics?.totalCostBrl.toFixed(2) || '0,00'}
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
                        {metrics?.totalCacheHits.toLocaleString() || 0}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">Requisições salvas em cache</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase text-slate-400">Economia Estimada</span>
                        <i className="bi bi-piggy-bank-fill text-indigo-600 text-base" />
                    </div>
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                        R$ {metrics?.totalSavingsBrl.toFixed(2) || '0,00'}
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

            {/* Grid de Cards Individuais por API */}
            <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">
                    Integrações & Cotas Mensais
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredSummaries.map(summary => {
                        const percent = Math.min(100, summary.usagePercent);
                        const isSelected = activeSummary?.service_id === summary.service_id;

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
                                key={summary.service_id}
                                onClick={() => setSelectedServiceId(summary.service_id)}
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
                                            setEditingConfig(summary.config);
                                        }}
                                        className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-xs font-black transition-colors flex items-center gap-1.5"
                                    >
                                        <i className="bi bi-sliders2 text-[11px]" />
                                        <span>Configurar</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Seção Analítica: Gráfico de Linha Diário + Distribuição por Módulo */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    {activeSummary ? (
                        <ApiUsageLineChart
                            daysData={chartDays}
                            monthlyLimit={activeSummary.monthlyLimit}
                            apiName={activeSummary.service_name}
                        />
                    ) : (
                        <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                            Selecione uma API acima para visualizar a evolução diária.
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    {activeSummary ? (
                        <ApiModuleDistributionChart
                            apiName={activeSummary.service_name}
                            totalCalls={activeSummary.currentMonthUsage}
                        />
                    ) : (
                        <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                            Dados de distribuição indisponíveis.
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Edição de Configurações */}
            {editingConfig && (
                <ApiConfigEditModal
                    config={editingConfig}
                    isOpen={Boolean(editingConfig)}
                    onClose={() => setEditingConfig(null)}
                    onSaved={loadData}
                />
            )}
        </div>
    );
}
