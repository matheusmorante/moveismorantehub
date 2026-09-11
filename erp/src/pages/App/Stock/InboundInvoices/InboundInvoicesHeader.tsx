import React from 'react';

export type DateFilterMode =
    | 'current_month'
    | 'previous_month'
    | 'current_year'
    | 'previous_year'
    | 'custom_month'
    | 'custom_range';

export interface DateFilterConfig {
    mode: DateFilterMode;
    customMonth: string;
    startMonth: string;
    endMonth: string;
}

interface InboundInvoicesHeaderProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    dateFilter: DateFilterConfig;
    onDateFilterChange: (config: DateFilterConfig) => void;
    onOpenAddInvoice: () => void;
}

export const InboundInvoicesHeader: React.FC<InboundInvoicesHeaderProps> = ({
    searchTerm,
    onSearchChange,
    dateFilter,
    onDateFilterChange,
    onOpenAddInvoice,
}) => {
    const handleModeChange = (mode: DateFilterMode) => {
        onDateFilterChange({
            ...dateFilter,
            mode,
        });
    };

    return (
        <header className="mb-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20">
                        <i className="bi bi-receipt-cutoff text-lg" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                            Notas Fiscais de Entrada
                        </h1>
                        <p className="text-xs font-medium text-slate-400">
                            Gestão e importação de notas fiscais de entrada dos fornecedores
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={onOpenAddInvoice}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-sm transition-all hover:bg-blue-700 cursor-pointer"
                    >
                        <i className="bi bi-file-earmark-plus-fill text-sm" />
                        Adicionar Nota Fiscal de Entrada
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 text-xs font-bold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                        <div className="flex items-center gap-1.5 px-2 py-1">
                            <i className="bi bi-calendar-event text-blue-600 dark:text-blue-400 text-sm" />
                            <span className="text-slate-500 font-semibold">Período:</span>
                        </div>

                        <select
                            value={dateFilter.mode}
                            onChange={(e) => handleModeChange(e.target.value as DateFilterMode)}
                            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer border border-transparent focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100"
                        >
                            <option value="current_month">Mês Atual</option>
                            <option value="previous_month">Mês Anterior</option>
                            <option value="current_year">Este Ano</option>
                            <option value="previous_year">Ano Passado</option>
                            <option value="custom_month">Outro Mês</option>
                            <option value="custom_range">Intervalo Personalizado</option>
                        </select>

                        {dateFilter.mode === 'custom_month' && (
                            <div className="flex items-center gap-1.5 pl-1">
                                <input
                                    type="month"
                                    required
                                    value={dateFilter.customMonth}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            onDateFilterChange({
                                                ...dateFilter,
                                                customMonth: e.target.value,
                                            });
                                        }
                                    }}
                                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                />
                            </div>
                        )}

                        {dateFilter.mode === 'custom_range' && (
                            <div className="flex items-center gap-2 pl-1">
                                <div className="flex items-center gap-1">
                                    <span className="text-[11px] text-slate-400">De:</span>
                                    <input
                                        type="month"
                                        required
                                        value={dateFilter.startMonth}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                onDateFilterChange({
                                                    ...dateFilter,
                                                    startMonth: e.target.value,
                                                });
                                            }
                                        }}
                                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[11px] text-slate-400">Até:</span>
                                    <input
                                        type="month"
                                        required
                                        value={dateFilter.endMonth}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                onDateFilterChange({
                                                    ...dateFilter,
                                                    endMonth: e.target.value,
                                                });
                                            }
                                        }}
                                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="relative">
                <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Pesquisar por fornecedor, número da NF-e ou chave de acesso de 44 dígitos..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-700 placeholder-slate-400 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                />
            </div>
        </header>
    );
};


