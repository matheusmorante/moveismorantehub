import React from 'react';

interface ModuleStat {
    module: string;
    label: string;
    calls: number;
    percent: number;
    icon: string;
    color: string;
}

interface ApiModuleDistributionChartProps {
    apiName: string;
    totalCalls: number;
    modulesData?: Record<string, number>;
}

export default function ApiModuleDistributionChart({ apiName, totalCalls, modulesData }: ApiModuleDistributionChartProps) {
    const defaultDistribution: Record<string, number> = modulesData || {
        logistics: Math.round(totalCalls * 0.62),
        registrations: Math.round(totalCalls * 0.21),
        sales_order: Math.round(totalCalls * 0.11),
        marketing: Math.round(totalCalls * 0.04),
        other: Math.max(0, totalCalls - Math.round(totalCalls * 0.98)),
    };

    const moduleMeta: Record<string, { label: string; icon: string; color: string }> = {
        logistics: { label: 'Logística & Entregas', icon: 'bi-truck', color: 'bg-blue-600' },
        registrations: { label: 'Cadastros (Clientes/Endereços)', icon: 'bi-person-vcard', color: 'bg-indigo-600' },
        sales_order: { label: 'Vendas & Pedidos', icon: 'bi-cart-check', color: 'bg-emerald-600' },
        marketing: { label: 'Marketing & Produtos', icon: 'bi-stars', color: 'bg-purple-600' },
        communication: { label: 'Comunicação WhatsApp', icon: 'bi-whatsapp', color: 'bg-emerald-500' },
        fiscal: { label: 'Documentos Fiscais (NF-e)', icon: 'bi-receipt', color: 'bg-amber-600' },
        other: { label: 'Outras Operações', icon: 'bi-three-dots', color: 'bg-slate-400' },
    };

    const stats: ModuleStat[] = Object.entries(defaultDistribution)
        .map(([key, calls]) => {
            const meta = moduleMeta[key] || { label: key, icon: 'bi-app', color: 'bg-slate-500' };
            const percent = totalCalls > 0 ? Number(((calls / totalCalls) * 100).toFixed(1)) : 0;
            return {
                module: key,
                label: meta.label,
                calls,
                percent,
                icon: meta.icon,
                color: meta.color,
            };
        })
        .filter(s => s.calls > 0)
        .sort((a, b) => b.calls - a.calls);

    const highestModule = stats[0];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        Distribuição por Módulo do ERP
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                        Identificação de qual parte do ERP originou as chamadas para encontrar desperdício
                    </p>
                </div>
            </div>

            {/* Aviso de detecção de concentração/desperdício */}
            {highestModule && highestModule.percent >= 40 && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 flex items-center gap-2.5">
                    <i className="bi bi-info-circle-fill text-amber-600 dark:text-amber-400 text-sm shrink-0" />
                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                        O módulo <strong>{highestModule.label}</strong> representa <strong>{highestModule.percent}%</strong> de todo o consumo registrado.
                    </span>
                </div>
            )}

            {/* Barras de Progresso por Módulo */}
            <div className="space-y-3">
                {stats.map(s => (
                    <div key={s.module} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <i className={`bi ${s.icon} text-slate-400`} />
                                {s.label}
                            </span>
                            <span className="font-black text-slate-900 dark:text-slate-100">
                                {s.calls.toLocaleString()} req ({s.percent}%)
                            </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${s.color} rounded-full transition-all duration-500`}
                                style={{ width: `${s.percent}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
