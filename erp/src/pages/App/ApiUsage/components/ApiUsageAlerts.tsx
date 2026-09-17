import React from 'react';
import { ApiDashboardMetrics } from '@/services/apiMonitoring/apiMonitoringTypes';

interface ApiUsageAlertsProps {
    metrics: ApiDashboardMetrics | null;
}

export default function ApiUsageAlerts({ metrics }: ApiUsageAlertsProps) {
    if (!metrics) return null;

    if (metrics.servicesNearLimitCount > 0) {
        return (
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
        );
    }

    return (
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
    );
}
