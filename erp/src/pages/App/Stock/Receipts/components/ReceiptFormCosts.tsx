interface ToggleValueFieldProps {
    readonly label: string;
    readonly mode: 'percent' | 'fixed';
    readonly value: number;
    readonly baseTotal?: number;
    readonly onModeChange: (mode: 'percent' | 'fixed') => void;
    readonly onValueChange: (value: number) => void;
    readonly color?: 'amber' | 'blue' | 'slate' | 'emerald';
    readonly isWarning?: boolean;
    readonly warningTooltip?: string;
}

export function ToggleValueField({
    label,
    mode,
    value,
    baseTotal = 0,
    onModeChange,
    onValueChange,
    color = 'amber',
    isWarning,
    warningTooltip,
}: ToggleValueFieldProps) {
    const isPercent = mode === 'percent';
    const activeBtnClass = color === 'amber'
        ? 'bg-amber-600 text-white shadow-sm'
        : color === 'blue'
        ? 'bg-blue-600 text-white shadow-sm'
        : color === 'emerald'
        ? 'bg-emerald-600 text-white shadow-sm'
        : 'bg-slate-700 text-white shadow-sm';

    const handleSwitchMode = (newMode: 'percent' | 'fixed') => {
        if (newMode === mode) return;

        // Se houver valor base positivo e valor preenchido, converte dinamicamente
        if (baseTotal > 0 && value > 0) {
            if (newMode === 'fixed' && mode === 'percent') {
                const convertedToReais = Number(((baseTotal * value) / 100).toFixed(2));
                onValueChange(Number.isNaN(convertedToReais) ? 0 : convertedToReais);
            } else if (newMode === 'percent' && mode === 'fixed') {
                const convertedToPercent = Number(((value / baseTotal) * 100).toFixed(2));
                onValueChange(Number.isNaN(convertedToPercent) ? 0 : convertedToPercent);
            }
        }
        onModeChange(newMode);
    };

    return (
        <div className={`p-3 bg-white dark:bg-slate-900 rounded-xl border flex flex-col justify-between gap-1.5 shadow-sm transition-colors ${isWarning ? 'border-amber-300 dark:border-amber-800/80 ring-1 ring-amber-400/20' : 'border-slate-200/80 dark:border-slate-800'}`}>
            <div className="flex items-center justify-between gap-2">
                <div className="group relative flex items-center gap-1.5 min-w-0">
                    <span className={`text-[9px] font-black uppercase tracking-wider truncate ${isWarning ? 'text-amber-700 dark:text-amber-400 font-black' : 'text-slate-400'}`} title={label}>
                        {label}
                    </span>
                    {isWarning && (
                        <>
                            <i className="bi bi-info-circle-fill text-[11px] text-amber-500 cursor-help" aria-hidden="true" />
                            {warningTooltip && (
                                <span className="absolute left-0 bottom-full mb-1.5 hidden w-64 rounded-xl bg-slate-900 p-2 text-[10px] font-medium normal-case tracking-normal text-white shadow-xl group-hover:block z-50 border border-slate-800">
                                    {warningTooltip}
                                </span>
                            )}
                        </>
                    )}
                </div>
                <div className="flex items-center rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shrink-0">
                    <button
                        type="button"
                        onClick={() => handleSwitchMode('percent')}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-black transition-all ${isPercent ? activeBtnClass : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        title="Calcular em porcentagem (%)"
                        aria-pressed={isPercent}
                    >
                        %
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSwitchMode('fixed')}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-black transition-all ${!isPercent ? activeBtnClass : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        title="Calcular em reais (R$)"
                        aria-pressed={!isPercent}
                    >
                        R$
                    </button>
                </div>
            </div>

            <div className="relative flex items-center">
                <input
                    type="number"
                    min="0"
                    step={isPercent ? '0.1' : '0.01'}
                    value={value || ''}
                    onChange={(e) => {
                        const parsed = Number(e.target.value);
                        onValueChange(Number.isNaN(parsed) ? 0 : Math.max(0, parsed));
                    }}
                    placeholder={isPercent ? '0 %' : '0,00'}
                    className="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none py-1.5 pl-1 pr-8 text-sm font-bold text-slate-800 dark:text-slate-100 rounded-none transition-colors"
                />
                <span className="absolute right-2 text-[11px] font-black text-slate-400 pointer-events-none">
                    {isPercent ? '%' : 'R$'}
                </span>
            </div>
        </div>
    );
}

interface OmitBaseFields {
    baseTotal: number;
}

interface ReceiptFormCostsProps {
    baseValueForRateio: number;
    nonFiscalDiscountMode: 'percent' | 'fixed';
    setNonFiscalDiscountMode: (mode: 'percent' | 'fixed') => void;
    nonFiscalDiscountValue: number;
    setNonFiscalDiscountValue: (value: number) => void;

    nonFiscalFreightMode: 'percent' | 'fixed';
    setNonFiscalFreightMode: (mode: 'percent' | 'fixed') => void;
    nonFiscalFreightValue: number;
    setNonFiscalFreightValue: (value: number) => void;

    nonFiscalOtherExpensesMode: 'percent' | 'fixed';
    setNonFiscalOtherExpensesMode: (mode: 'percent' | 'fixed') => void;
    nonFiscalOtherExpensesValue: number;
    setNonFiscalOtherExpensesValue: (value: number) => void;
}

export function ReceiptFormCosts({
    baseValueForRateio,
    nonFiscalDiscountMode,
    setNonFiscalDiscountMode,
    nonFiscalDiscountValue,
    setNonFiscalDiscountValue,
    nonFiscalFreightMode,
    setNonFiscalFreightMode,
    nonFiscalFreightValue,
    setNonFiscalFreightValue,
    nonFiscalOtherExpensesMode,
    setNonFiscalOtherExpensesMode,
    nonFiscalOtherExpensesValue,
    setNonFiscalOtherExpensesValue,
}: ReceiptFormCostsProps) {
    return (
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <i className="bi bi-calculator-fill text-emerald-600 text-sm" aria-hidden="true" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                        Despesas e Descontos do Recebimento
                    </h3>
                </div>
                <span className="group relative inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 cursor-help">
                    <i className="bi bi-info-circle text-slate-500 text-xs" aria-hidden="true" />
                    Rateio Operacional
                    <span className="absolute right-0 top-full mt-1.5 hidden w-72 rounded-xl bg-slate-900 p-2.5 text-[11px] font-medium normal-case tracking-normal text-white shadow-xl group-hover:block z-50 border border-slate-800">
                        Estes valores são operacionais e serão rateados proporcionalmente entre os itens, ajustando o custo unitário final e o estoque.
                    </span>
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ToggleValueField
                    label="Desconto"
                    mode={nonFiscalDiscountMode}
                    value={nonFiscalDiscountValue}
                    baseTotal={baseValueForRateio}
                    onModeChange={setNonFiscalDiscountMode}
                    onValueChange={setNonFiscalDiscountValue}
                    color="amber"
                />
                <ToggleValueField
                    label="Frete"
                    mode={nonFiscalFreightMode}
                    value={nonFiscalFreightValue}
                    baseTotal={baseValueForRateio}
                    onModeChange={setNonFiscalFreightMode}
                    onValueChange={setNonFiscalFreightValue}
                    color="blue"
                />
                <ToggleValueField
                    label="Outras Despesas"
                    mode={nonFiscalOtherExpensesMode}
                    value={nonFiscalOtherExpensesValue}
                    baseTotal={baseValueForRateio}
                    onModeChange={setNonFiscalOtherExpensesMode}
                    onValueChange={setNonFiscalOtherExpensesValue}
                    color="slate"
                />
            </div>
        </div>
    );
}
