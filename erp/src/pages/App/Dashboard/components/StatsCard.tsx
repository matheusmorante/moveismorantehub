import React from 'react';

export interface DashboardStat {
    title: string;
    value: string | number;
    icon: string;
    trend?: 'up' | 'down';
    trendValue?: string;
    color: string;
}

export const StatsCard = ({ title, value, icon, trend, trendValue, color }: DashboardStat) => (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-premium hover:shadow-premium-lg transition-all duration-500 group active:scale-[0.98] animate-reveal">
        <div className="flex justify-between items-start mb-6">
            <div className={`w-14 h-14 rounded-2xl ${color} bg-opacity-10 transition-all group-hover:scale-110 group-hover:rotate-6 duration-500 flex items-center justify-center shadow-sm`}>
                <i className={`bi bi-${icon} text-2xl ${color.replace('bg-', 'text-')}`}></i>
            </div>
            {trend && trendValue && (
                <div className={`flex items-center gap-1.5 text-[10px] font-black px-3.5 py-2 rounded-2xl ${trend === 'up' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-rose-600 bg-rose-50 dark:bg-rose-900/20'} shadow-sm`}>
                    <i className={`bi bi-graph-${trend}`}></i>
                    {trendValue}
                </div>
            )}
        </div>
        <div>
            <p className="text-slate-400 dark:text-slate-500 font-black text-[9px] uppercase tracking-[0.25em] mb-2">{title}</p>
            <h3 className="text-3xl xl:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tighter leading-none">{value}</h3>
        </div>
    </div>
);
