import React from 'react';
import { ReceiptPeriod, RECEIPT_PERIOD_OPTIONS } from './receiptPeriodFilter.types';

interface ReceiptPeriodSelectorProps {
    period: ReceiptPeriod;
    onPeriodChange: (period: ReceiptPeriod) => void;
    customStartDate: string;
    onCustomStartDateChange: (date: string) => void;
    customEndDate: string;
    onCustomEndDateChange: (date: string) => void;
}

export const ReceiptPeriodSelector: React.FC<ReceiptPeriodSelectorProps> = ({
    period,
    onPeriodChange,
    customStartDate,
    onCustomStartDateChange,
    customEndDate,
    onCustomEndDateChange,
}) => {
    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* Seletor do Período */}
            <div className="relative inline-flex items-center">
                <div className="absolute left-3 pointer-events-none text-emerald-600 dark:text-emerald-400">
                    <i className="bi bi-calendar-event text-xs" />
                </div>
                <select
                    id="receipts-period-select"
                    value={period}
                    onChange={(e) => onPeriodChange(e.target.value as ReceiptPeriod)}
                    aria-label="Filtrar por período"
                    className="appearance-none pl-8 pr-7 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-black uppercase tracking-wider shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                    {RECEIPT_PERIOD_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="dark:bg-slate-900">
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="absolute right-2.5 pointer-events-none text-slate-400">
                    <i className="bi bi-chevron-down text-[10px]" />
                </div>
            </div>

            {/* Inputs de Período Personalizado */}
            {period === 'custom' && (
                <div className="flex items-center gap-1.5 animate-fadeIn">
                    <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => onCustomStartDateChange(e.target.value)}
                        aria-label="Data inicial"
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
                    />
                    <span className="text-slate-400 text-xs font-bold">até</span>
                    <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => onCustomEndDateChange(e.target.value)}
                        aria-label="Data final"
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
                    />
                </div>
            )}
        </div>
    );
};
