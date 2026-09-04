import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ApiUsageTracker } from '@/services/apiMonitoring/apiUsageTracker';
import { ApiDashboardMetrics, ApiServiceSummary } from '@/services/apiMonitoring/apiMonitoringTypes';

export default function ApiUsageSummaryCard() {
    const [metrics, setMetrics] = useState<ApiDashboardMetrics | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            try {
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
                
                const data = await ApiUsageTracker.getDashboardMetrics(startOfMonth, endOfMonth, 'production');
                if (isMounted) {
                    setMetrics(data);
                }
            } catch (e) {
                console.warn("Aviso ao carregar resumo de APIs no dashboard:", e);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        load();
        return () => { isMounted = false; };
    }, []);

    const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date());
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    // Selecionar até 4 serviços principais para o card compacto
    const featuredServices: ApiServiceSummary[] = (metrics?.summaries || []).slice(0, 4);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
            {/* Header */}
            <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <i className="bi bi-cloud-check-fill text-lg" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">
                                APIs & Consumo
                            </h3>
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                Ciclo de {capitalizedMonth}
                            </p>
                        </div>
                    </div>

                    {metrics && metrics.servicesNearLimitCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            {metrics.servicesNearLimitCount} Próxima{metrics.servicesNearLimitCount > 1 ? 's' : ''} do limite
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Saudável
                        </span>
                    )}
                </div>

                {/* Lista de APIs principais */}
                {loading ? (
                    <div className="space-y-3 py-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse space-y-1.5">
                                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                                <div className="h-2 bg-slate-100 dark:bg-slate-800/60 rounded w-full" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3.5 my-2">
                        {featuredServices.map(service => {
                            const percent = Math.min(100, service.usagePercent);
                            let barColor = 'bg-blue-600';
                            let textColor = 'text-slate-700 dark:text-slate-300';
                            
                            if (service.status === 'BLOCKED') {
                                barColor = 'bg-rose-600';
                                textColor = 'text-rose-600 dark:text-rose-400';
                            } else if (service.status === 'CRITICAL') {
                                barColor = 'bg-rose-500';
                                textColor = 'text-rose-600 dark:text-rose-400';
                            } else if (service.status === 'WARNING') {
                                barColor = 'bg-amber-500';
                                textColor = 'text-amber-600 dark:text-amber-400';
                            }

                            return (
                                <div key={service.service_id} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                                            {service.service_name}
                                        </span>
                                        <span className={`font-black ${textColor}`}>
                                            {service.currentMonthUsage.toLocaleString()} / {service.monthlyLimit.toLocaleString()} ({percent}%)
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${barColor} rounded-full transition-all duration-500`}
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Rodapé do Card com Métricas de Economia e Acesso */}
            <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                    Total: <strong className="text-slate-800 dark:text-slate-200">{metrics?.totalRequests.toLocaleString() || 0}</strong> chamadas
                </div>

                <Link
                    to="/api-usage"
                    className="inline-flex items-center gap-1.5 text-xs font-black text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
                >
                    <span>Ver detalhes</span>
                    <i className="bi bi-arrow-right text-[11px]" />
                </Link>
            </div>
        </div>
    );
}
